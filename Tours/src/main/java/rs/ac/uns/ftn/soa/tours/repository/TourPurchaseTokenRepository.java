package rs.ac.uns.ftn.soa.tours.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ac.uns.ftn.soa.tours.model.TourPurchaseToken;

import java.util.List;

public interface TourPurchaseTokenRepository extends JpaRepository<TourPurchaseToken, Long> {
    List<TourPurchaseToken> findByTouristId(Long touristId);
    boolean existsByTouristIdAndTourId(Long touristId, Long tourId);
}
