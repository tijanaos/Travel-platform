package client

import (
	"fmt"
	"log"
	"net/http"
)

type FollowerClient struct {
	baseURL string
}

func NewFollowerClient(baseURL string) *FollowerClient {
	return &FollowerClient{baseURL: baseURL}
}

// RegisterUser notifies the Follower service to create a graph node for the new user.
// Runs in a goroutine so user registration is never blocked if Follower is unavailable.
func (c *FollowerClient) RegisterUser(userID uint) {
	go func() {
		url := fmt.Sprintf("%s/users/%d", c.baseURL, userID)
		resp, err := http.Post(url, "application/json", http.NoBody)
		if err != nil {
			log.Printf("[FollowerClient] could not reach follower service for user %d: %v", userID, err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusNoContent {
			log.Printf("[FollowerClient] unexpected status %d when registering user %d", resp.StatusCode, userID)
		}
	}()
}
