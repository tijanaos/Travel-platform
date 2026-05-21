package rs.ac.uns.ftn.soa.tours.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tour_transport_times")
@Getter @Setter @NoArgsConstructor
public class TransportTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tourId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransportType type;

    @Column(nullable = false)
    private Integer durationMinutes;

    public enum TransportType {
        WALKING, BICYCLE, CAR
    }
}
