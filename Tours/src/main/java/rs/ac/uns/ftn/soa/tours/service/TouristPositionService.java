package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import rs.ac.uns.ftn.soa.tours.model.TouristPosition;
import rs.ac.uns.ftn.soa.tours.repository.TouristPositionRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TouristPositionService {

    private final TouristPositionRepository repository;

    /**
     * Upisuje ili ažurira trenutnu poziciju turiste.
     */
    public TouristPosition updatePosition(Long touristId, Double latitude, Double longitude) {
        TouristPosition pos = repository.findByTouristId(touristId)
                .orElseGet(TouristPosition::new);
        pos.setTouristId(touristId);
        pos.setLatitude(latitude);
        pos.setLongitude(longitude);
        return repository.save(pos);
    }

    /**
     * Vraća trenutnu poziciju turiste, ako postoji.
     */
    public Optional<TouristPosition> getPosition(Long touristId) {
        return repository.findByTouristId(touristId);
    }
}
