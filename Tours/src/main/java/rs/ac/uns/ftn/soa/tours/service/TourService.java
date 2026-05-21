package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import rs.ac.uns.ftn.soa.tours.dto.AddTransportTimeRequest;
import rs.ac.uns.ftn.soa.tours.dto.CreateTourRequest;
import rs.ac.uns.ftn.soa.tours.model.Tour;
import rs.ac.uns.ftn.soa.tours.model.TransportTime;
import rs.ac.uns.ftn.soa.tours.repository.KeyPointRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourRepository;
import rs.ac.uns.ftn.soa.tours.repository.TransportTimeRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final TransportTimeRepository transportTimeRepository;

    public Tour createTour(CreateTourRequest req, Long authorId) {
        Tour tour = new Tour();
        tour.setName(req.name());
        tour.setDescription(req.description());
        tour.setDifficulty(req.difficulty());
        tour.setTags(req.tags() != null ? req.tags() : List.of());
        tour.setAuthorId(authorId);
        return tourRepository.save(tour);
    }

    public List<Tour> getPublishedTours() {
        return tourRepository.findByStatus(Tour.TourStatus.PUBLISHED);
    }

    public List<Tour> getMyTours(Long authorId) {
        return tourRepository.findByAuthorId(authorId);
    }

    public Tour getTourById(Long id) {
        return tourRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tour not found: " + id));
    }

    public Tour publishTour(Long tourId, Long requesterId) {
        Tour tour = getTourById(tourId);

        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can publish it");
        }
        if (tour.getStatus() != Tour.TourStatus.DRAFT) {
            throw new IllegalStateException("Only draft tours can be published");
        }

        boolean hasBasicData = tour.getName() != null && !tour.getName().isBlank()
                && tour.getDescription() != null && !tour.getDescription().isBlank()
                && tour.getDifficulty() != null
                && tour.getTags() != null && !tour.getTags().isEmpty();
        if (!hasBasicData) {
            throw new IllegalStateException("Tour must have name, description, difficulty and tags");
        }

        long kpCount = keyPointRepository.countByTourId(tourId);
        if (kpCount < 2) {
            throw new IllegalStateException("Tour must have at least two key points");
        }

        long ttCount = transportTimeRepository.findByTourId(tourId).size();
        if (ttCount == 0) {
            throw new IllegalStateException("Tour must have at least one transport time defined");
        }

        tour.setStatus(Tour.TourStatus.PUBLISHED);
        tour.setPublishedAt(LocalDateTime.now());
        return tourRepository.save(tour);
    }

    public Tour archiveTour(Long tourId, Long requesterId) {
        Tour tour = getTourById(tourId);

        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can archive it");
        }
        if (tour.getStatus() != Tour.TourStatus.PUBLISHED) {
            throw new IllegalStateException("Only published tours can be archived");
        }

        tour.setStatus(Tour.TourStatus.ARCHIVED);
        tour.setArchivedAt(LocalDateTime.now());
        return tourRepository.save(tour);
    }

    public Tour reactivateTour(Long tourId, Long requesterId) {
        Tour tour = getTourById(tourId);

        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can reactivate it");
        }
        if (tour.getStatus() != Tour.TourStatus.ARCHIVED) {
            throw new IllegalStateException("Only archived tours can be reactivated");
        }

        tour.setStatus(Tour.TourStatus.PUBLISHED);
        tour.setArchivedAt(null);
        return tourRepository.save(tour);
    }

    public TransportTime addTransportTime(Long tourId, AddTransportTimeRequest req, Long requesterId) {
        Tour tour = getTourById(tourId);
        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can manage transport times");
        }

        TransportTime tt = new TransportTime();
        tt.setTourId(tourId);
        tt.setType(req.type());
        tt.setDurationMinutes(req.durationMinutes());
        return transportTimeRepository.save(tt);
    }

    public List<TransportTime> getTransportTimes(Long tourId) {
        return transportTimeRepository.findByTourId(tourId);
    }

    public void deleteTransportTime(Long tourId, Long transportTimeId, Long requesterId) {
        Tour tour = getTourById(tourId);
        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can manage transport times");
        }
        transportTimeRepository.deleteById(transportTimeId);
    }
}
