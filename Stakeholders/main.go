package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/tijanaos/Stakeholders/config"
	"github.com/tijanaos/Stakeholders/internal/domain"
	"github.com/tijanaos/Stakeholders/internal/handler"
	"github.com/tijanaos/Stakeholders/internal/repository"
	"github.com/tijanaos/Stakeholders/internal/service"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&domain.User{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo, cfg.JWTSecret)
	userHandler := handler.NewUserHandler(userService)
	authHandler := handler.NewAuthHandler(userService)

	r := gin.Default()
	userHandler.RegisterRoutes(r)
	authHandler.RegisterRoutes(r)

	log.Printf("Stakeholders service running on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
