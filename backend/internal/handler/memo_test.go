package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/et-machine-bot/memo-app/backend/internal/store"
)

func TestMemoHandlers(t *testing.T) {
	created := time.Date(2026, 10, 2, 1, 2, 3, 0, time.UTC)
	updated := created.Add(time.Minute)
	existing := store.Memo{
		ID:        "11111111-1111-1111-1111-111111111111",
		Content:   "hello",
		CreatedAt: created,
		UpdatedAt: updated,
	}

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		store      *fakeMemos
		wantStatus int
		wantCode   string
		wantBody   string
	}{
		{
			name:       "list",
			method:     http.MethodGet,
			path:       "/api/memos",
			store:      &fakeMemos{items: []store.Memo{existing}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "list empty",
			method:     http.MethodGet,
			path:       "/api/memos",
			store:      &fakeMemos{},
			wantStatus: http.StatusOK,
			wantBody:   "[]",
		},
		{
			name:       "get",
			method:     http.MethodGet,
			path:       "/api/memos/" + existing.ID,
			store:      &fakeMemos{items: []store.Memo{existing}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "get missing",
			method:     http.MethodGet,
			path:       "/api/memos/22222222-2222-2222-2222-222222222222",
			store:      &fakeMemos{},
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:       "create",
			method:     http.MethodPost,
			path:       "/api/memos",
			body:       `{"content":"  saved  "}`,
			store:      &fakeMemos{},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "create blank",
			method:     http.MethodPost,
			path:       "/api/memos",
			body:       `{"content":"  "}`,
			store:      &fakeMemos{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "validation_error",
		},
		{
			name:       "create too long",
			method:     http.MethodPost,
			path:       "/api/memos",
			body:       `{"content":"` + strings.Repeat("a", maxContentLength+1) + `"}`,
			store:      &fakeMemos{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "validation_error",
		},
		{
			name:       "create invalid json",
			method:     http.MethodPost,
			path:       "/api/memos",
			body:       `{`,
			store:      &fakeMemos{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "validation_error",
		},
		{
			name:       "update",
			method:     http.MethodPut,
			path:       "/api/memos/" + existing.ID,
			body:       `{"content":"edited"}`,
			store:      &fakeMemos{items: []store.Memo{existing}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "update missing",
			method:     http.MethodPut,
			path:       "/api/memos/22222222-2222-2222-2222-222222222222",
			body:       `{"content":"edited"}`,
			store:      &fakeMemos{},
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:       "delete",
			method:     http.MethodDelete,
			path:       "/api/memos/" + existing.ID,
			store:      &fakeMemos{items: []store.Memo{existing}},
			wantStatus: http.StatusNoContent,
			wantBody:   "",
		},
		{
			name:       "delete missing",
			method:     http.MethodDelete,
			path:       "/api/memos/22222222-2222-2222-2222-222222222222",
			store:      &fakeMemos{},
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:       "store failure",
			method:     http.MethodGet,
			path:       "/api/memos",
			store:      &fakeMemos{err: errors.New("disk full secret")},
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mux := http.NewServeMux()
			MountMemos(mux, tt.store)

			var body *strings.Reader
			if tt.body == "" {
				body = strings.NewReader("")
			} else {
				body = strings.NewReader(tt.body)
			}
			req := httptest.NewRequest(tt.method, tt.path, body)
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status %d, body %s", rec.Code, rec.Body.String())
			}

			if tt.wantStatus == http.StatusNoContent {
				if rec.Body.Len() != 0 {
					t.Fatalf("expected empty body, got %q", rec.Body.String())
				}
				return
			}

			if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
				t.Fatalf("content-type %q", ct)
			}

			if tt.wantCode != "" {
				var payload errorResponse
				if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
					t.Fatal(err)
				}
				if payload.Error.Code != tt.wantCode {
					t.Fatalf("code %q", payload.Error.Code)
				}
				if payload.Error.Message == "" {
					t.Fatal("empty message")
				}
				if strings.Contains(payload.Error.Message, "secret") {
					t.Fatalf("leaked internal detail: %q", payload.Error.Message)
				}
				return
			}

			if tt.wantBody != "" {
				got := strings.TrimSpace(rec.Body.String())
				if got != tt.wantBody {
					t.Fatalf("body %s", got)
				}
				return
			}

			if tt.name == "create" {
				if tt.store.created != "saved" {
					t.Fatalf("stored %q", tt.store.created)
				}
				var memo store.Memo
				if err := json.Unmarshal(rec.Body.Bytes(), &memo); err != nil {
					t.Fatal(err)
				}
				if memo.Content != "saved" || memo.ID == "" {
					t.Fatalf("memo %+v", memo)
				}
				return
			}

			if tt.name == "update" {
				var memo store.Memo
				if err := json.Unmarshal(rec.Body.Bytes(), &memo); err != nil {
					t.Fatal(err)
				}
				if memo.Content != "edited" || memo.ID != existing.ID {
					t.Fatalf("memo %+v", memo)
				}
				return
			}

			if tt.name == "list" || tt.name == "get" {
				if !strings.Contains(rec.Body.String(), `"content":"hello"`) {
					t.Fatalf("body %s", rec.Body.String())
				}
				if !strings.Contains(rec.Body.String(), `"created_at":"2026-10-02T01:02:03Z"`) {
					t.Fatalf("body %s", rec.Body.String())
				}
			}
		})
	}
}

type fakeMemos struct {
	items   []store.Memo
	created string
	err     error
}

func (f *fakeMemos) List(context.Context) ([]store.Memo, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.items, nil
}

func (f *fakeMemos) Get(_ context.Context, id string) (store.Memo, error) {
	if f.err != nil {
		return store.Memo{}, f.err
	}
	for _, memo := range f.items {
		if memo.ID == id {
			return memo, nil
		}
	}
	return store.Memo{}, store.ErrNotFound
}

func (f *fakeMemos) Create(_ context.Context, content string) (store.Memo, error) {
	if f.err != nil {
		return store.Memo{}, f.err
	}
	f.created = content
	return store.Memo{
		ID:        "33333333-3333-3333-3333-333333333333",
		Content:   content,
		CreatedAt: time.Date(2026, 10, 2, 1, 2, 3, 0, time.UTC),
		UpdatedAt: time.Date(2026, 10, 2, 1, 2, 3, 0, time.UTC),
	}, nil
}

func (f *fakeMemos) Update(_ context.Context, id, content string) (store.Memo, error) {
	if f.err != nil {
		return store.Memo{}, f.err
	}
	for _, memo := range f.items {
		if memo.ID == id {
			memo.Content = content
			return memo, nil
		}
	}
	return store.Memo{}, store.ErrNotFound
}

func (f *fakeMemos) Delete(_ context.Context, id string) error {
	if f.err != nil {
		return f.err
	}
	for _, memo := range f.items {
		if memo.ID == id {
			return nil
		}
	}
	return store.ErrNotFound
}
