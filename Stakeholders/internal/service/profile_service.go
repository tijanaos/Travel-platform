package service

import (
	"github.com/tijanaos/Stakeholders/internal/domain"
	"github.com/tijanaos/Stakeholders/internal/repository"
)

type ProfileService struct {
	repo *repository.ProfileRepository
}

func NewProfileService(repo *repository.ProfileRepository) *ProfileService {
	return &ProfileService{repo: repo}
}

func (s *ProfileService) GetProfile(userID uint) (*domain.Profile, error) {
	return s.repo.FindByUserID(userID)
}

type UpdateProfileInput struct {
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	ProfilePicture string `json:"profile_picture"`
	Bio            string `json:"bio"`
	Motto          string `json:"motto"`
}

func (s *ProfileService) UpdateProfile(userID uint, input UpdateProfileInput) (*domain.Profile, error) {
	profile, err := s.repo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	profile.FirstName = input.FirstName
	profile.LastName = input.LastName
	profile.ProfilePicture = input.ProfilePicture
	profile.Bio = input.Bio
	profile.Motto = input.Motto

	if err := s.repo.Update(profile); err != nil {
		return nil, err
	}

	return profile, nil
}