package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import rs.ac.uns.ftn.soa.tours.dto.CreateTourRequest;
import rs.ac.uns.ftn.soa.tours.model.Tour;
import rs.ac.uns.ftn.soa.tours.repository.TourRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;

    public Tour createTour(CreateTourRequest req, Long authorId) {
        Tour tour = new Tour();
        tour.setName(req.name());
        tour.setDescription(req.description());
        tour.setDifficulty(req.difficulty());
        tour.setTags(req.tags() != null ? req.tags() : List.of());
        tour.setAuthorId(authorId);
        // status=DRAFT and price=0.0 are set by defaults in the model
        return tourRepository.save(tour);
    }

    public List<Tour> getMyTours(Long authorId) {
        return tourRepository.findByAuthorId(authorId);
    }

    public Tour getTourById(Long id) {
        return tourRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tour not found: " + id));
    }
}
