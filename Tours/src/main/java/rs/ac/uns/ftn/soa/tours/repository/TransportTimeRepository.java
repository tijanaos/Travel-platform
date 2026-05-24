package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.TransportTime;

import java.util.List;
import java.util.Optional;

public interface TransportTimeRepository extends JpaRepository<TransportTime, Long> {
    List<TransportTime> findByTourId(Long tourId);
    Optional<TransportTime> findByTourIdAndType(Long tourId, TransportTime.TransportType type);
    void deleteByTourId(Long tourId);
}
