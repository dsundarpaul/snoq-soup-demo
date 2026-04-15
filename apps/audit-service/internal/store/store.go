package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Event struct {
	ID             string         `json:"id"`
	OccurredAt     time.Time      `json:"occurredAt"`
	HTTPMethod     string         `json:"httpMethod"`
	Path           string         `json:"path"`
	StatusCode     int            `json:"statusCode"`
	DurationMs     int            `json:"durationMs"`
	ActorType      string         `json:"actorType"`
	ActorID        string         `json:"actorId"`
	IP             string         `json:"ip"`
	UserAgent      string         `json:"userAgent"`
	Action         string         `json:"action"`
	ResourceType   string         `json:"resourceType"`
	ResourceID     string         `json:"resourceId"`
	CorrelationID  string         `json:"correlationId"`
	Metadata       map[string]any `json:"metadata"`
}

type ListParams struct {
	From           *time.Time
	To             *time.Time
	ActorID        string
	Action         string
	ResourceType   string
	ResourceID     string
	StatusCode     *int
	PathContains   string
	CorrelationID  string
	Cursor         string
	Limit          int
}

type ListResult struct {
	Items      []Event `json:"items"`
	NextCursor string  `json:"nextCursor,omitempty"`
	HasMore    bool    `json:"hasMore"`
}

type cursorPayload struct {
	T  time.Time `json:"t"`
	ID string    `json:"id"`
}

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) InsertBatch(ctx context.Context, events []Event) error {
	if len(events) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	const q = `INSERT INTO audit_events (
		occurred_at, http_method, path, status_code, duration_ms,
		actor_type, actor_id, ip, user_agent, action, resource_type, resource_id,
		correlation_id, metadata
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`
	for _, e := range events {
		meta := e.Metadata
		if meta == nil {
			meta = map[string]any{}
		}
		batch.Queue(q,
			e.OccurredAt, e.HTTPMethod, e.Path, e.StatusCode, e.DurationMs,
			e.ActorType, e.ActorID, e.IP, e.UserAgent, e.Action, e.ResourceType, e.ResourceID,
			e.CorrelationID, meta,
		)
	}
	br := s.pool.SendBatch(ctx, batch)
	defer br.Close()
	for i := 0; i < len(events); i++ {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("batch insert row %d: %w", i, err)
		}
	}
	return br.Close()
}

func (s *Store) List(ctx context.Context, p ListParams) (ListResult, error) {
	if p.Limit <= 0 || p.Limit > 200 {
		p.Limit = 50
	}
	var cur cursorPayload
	if p.Cursor != "" {
		raw, err := base64.RawURLEncoding.DecodeString(p.Cursor)
		if err != nil {
			return ListResult{}, fmt.Errorf("invalid cursor")
		}
		if err := json.Unmarshal(raw, &cur); err != nil {
			return ListResult{}, fmt.Errorf("invalid cursor")
		}
	}
	var args []any
	var where []string
	addEq := func(column, value string) {
		args = append(args, value)
		where = append(where, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if p.From != nil {
		args = append(args, *p.From)
		where = append(where, fmt.Sprintf("occurred_at >= $%d", len(args)))
	}
	if p.To != nil {
		args = append(args, *p.To)
		where = append(where, fmt.Sprintf("occurred_at <= $%d", len(args)))
	}
	if p.ActorID != "" {
		addEq("actor_id", p.ActorID)
	}
	if p.Action != "" {
		addEq("action", p.Action)
	}
	if p.ResourceType != "" {
		addEq("resource_type", p.ResourceType)
	}
	if p.ResourceID != "" {
		addEq("resource_id", p.ResourceID)
	}
	if p.StatusCode != nil {
		args = append(args, *p.StatusCode)
		where = append(where, fmt.Sprintf("status_code = $%d", len(args)))
	}
	if p.PathContains != "" {
		args = append(args, "%"+p.PathContains+"%")
		where = append(where, fmt.Sprintf("path ILIKE $%d", len(args)))
	}
	if p.CorrelationID != "" {
		addEq("correlation_id", p.CorrelationID)
	}
	if p.Cursor != "" {
		tArg := len(args) + 1
		args = append(args, cur.T)
		idArg := len(args) + 1
		args = append(args, cur.ID)
		where = append(where, fmt.Sprintf(
			"(occurred_at, id) < ($%d::timestamptz, $%d::uuid)", tArg, idArg))
	}
	if len(where) == 0 {
		where = []string{"true"}
	}
	args = append(args, p.Limit+1)
	limitArg := len(args)
	sqlWhere := strings.Join(where, " AND ")
	q := fmt.Sprintf(`
		SELECT id, occurred_at, http_method, path, status_code, duration_ms,
			actor_type, actor_id, ip, user_agent, action, resource_type, resource_id,
			correlation_id, metadata
		FROM audit_events
		WHERE %s
		ORDER BY occurred_at DESC, id DESC
		LIMIT $%d`, sqlWhere, limitArg)
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return ListResult{}, err
	}
	defer rows.Close()
	var items []Event
	for rows.Next() {
		var e Event
		var meta []byte
		if err := rows.Scan(
			&e.ID, &e.OccurredAt, &e.HTTPMethod, &e.Path, &e.StatusCode, &e.DurationMs,
			&e.ActorType, &e.ActorID, &e.IP, &e.UserAgent, &e.Action, &e.ResourceType, &e.ResourceID,
			&e.CorrelationID, &meta,
		); err != nil {
			return ListResult{}, err
		}
		if len(meta) > 0 {
			_ = json.Unmarshal(meta, &e.Metadata)
		}
		if e.Metadata == nil {
			e.Metadata = map[string]any{}
		}
		items = append(items, e)
	}
	hasMore := len(items) > p.Limit
	if hasMore {
		items = items[:p.Limit]
	}
	var next string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		payload, _ := json.Marshal(cursorPayload{T: last.OccurredAt, ID: last.ID})
		next = base64.RawURLEncoding.EncodeToString(payload)
	}
	return ListResult{Items: items, NextCursor: next, HasMore: hasMore}, rows.Err()
}

func (s *Store) Tail(ctx context.Context, since time.Time, limit int) ([]Event, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	q := `
		SELECT id, occurred_at, http_method, path, status_code, duration_ms,
			actor_type, actor_id, ip, user_agent, action, resource_type, resource_id,
			correlation_id, metadata
		FROM audit_events
		WHERE occurred_at > $1
		ORDER BY occurred_at ASC, id ASC
		LIMIT $2`
	rows, err := s.pool.Query(ctx, q, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Event
	for rows.Next() {
		var e Event
		var meta []byte
		if err := rows.Scan(
			&e.ID, &e.OccurredAt, &e.HTTPMethod, &e.Path, &e.StatusCode, &e.DurationMs,
			&e.ActorType, &e.ActorID, &e.IP, &e.UserAgent, &e.Action, &e.ResourceType, &e.ResourceID,
			&e.CorrelationID, &meta,
		); err != nil {
			return nil, err
		}
		if len(meta) > 0 {
			_ = json.Unmarshal(meta, &e.Metadata)
		}
		if e.Metadata == nil {
			e.Metadata = map[string]any{}
		}
		items = append(items, e)
	}
	return items, rows.Err()
}

func (s *Store) DeleteOlderThan(ctx context.Context, cutoff time.Time, batchSize int) (int64, error) {
	if batchSize <= 0 {
		batchSize = 1000
	}
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM audit_events
		WHERE id IN (
			SELECT id FROM audit_events
			WHERE occurred_at < $1
			ORDER BY occurred_at ASC
			LIMIT $2
		)`, cutoff, batchSize)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}
