package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	HTTPAddr          string
	DatabaseURL       string
	ServiceKey        string
	RetentionDays     int
	RetentionInterval time.Duration
	MaxBatchIngest    int
}

func getenv(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}

func getint(key string, def int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return def
	}
	return n
}

func Load() Config {
	ri := getint("AUDIT_RETENTION_INTERVAL_HOURS", 24)
	if ri < 1 {
		ri = 24
	}
	maxBatch := getint("AUDIT_MAX_INGEST_BATCH", 500)
	if maxBatch < 1 {
		maxBatch = 500
	}
	if maxBatch > 500 {
		maxBatch = 500
	}
	return Config{
		HTTPAddr:          getenv("AUDIT_HTTP_ADDR", ":3040"),
		DatabaseURL:       getenv("AUDIT_DATABASE_URL", getenv("DATABASE_URL", "")),
		ServiceKey:        getenv("AUDIT_SERVICE_KEY", ""),
		RetentionDays:     getint("AUDIT_RETENTION_DAYS", 90),
		RetentionInterval: time.Duration(ri) * time.Hour,
		MaxBatchIngest:    maxBatch,
	}
}
