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
import rs.ac.uns.ftn.soa.tours.client.BlogClient;
import rs.ac.uns.ftn.soa.tours.saga.TourSagaOrchestrator;
import rs.ac.uns.ftn.soa.tours.config.NatsConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.nats.client.Connection;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final TransportTimeRepository transportTimeRepository;
    private final TourSagaOrchestrator sagaOrchestrator;
    private final Connection nats;
    private final ObjectMapper objectMapper;

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

    public List<Tour> getVisibleTours(Long userId, String role) {
        List<Tour> published = getPublishedTours();
        if (userId == null || role == null || (!"author".equalsIgnoreCase(role) && !"guide".equalsIgnoreCase(role))) {
            return published;
        }

        Map<Long, Tour> toursById = new LinkedHashMap<>();
        published.forEach(tour -> toursById.put(tour.getId(), tour));
        getMyTours(userId).forEach(tour -> toursById.put(tour.getId(), tour));
        return List.copyOf(toursById.values());
    }

    public List<Tour> getMyTours(Long authorId) {
        return tourRepository.findByAuthorId(authorId);
    }

    public Tour getTourById(Long id) {
        return tourRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tour not found: " + id));
    }

    public Tour getTourForViewer(Long id, Long viewerId) {
        Tour tour = getTourById(id);
        boolean isAuthor = viewerId != null && viewerId.equals(tour.getAuthorId());
        if (isAuthor || tour.getStatus() == Tour.TourStatus.PUBLISHED) {
            return tour;
        }
        throw new SecurityException("Only published tours are visible to tourists");
    }

    public Tour updatePrice(Long tourId, Double price, Long requesterId) {
        Tour tour = getTourById(tourId);
        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can update the price");
        }
        if (price == null || price < 0) {
            throw new IllegalArgumentException("Price must be zero or greater");
        }

        tour.setPrice(price);
        return tourRepository.save(tour);
    }

    public Tour publishTour(Long tourId, Long requesterId) {
        Tour tour = getTourById(tourId);

        if (!tour.getAuthorId().equals(requesterId))
            throw new SecurityException("Only the tour author can publish it");
        if (tour.getStatus() != Tour.TourStatus.DRAFT)
            throw new IllegalStateException("Only draft tours can be published");

        boolean hasBasicData = tour.getName() != null && !tour.getName().isBlank()
                && tour.getDescription() != null && !tour.getDescription().isBlank()
                && tour.getDifficulty() != null
                && tour.getTags() != null && !tour.getTags().isEmpty();
        if (!hasBasicData)
            throw new IllegalStateException("Tour must have name, description, difficulty and tags");

        if (keyPointRepository.countByTourId(tourId) < 2)
            throw new IllegalStateException("Tour must have at least two key points");

        if (transportTimeRepository.findByTourId(tourId).isEmpty())
            throw new IllegalStateException("Tour must have at least one transport time defined");

        // Saga prvi korak - lokalna transakcija
        tour.setStatus(Tour.TourStatus.PUBLISHED);
        tour = tourRepository.save(tour);

        // Saga drugi korak - orkestrator salje operaciju
        String blogPostId;
        try {
            blogPostId = sagaOrchestrator.publishTourSaga(tour);
        } catch (Exception e) {
            // Kompenzacija
            tour.setStatus(Tour.TourStatus.DRAFT);
            tourRepository.save(tour);
            throw new RuntimeException("Saga prekinuta: " + e.getMessage());
        }

        // Saga treci korak
        try {
            tour.setPublishedAt(java.time.LocalDateTime.now());
            tour.setBlogPostId(blogPostId);
            return tourRepository.save(tour);
        } catch (Exception e) {
            // Kompenzacija
            try {
                nats.publish("tour.publish.rollback",
                        objectMapper.writeValueAsBytes(Map.of("blogPostId", blogPostId)));
            } catch (Exception ex) {
                log.error("Rollback event nije mogao biti poslat: {}", ex.getMessage());
            }
            tour.setStatus(Tour.TourStatus.DRAFT);
            tour.setPublishedAt(null);
            tourRepository.save(tour);
            throw new RuntimeException("Saga prekinuta (Korak 3): Rollback izvršen");
        }
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

        TransportTime tt = transportTimeRepository.findByTourIdAndType(tourId, req.type())
                .orElseGet(TransportTime::new);
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
