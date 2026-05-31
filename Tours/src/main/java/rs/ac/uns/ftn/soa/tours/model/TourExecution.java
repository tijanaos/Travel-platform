package rs.ac.uns.ftn.soa.tours.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tour_executions")
@Getter @Setter @NoArgsConstructor
public class TourExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tourId;

    @Column(nullable = false)
    private Long touristId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStatus status = ExecutionStatus.ACTIVE;

    @Column(nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column
    private LocalDateTime lastActivity;

    @Column
    private LocalDateTime abandonedAt;

    @Column
    private LocalDateTime completedAt;

    @Column
    private Double startLatitude;

    @Column
    private Double startLongitude;

    @OneToMany(mappedBy = "execution", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompletedKeyPoint> completedKeyPoints = new ArrayList<>();

    public enum ExecutionStatus {
        ACTIVE, COMPLETED, ABANDONED
    }
}
