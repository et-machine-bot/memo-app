package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// DBPinger is the subset of *sql.DB used by the health check.
type DBPinger interface {
	PingContext(ctx context.Context) error
}

// Health serves GET /api/health. A successful Postgres ping returns
// 200 {"status":"ok"}. A failed ping returns 503 {"status":"unavailable"}.
func Health(db DBPinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if err := db.PingContext(ctx); err != nil {
			log.Printf("health: database ping failed: %v", err)
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("health: write response: %v", err)
	}
}
