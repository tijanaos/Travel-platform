package config

import (
	"fmt"
	"os"
)

type Config struct {
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	ServerPort  string
	GrpcPort    string
	JWTSecret   string
	FollowerURL string
}

func Load() *Config {
	return &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "postgres"),
		DBPassword:  getEnv("DB_PASSWORD", "postgres"),
		DBName:      getEnv("DB_NAME", "stakeholders"),
		ServerPort:  getEnv("SERVER_PORT", "8080"),
		GrpcPort:    getEnv("GRPC_PORT", "9090"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		FollowerURL: getEnv("FOLLOWER_URL", "http://follower-service:8083"),
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName,
	)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
