package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	"github.com/et-machine-bot/memo-app/backend/internal/store"
)

// MemoRepository is the store surface the memo handlers need.
type MemoRepository interface {
	List(ctx context.Context) ([]store.Memo, error)
	Get(ctx context.Context, id string) (store.Memo, error)
	Create(ctx context.Context, content string) (store.Memo, error)
	Update(ctx context.Context, id, content string) (store.Memo, error)
	Delete(ctx context.Context, id string) error
}

// MountMemos registers CRUD routes on the server mux.
func MountMemos(mux *http.ServeMux, memos MemoRepository) {
	mux.HandleFunc("GET /api/memos", listMemos(memos))
	mux.HandleFunc("POST /api/memos", createMemo(memos))
	mux.HandleFunc("GET /api/memos/{id}", getMemo(memos))
	mux.HandleFunc("PUT /api/memos/{id}", updateMemo(memos))
	mux.HandleFunc("DELETE /api/memos/{id}", deleteMemo(memos))
}

func listMemos(memos MemoRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		items, err := memos.List(r.Context())
		if err != nil {
			writeStoreError(w, "list memos", err)
			return
		}
		if items == nil {
			items = []store.Memo{}
		}
		writeJSON(w, http.StatusOK, items)
	}
}

func getMemo(memos MemoRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		memo, err := memos.Get(r.Context(), r.PathValue("id"))
		if err != nil {
			writeStoreError(w, "get memo", err)
			return
		}
		writeJSON(w, http.StatusOK, memo)
	}
}

func createMemo(memos MemoRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		content, ok := readContent(w, r)
		if !ok {
			return
		}
		memo, err := memos.Create(r.Context(), content)
		if err != nil {
			writeStoreError(w, "create memo", err)
			return
		}
		writeJSON(w, http.StatusCreated, memo)
	}
}

func updateMemo(memos MemoRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		content, ok := readContent(w, r)
		if !ok {
			return
		}
		memo, err := memos.Update(r.Context(), r.PathValue("id"), content)
		if err != nil {
			writeStoreError(w, "update memo", err)
			return
		}
		writeJSON(w, http.StatusOK, memo)
	}
}

func deleteMemo(memos MemoRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := memos.Delete(r.Context(), r.PathValue("id")); err != nil {
			writeStoreError(w, "delete memo", err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func readContent(w http.ResponseWriter, r *http.Request) (string, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	defer r.Body.Close()

	var body struct {
		Content string `json:"content"`
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&body); err != nil {
		var maxBytes *http.MaxBytesError
		if errors.As(err, &maxBytes) {
			writeError(w, http.StatusBadRequest, "validation_error", "request body is too large")
			return "", false
		}
		writeError(w, http.StatusBadRequest, "validation_error", "invalid request body")
		return "", false
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "validation_error", "invalid request body")
		return "", false
	}

	content, err := normalizeContent(body.Content)
	if err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return "", false
	}
	return content, true
}

func writeStoreError(w http.ResponseWriter, op string, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "memo not found")
		return
	}
	log.Printf("%s: %v", op, err)
	writeError(w, http.StatusInternalServerError, "internal_error", "internal error")
}
