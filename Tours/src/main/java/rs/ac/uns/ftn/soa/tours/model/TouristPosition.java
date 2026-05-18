package rs.ac.uns.ftn.soa.tours.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tourist_positions")
@Getter @Setter @NoArgsConstructor
public class TouristPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long touristId;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = java.time.LocalDateTime.now();
    }
}
