package domain

type Role string

const (
	RoleGuide         Role = "guide"
	RoleTourist       Role = "tourist"
	RoleAdministrator Role = "administrator"
)

type User struct {
	ID        uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Username  string `gorm:"uniqueIndex;not null" json:"username"`
	Password  string `gorm:"not null" json:"-"`
	Email     string `gorm:"uniqueIndex;not null" json:"email"`
	Role      Role   `gorm:"not null" json:"role"`
	IsBlocked bool   `gorm:"default:false" json:"is_blocked"`
}
