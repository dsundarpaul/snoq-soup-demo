package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/souqsnap/audit-service/internal/config"
	"github.com/souqsnap/audit-service/internal/store"
)

const headerServiceKey = "X-Audit-Service-Key"

type Server struct {
	cfg   config.Config
	store *store.Store
}

func New(cfg config.Config, st *store.Store) *Server {
	return &Server{cfg: cfg, store: st}
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.ServiceKey == "" {
			http.Error(w, "service misconfigured", http.StatusInternalServerError)
			return
		}
		if r.Header.Get(headerServiceKey) != s.cfg.ServiceKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /readyz", s.handleReadyz)
	mux.HandleFunc("POST /internal/v1/events", s.auth(s.handleIngest))
	mux.HandleFunc("GET /internal/v1/events", s.auth(s.handleList))
	mux.HandleFunc("GET /internal/v1/events/tail", s.auth(s.handleTail))
	return mux
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		http.Error(w, "not ready", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ready"}`))
}

type ingestBody struct {
	Events []json.RawMessage `json:"events"`
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	var wrap ingestBody
	if err := json.Unmarshal(body, &wrap); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if len(wrap.Events) == 0 {
		http.Error(w, "events required", http.StatusBadRequest)
		return
	}
	if len(wrap.Events) > s.cfg.MaxBatchIngest {
		http.Error(w, "batch too large", http.StatusRequestEntityTooLarge)
		return
	}
	events := make([]store.Event, 0, len(wrap.Events))
	for i, raw := range wrap.Events {
		var e store.Event
		if err := json.Unmarshal(raw, &e); err != nil {
			http.Error(w, "invalid event at index "+strconv.Itoa(i), http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(e.Action) == "" {
			http.Error(w, "action required at index "+strconv.Itoa(i), http.StatusBadRequest)
			return
		}
		if e.OccurredAt.IsZero() {
			e.OccurredAt = time.Now().UTC()
		} else {
			e.OccurredAt = e.OccurredAt.UTC()
		}
		if e.Metadata == nil {
			e.Metadata = map[string]any{}
		}
		events = append(events, e)
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if err := s.store.InsertBatch(ctx, events); err != nil {
		http.Error(w, "insert failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_, _ = w.Write([]byte(`{"ok":true,"count":` + strconv.Itoa(len(events)) + `}`))
}

func parseTimePtr(v string) (*time.Time, error) {
	v = strings.TrimSpace(v)
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339Nano, v)
	if err != nil {
		t, err = time.Parse(time.RFC3339, v)
	}
	if err != nil {
		return nil, err
	}
	utc := t.UTC()
	return &utc, nil
}

func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit == 0 {
		limit = 50
	}
	from, err := parseTimePtr(q.Get("from"))
	if err != nil {
		http.Error(w, "bad from", http.StatusBadRequest)
		return
	}
	to, err := parseTimePtr(q.Get("to"))
	if err != nil {
		http.Error(w, "bad to", http.StatusBadRequest)
		return
	}
	var status *int
	if sc := strings.TrimSpace(q.Get("statusCode")); sc != "" {
		n, err := strconv.Atoi(sc)
		if err != nil {
			http.Error(w, "bad statusCode", http.StatusBadRequest)
			return
		}
		status = &n
	}
	params := store.ListParams{
		From:          from,
		To:            to,
		ActorID:       q.Get("actorId"),
		Action:        q.Get("action"),
		ResourceType:  q.Get("resourceType"),
		ResourceID:    q.Get("resourceId"),
		StatusCode:    status,
		PathContains:  q.Get("path"),
		CorrelationID: q.Get("correlationId"),
		Cursor:        q.Get("cursor"),
		Limit:         limit,
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	out, err := s.store.List(ctx, params)
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(out)
}

func (s *Server) handleTail(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit == 0 {
		limit = 50
	}
	since := time.Now().UTC().Add(-24 * time.Hour)
	if v := strings.TrimSpace(q.Get("since")); v != "" {
		t, err := time.Parse(time.RFC3339Nano, v)
		if err != nil {
			t, err = time.Parse(time.RFC3339, v)
		}
		if err != nil {
			http.Error(w, "bad since", http.StatusBadRequest)
			return
		}
		since = t.UTC()
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	items, err := s.store.Tail(ctx, since, limit)
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(map[string]any{"items": items})
}
