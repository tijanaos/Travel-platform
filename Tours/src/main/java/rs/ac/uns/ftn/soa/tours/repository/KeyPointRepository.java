package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.KeyPoint;

import java.util.List;

public interface KeyPointRepository extends JpaRepository<KeyPoint, Long> {
    List<KeyPoint> findByTourId(Long tourId);
    long countByTourId(Long tourId);
}
