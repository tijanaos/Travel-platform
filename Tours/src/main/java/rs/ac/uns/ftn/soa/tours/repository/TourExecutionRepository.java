package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.TourExecution;

import java.util.List;
import java.util.Optional;

public interface TourExecutionRepository extends JpaRepository<TourExecution, Long> {
    Optional<TourExecution> findByTouristIdAndStatus(Long touristId, TourExecution.ExecutionStatus status);
    List<TourExecution> findByTouristId(Long touristId);
}
