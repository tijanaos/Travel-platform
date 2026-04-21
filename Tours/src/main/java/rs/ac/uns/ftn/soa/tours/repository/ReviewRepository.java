package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.Review;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByTourId(Long tourId);
    boolean existsByTourIdAndTouristId(Long tourId, Long touristId);
}
