package domain

type Profile struct {
	ID             uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint   `gorm:"uniqueIndex;not null" json:"user_id"`
	FirstName      string `gorm:"default:''" json:"first_name"`
	LastName       string `gorm:"default:''" json:"last_name"`
	ProfilePicture string `gorm:"default:''" json:"profile_picture"`
	Bio            string `gorm:"default:''" json:"bio"`
	Motto          string `gorm:"default:''" json:"motto"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}