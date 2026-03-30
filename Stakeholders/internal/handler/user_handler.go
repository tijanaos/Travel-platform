package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tijanaos/Stakeholders/internal/domain"
	"github.com/tijanaos/Stakeholders/internal/middleware"
	"github.com/tijanaos/Stakeholders/internal/service"
)

type UserHandler struct {
	service   *service.UserService
	jwtSecret string
}

func NewUserHandler(service *service.UserService, jwtSecret string) *UserHandler {
	return &UserHandler{service: service, jwtSecret: jwtSecret}
}

func (h *UserHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/users")
	{
		api.POST("/register", h.Register)
		api.GET("", middleware.AuthMiddleware(h.jwtSecret), middleware.AdminMiddleware(), h.GetAllUsers)
	}
}

type registerRequest struct {
	Username string      `json:"username" binding:"required"`
	Password string      `json:"password" binding:"required,min=6"`
	Email    string      `json:"email" binding:"required,email"`
	Role     domain.Role `json:"role" binding:"required"`
}

func (h *UserHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.service.Register(req.Username, req.Password, req.Email, req.Role)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	users, err := h.service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, users)
}
