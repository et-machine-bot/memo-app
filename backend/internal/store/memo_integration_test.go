package store

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"
)

func TestMemoStoreCRUD(t *testing.T) {
	if os.Getenv("MEMO_STORE_INTEGRATION") != "1" {
		t.Skip("set MEMO_STORE_INTEGRATION=1 to run against Postgres")
	}

	dsn := os.Getenv("MEMO_TEST_DSN")
	if dsn == "" {
		t.Fatal("MEMO_TEST_DSN is required")
	}

	db, err := Open(dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })

	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		t.Fatal(err)
	}

	memos := NewMemoStore(db)
	var createdIDs []string
	t.Cleanup(func() {
		for _, id := range createdIDs {
			_ = memos.Delete(context.Background(), id)
		}
	})

	first, err := memos.Create(ctx, "first")
	if err != nil {
		t.Fatal(err)
	}
	createdIDs = append(createdIDs, first.ID)
	if !isUUID(first.ID) || first.Content != "first" || first.CreatedAt.IsZero() || first.UpdatedAt.IsZero() {
		t.Fatalf("created %+v", first)
	}

	time.Sleep(10 * time.Millisecond)
	second, err := memos.Create(ctx, "second")
	if err != nil {
		t.Fatal(err)
	}
	createdIDs = append(createdIDs, second.ID)

	got, err := memos.Get(ctx, first.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Content != "first" {
		t.Fatalf("get %+v", got)
	}
	if _, err := memos.Get(ctx, "not-a-uuid"); !errorsIsNotFound(err) {
		t.Fatalf("invalid id err %v", err)
	}
	if _, err := memos.Get(ctx, "22222222-2222-2222-2222-222222222222"); !errorsIsNotFound(err) {
		t.Fatalf("missing err %v", err)
	}

	time.Sleep(10 * time.Millisecond)
	updated, err := memos.Update(ctx, first.ID, "first-edited")
	if err != nil {
		t.Fatal(err)
	}
	if !updated.CreatedAt.Equal(first.CreatedAt) {
		t.Fatalf("created_at changed: %s -> %s", first.CreatedAt, updated.CreatedAt)
	}
	if !updated.UpdatedAt.After(first.UpdatedAt) {
		t.Fatalf("updated_at not refreshed: %s -> %s", first.UpdatedAt, updated.UpdatedAt)
	}
	if updated.Content != "first-edited" {
		t.Fatalf("content %q", updated.Content)
	}

	list, err := memos.List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	firstPos, secondPos := -1, -1
	for i, memo := range list {
		switch memo.ID {
		case first.ID:
			firstPos = i
		case second.ID:
			secondPos = i
		}
	}
	if firstPos < 0 || secondPos < 0 || firstPos > secondPos {
		t.Fatalf("list order first=%d second=%d ids=%v", firstPos, secondPos, idsOf(list))
	}

	if err := memos.Delete(ctx, second.ID); err != nil {
		t.Fatal(err)
	}
	if err := memos.Delete(ctx, second.ID); !errorsIsNotFound(err) {
		t.Fatalf("second delete err %v", err)
	}
	if _, err := memos.Get(ctx, second.ID); !errorsIsNotFound(err) {
		t.Fatalf("get after delete %v", err)
	}
}

func errorsIsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

func idsOf(memos []Memo) []string {
	ids := make([]string, len(memos))
	for i, memo := range memos {
		ids[i] = memo.ID
	}
	return ids
}
