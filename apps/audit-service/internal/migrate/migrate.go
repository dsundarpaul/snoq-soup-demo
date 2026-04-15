package migrate

import (
	"context"
	"embed"
	"fmt"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed *.sql
var fs embed.FS

func Run(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := fs.ReadDir(".")
	if err != nil {
		return fmt.Errorf("migrate readdir: %w", err)
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		sqlBytes, err := fs.ReadFile(name)
		if err != nil {
			return fmt.Errorf("migrate read %s: %w", name, err)
		}
		if _, err := pool.Exec(ctx, string(sqlBytes)); err != nil {
			return fmt.Errorf("migrate exec %s: %w", name, err)
		}
	}
	return nil
}
