package rs.ac.uns.ftn.soa.tours.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "completed_key_points")
@Getter @Setter @NoArgsConstructor
public class CompletedKeyPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_id", nullable = false)
    @JsonIgnore
    private TourExecution execution;

    @Column(nullable = false)
    private Long keyPointId;

    @Column(nullable = false)
    private LocalDateTime completedAt = LocalDateTime.now();
}
