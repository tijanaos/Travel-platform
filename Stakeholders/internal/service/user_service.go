package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/tijanaos/Stakeholders/internal/client"
	"github.com/tijanaos/Stakeholders/internal/domain"
	"github.com/tijanaos/Stakeholders/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	repo           *repository.UserRepository
	jwtSecret      string
	followerClient *client.FollowerClient
}

func NewUserService(repo *repository.UserRepository, jwtSecret string, followerClient *client.FollowerClient) *UserService {
	return &UserService{repo: repo, jwtSecret: jwtSecret, followerClient: followerClient}
}

func (s *UserService) Register(username, password, email string, role domain.Role) (*domain.User, error) {
	if role != domain.RoleGuide && role != domain.RoleTourist {
		return nil, errors.New("role must be 'guide' or 'tourist'")
	}

	_, err := s.repo.FindByUsername(username)
	if err == nil {
		return nil, errors.New("username already taken")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	_, err = s.repo.FindByEmail(email)
	if err == nil {
		return nil, errors.New("email already in use")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		Username: username,
		Password: string(hashed),
		Email:    email,
		Role:     role,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	s.followerClient.RegisterUser(user.ID)

	return user, nil
}

func (s *UserService) GetAllUsers() ([]domain.User, error) {
	return s.repo.FindAll()
}

func (s *UserService) GetUserByID(id uint) (*domain.User, error) {
	return s.repo.FindByID(id)
}

func (s *UserService) Login(username, password string) (string, error) {
	user, err := s.repo.FindByUsername(username)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	if user.IsBlocked {
		return "", errors.New("your account has been blocked")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", errors.New("invalid credentials")
	}

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", err
	}

	return signed, nil
}

func (s *UserService) SetBlocked(id uint, blocked bool) (*domain.User, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if user.Role == domain.RoleAdministrator {
		return nil, errors.New("cannot block an administrator")
	}

	if err := s.repo.SetBlocked(id, blocked); err != nil {
		return nil, err
	}

	user.IsBlocked = blocked
	return user, nil
}
