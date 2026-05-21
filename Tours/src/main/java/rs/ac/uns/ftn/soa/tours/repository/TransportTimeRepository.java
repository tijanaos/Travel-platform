package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.TransportTime;

import java.util.List;

public interface TransportTimeRepository extends JpaRepository<TransportTime, Long> {
    List<TransportTime> findByTourId(Long tourId);
    void deleteByTourId(Long tourId);
}
