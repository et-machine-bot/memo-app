package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"time"
)

// ErrNotFound is returned when a memo id does not exist.
var ErrNotFound = errors.New("memo not found")

// uuidPattern matches the canonical form returned by gen_random_uuid().
var uuidPattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// Memo is the JSON document for one row in memos.
type Memo struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// MemoStore reads and writes memos. updated_at is set in SQL on every update
// because the column default applies to INSERT only.
type MemoStore struct {
	db *sql.DB
}

func NewMemoStore(db *sql.DB) *MemoStore {
	return &MemoStore{db: db}
}

func (s *MemoStore) List(ctx context.Context) ([]Memo, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, content, created_at, updated_at
		FROM memos
		ORDER BY updated_at DESC, id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list memos: %w", err)
	}
	defer rows.Close()

	memos := make([]Memo, 0)
	for rows.Next() {
		memo, err := scanMemo(rows)
		if err != nil {
			return nil, fmt.Errorf("list memos: %w", err)
		}
		memos = append(memos, memo)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list memos: %w", err)
	}
	return memos, nil
}

func (s *MemoStore) Get(ctx context.Context, id string) (Memo, error) {
	if !isUUID(id) {
		return Memo{}, ErrNotFound
	}
	row := s.db.QueryRowContext(ctx, `
		SELECT id::text, content, created_at, updated_at
		FROM memos
		WHERE id = $1::uuid
	`, id)
	return finishOne(row, "get memo")
}

func (s *MemoStore) Create(ctx context.Context, content string) (Memo, error) {
	row := s.db.QueryRowContext(ctx, `
		INSERT INTO memos (content)
		VALUES ($1)
		RETURNING id::text, content, created_at, updated_at
	`, content)
	return finishOne(row, "create memo")
}

func (s *MemoStore) Update(ctx context.Context, id, content string) (Memo, error) {
	if !isUUID(id) {
		return Memo{}, ErrNotFound
	}
	row := s.db.QueryRowContext(ctx, `
		UPDATE memos
		SET content = $2, updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, content, created_at, updated_at
	`, id, content)
	return finishOne(row, "update memo")
}

func (s *MemoStore) Delete(ctx context.Context, id string) error {
	if !isUUID(id) {
		return ErrNotFound
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM memos WHERE id = $1::uuid`, id)
	if err != nil {
		return fmt.Errorf("delete memo: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete memo: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanMemo(row scanner) (Memo, error) {
	var memo Memo
	err := row.Scan(&memo.ID, &memo.Content, &memo.CreatedAt, &memo.UpdatedAt)
	return memo, err
}

func finishOne(row scanner, op string) (Memo, error) {
	memo, err := scanMemo(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Memo{}, ErrNotFound
	}
	if err != nil {
		return Memo{}, fmt.Errorf("%s: %w", op, err)
	}
	return memo, nil
}

func isUUID(id string) bool {
	return uuidPattern.MatchString(id)
}
