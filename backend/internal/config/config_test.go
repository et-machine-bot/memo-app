package config

import (
	"strings"
	"testing"
)

func TestLoadRequiresDatabaseEnv(t *testing.T) {
	t.Setenv("DB_HOST", "")
	t.Setenv("DB_USER", "")
	t.Setenv("DB_PASSWORD", "")
	t.Setenv("DB_NAME", "")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error")
	}
	for _, key := range []string{"DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"} {
		if !strings.Contains(err.Error(), key) {
			t.Fatalf("error %q should mention %s", err, key)
		}
	}
}

func TestLoadAndDSN(t *testing.T) {
	t.Setenv("DB_HOST", "db")
	t.Setenv("DB_PORT", "5432")
	t.Setenv("DB_USER", "memo")
	t.Setenv("DB_PASSWORD", "memo_dev_password")
	t.Setenv("DB_NAME", "memo")
	t.Setenv("DB_SSLMODE", "disable")
	t.Setenv("HTTP_ADDR", ":8080")
	t.Setenv("CORS_ORIGIN", "http://localhost:5173")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.HTTPAddr != ":8080" || cfg.CORSOrigin != "http://localhost:5173" {
		t.Fatalf("unexpected http config: %+v", cfg)
	}

	dsn := cfg.DSN()
	for _, part := range []string{
		"host=db",
		"port=5432",
		"user=memo",
		"password=memo_dev_password",
		"dbname=memo",
		"sslmode=disable",
	} {
		if !strings.Contains(dsn, part) {
			t.Fatalf("dsn %q missing %s", dsn, part)
		}
	}
}

func TestDSNQuotesPasswordWithSpaces(t *testing.T) {
	cfg := Config{
		DBHost:     "db",
		DBPort:     "5432",
		DBUser:     "memo",
		DBPassword: "secret value",
		DBName:     "memo",
		DBSSLMode:  "disable",
	}
	dsn := cfg.DSN()
	if !strings.Contains(dsn, "password='secret value'") {
		t.Fatalf("dsn %q should quote the password", dsn)
	}
}
