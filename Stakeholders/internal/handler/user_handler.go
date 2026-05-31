package handler

import (
	"net/http"
	"strconv"

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
		api.GET("/:id", middleware.AuthMiddleware(h.jwtSecret), h.GetUser)
		api.PATCH("/:id/block", middleware.AuthMiddleware(h.jwtSecret), middleware.AdminMiddleware(), h.BlockUser)
		api.PATCH("/:id/unblock", middleware.AuthMiddleware(h.jwtSecret), middleware.AdminMiddleware(), h.UnblockUser)
		api.GET("/:id/check-status", h.CheckUserStatus)
		api.POST("/:id/reserve", h.ReserveSlot)
		api.DELETE("/:id/release/:tokenId", h.ReleaseSlot)
		api.DELETE("/:id/release-all", h.ReleaseAllSlots)
	}
	// Internal endpoint for inter-service use only — returns user IDs for graph sync
	r.GET("/internal/users", h.GetAllUserIDs)
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

func (h *UserHandler) GetUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	user, err := h.service.GetUserByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
	})
}

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	users, err := h.service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) BlockUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	user, err := h.service.SetBlocked(uint(id), true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UnblockUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	user, err := h.service.SetBlocked(uint(id), false)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) GetAllUserIDs(c *gin.Context) {
	users, err := h.service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}
	ids := make([]int, len(users))
	for i, u := range users {
		ids[i] = int(u.ID)
	}
	c.JSON(http.StatusOK, ids)
}

func (h *UserHandler) CheckUserStatus(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    user, err := h.service.GetUserByID(uint(id))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
        return
    }

    if user.IsBlocked {
        c.JSON(http.StatusForbidden, gin.H{"blocked": true})
        return
    }

    c.JSON(http.StatusOK, gin.H{"blocked": false})
}

func (h *UserHandler) ReserveSlot(c *gin.Context) {
    // 1. Parsiraj ID iz URL-a
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    // 2. Uzmi listu tokena iz JSON tela
    var tokens []map[string]interface{}
    if err := c.ShouldBindJSON(&tokens); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid format"})
        return
    }
    
    // 3. Pozovi servis sa ispravnim promenljivima
    if err := h.service.Reserve(uint(id), tokens); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"status": "reserved"})
}

func (h *UserHandler) ReleaseSlot(c *gin.Context) {
    // 1. Parsiraj TouristID iz URL-a
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tourist id"})
        return
    }

    // 2. Uzmi TokenID iz URL-a
    tokenID := c.Param("tokenId")
    if tokenID == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "token id is required"})
        return
    }
    
    // 3. Pozovi servis
    if err := h.service.Release(uint(id), tokenID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to release slot"})
        return
    }

    c.Status(http.StatusNoContent)
}

func (h *UserHandler) ReleaseAllSlots(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tourist id"})
        return
    }

    if err := h.service.ReleaseAll(uint(id)); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to release all slots"})
        return
    }

    c.Status(http.StatusNoContent)
}
