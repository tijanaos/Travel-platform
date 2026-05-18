package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.TouristPosition;

import java.util.Optional;

public interface TouristPositionRepository extends JpaRepository<TouristPosition, Long> {
    Optional<TouristPosition> findByTouristId(Long touristId);
}
