package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tijanaos/Stakeholders/internal/middleware"
	"github.com/tijanaos/Stakeholders/internal/service"
)

type ProfileHandler struct {
	service   *service.ProfileService
	jwtSecret string
}

func NewProfileHandler(service *service.ProfileService, jwtSecret string) *ProfileHandler {
	return &ProfileHandler{service: service, jwtSecret: jwtSecret}
}

func (h *ProfileHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/profile")
	api.Use(middleware.AuthMiddleware(h.jwtSecret))
	{
		api.GET("/me", h.GetMyProfile)
		api.PUT("/me", h.UpdateMyProfile)
	}
}

func (h *ProfileHandler) GetMyProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	profile, err := h.service.GetProfile(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) UpdateMyProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input service.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile, err := h.service.UpdateProfile(userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}