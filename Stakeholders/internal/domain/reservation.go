package domain

type Reservation struct {
    ID        uint   `gorm:"primaryKey"`
    TouristID uint   `json:"touristId"`
    TokenID   string `json:"tokenId"`
}