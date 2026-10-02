package config

import (
	"fmt"
	"os"
	"strings"
)

// Config is the process configuration. Database fields come from the environment
// so Compose and a host-side `go run` can point at different hosts.
type Config struct {
	HTTPAddr   string
	CORSOrigin string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:   getenv("HTTP_ADDR", ":8080"),
		CORSOrigin: getenv("CORS_ORIGIN", "http://localhost:5173"),
		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     getenv("DB_PORT", "5432"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),
		DBSSLMode:  getenv("DB_SSLMODE", "disable"),
	}

	var missing []string
	for _, key := range []struct {
		name  string
		value string
	}{
		{"DB_HOST", cfg.DBHost},
		{"DB_USER", cfg.DBUser},
		{"DB_PASSWORD", cfg.DBPassword},
		{"DB_NAME", cfg.DBName},
	} {
		if key.value == "" {
			missing = append(missing, key.name)
		}
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("missing required environment: %s", strings.Join(missing, ", "))
	}
	return cfg, nil
}

// DSN is a libpq keyword/value connection string.
func (c Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		quoteValue(c.DBHost),
		quoteValue(c.DBPort),
		quoteValue(c.DBUser),
		quoteValue(c.DBPassword),
		quoteValue(c.DBName),
		quoteValue(c.DBSSLMode),
	)
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func quoteValue(value string) string {
	if value == "" || strings.ContainsAny(value, " \t'\\") {
		return "'" + strings.ReplaceAll(value, "'", `\'`) + "'"
	}
	return value
}
