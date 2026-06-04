package saga

import (
	"encoding/json"
	"log"
	"os"

	"github.com/nats-io/nats.go"
	"github.com/tijanaos/Stakeholders/internal/repository"
	"github.com/tijanaos/Stakeholders/internal/service"
)

func StartNatsSubscriber(userService *service.UserService, userRepo *repository.UserRepository) {
	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = nats.DefaultURL
	}

	nc, err := nats.Connect(natsURL)
	if err != nil {
		log.Fatalf("NATS konekcija nije uspela: %v", err)
	}

	nc.Subscribe("checkout.validate", func(msg *nats.Msg) {
		var payload struct {
			TouristID uint     `json:"touristId"`
			Tokens    []string `json:"tokens"`
		}

		if err := json.Unmarshal(msg.Data, &payload); err != nil {
			respond(msg, map[string]string{
				"status": "error",
				"error":  "invalid payload",
			})
			return
		}

		user, err := userService.GetUserByID(payload.TouristID)
		if err != nil {
			respond(msg, map[string]string{
				"status": "error",
				"error":  "user not found",
			})
			return
		}

		if user.IsBlocked {
			respond(msg, map[string]string{
				"status": "error",
				"error":  "tourist is blocked",
			})
			return
		}

		tokenMaps := make([]map[string]interface{}, len(payload.Tokens))
		for i, t := range payload.Tokens {
			tokenMaps[i] = map[string]interface{}{"token": t}
		}

		if err := userService.Reserve(payload.TouristID, tokenMaps); err != nil {
			respond(msg, map[string]string{
				"status": "error",
				"error":  "failed to reserve: " + err.Error(),
			})
			return
		}

		respond(msg, map[string]string{"status": "success"})
	})

	nc.Subscribe("checkout.rollback", func(msg *nats.Msg) {
		var payload struct {
			TouristID uint `json:"touristId"`
		}

		if err := json.Unmarshal(msg.Data, &payload); err != nil {
			log.Printf("Rollback: invalid payload: %v", err)
			return
		}

		if err := userService.ReleaseAll(payload.TouristID); err != nil {
			log.Printf("Rollback: ReleaseAll failed for tourist %d: %v", payload.TouristID, err)
			return
		}

		log.Printf("Rollback: rezervacije obrisane za tourist %d", payload.TouristID)
	})

	log.Println("NATS saga subscriber started (checkout.validate, checkout.rollback)")
}

func respond(msg *nats.Msg, payload map[string]string) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("respond: marshal error: %v", err)
		return
	}
	if err := msg.Respond(data); err != nil {
		log.Printf("respond: failed to send reply: %v", err)
	}
}