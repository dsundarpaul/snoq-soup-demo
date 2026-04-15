package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/souqsnap/audit-service/internal/api"
	"github.com/souqsnap/audit-service/internal/config"
	"github.com/souqsnap/audit-service/internal/migrate"
	"github.com/souqsnap/audit-service/internal/store"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("AUDIT_DATABASE_URL or DATABASE_URL is required")
	}
	if cfg.ServiceKey == "" {
		log.Fatal("AUDIT_SERVICE_KEY is required")
	}
	ctx := context.Background()
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db config: %v", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()
	if err := migrate.Run(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	st := store.New(pool)
	go retentionLoop(cfg, st)

	srv := api.New(cfg, st)
	httpSrv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	go func() {
		log.Printf("audit-service listening on %s", cfg.HTTPAddr)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	shCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpSrv.Shutdown(shCtx)
}

func retentionLoop(cfg config.Config, st *store.Store) {
	t := time.NewTicker(cfg.RetentionInterval)
	defer t.Stop()
	for range t.C {
		cutoff := time.Now().UTC().AddDate(0, 0, -cfg.RetentionDays)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		var total int64
		for {
			n, err := st.DeleteOlderThan(ctx, cutoff, 2000)
			if err != nil {
				log.Printf("retention delete: %v", err)
				break
			}
			total += n
			if n == 0 {
				break
			}
		}
		if total > 0 {
			log.Printf("retention: deleted %d rows older than %s", total, cutoff.Format(time.RFC3339))
		}
		cancel()
	}
}
