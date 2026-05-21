package rs.ac.uns.ftn.soa.tours.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tours")
@Getter @Setter @NoArgsConstructor
public class Tour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;

    @ElementCollection
    @CollectionTable(name = "tour_tags", joinColumns = @JoinColumn(name = "tour_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TourStatus status = TourStatus.DRAFT;

    @Column(nullable = false)
    private Double price = 0.0;

    @Column(nullable = false)
    private Long authorId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private Double lengthKm;

    @Column
    private LocalDateTime publishedAt;

    @Column
    private LocalDateTime archivedAt;

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum TourStatus {
        DRAFT, PUBLISHED, ARCHIVED
    }
}
