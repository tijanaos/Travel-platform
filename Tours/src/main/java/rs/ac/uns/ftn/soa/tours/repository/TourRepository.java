package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.Tour;

import java.util.List;

public interface TourRepository extends JpaRepository<Tour, Long> {
    List<Tour> findByAuthorId(Long authorId);
}
