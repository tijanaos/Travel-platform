package repository

import (
	"github.com/tijanaos/Stakeholders/internal/domain"
	"gorm.io/gorm"
)

type ProfileRepository struct {
	db *gorm.DB
}

func NewProfileRepository(db *gorm.DB) *ProfileRepository {
	return &ProfileRepository{db: db}
}

// FindByUserID returns the profile for the given user.
// If no profile exists yet, it creates an empty one automatically.
func (r *ProfileRepository) FindByUserID(userID uint) (*domain.Profile, error) {
	var profile domain.Profile
	err := r.db.Where("user_id = ?", userID).First(&profile).Error
	if err == gorm.ErrRecordNotFound {
		profile = domain.Profile{UserID: userID}
		if err := r.db.Create(&profile).Error; err != nil {
			return nil, err
		}
		return &profile, nil
	}
	return &profile, err
}

func (r *ProfileRepository) Update(profile *domain.Profile) error {
	return r.db.Save(profile).Error
}