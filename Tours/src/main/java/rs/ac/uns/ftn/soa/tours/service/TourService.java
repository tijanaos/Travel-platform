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

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final TransportTimeRepository transportTimeRepository;
    private final BlogClient blogClient;

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

        // ─── SAGA KORAK 1: Lokalna transakcija ───────────────────────────────────
        // Svi uslovi su ispunjeni, postavljamo turu na PUBLISHED lokalno.
        // publishedAt se postavlja tek u Koraku 3 — tura je tehnički published
        // ali bez blog posta još uvijek nije potpuno finalizovana.
        tour.setStatus(Tour.TourStatus.PUBLISHED);
        tour = tourRepository.save(tour);

        // ─── SAGA KORAK 2: Distribuirani poziv ka Blog servisu ───────────────────
        // Kreiramo blog post koji najavljuje objavu ture.
        // Kompenzacija: ako Blog servis padne, vraćamo turu na DRAFT.
        String blogPostId;
        try {
            String blogDescription = String.format(
                    "## %s\n\n%s\n\n**Difficulty:** %s\n**Tags:** %s",
                    tour.getName(),
                    tour.getDescription(),
                    tour.getDifficulty(),
                    String.join(", ", tour.getTags())
            );
            blogPostId = blogClient.createBlogPost(
                    "New tour: " + tour.getName(),
                    blogDescription,
                    tour.getAuthorId()
            );
        } catch (Exception e) {
            // Kompenzacija: vrati turu na DRAFT
            tour.setStatus(Tour.TourStatus.DRAFT);
            tourRepository.save(tour);
            throw new RuntimeException("Saga prekinuta (Korak 2): Blog servis nije dostupan - " + e.getMessage());
        }

        // ─── SAGA KORAK 3: Finalizacija ──────────────────────────────────────────
        // Postavljamo publishedAt i čuvamo blogPostId na turi.
        // Kompenzacija: vraćamo turu na DRAFT i brišemo blog post.
        try {
            tour.setPublishedAt(LocalDateTime.now());
            tour.setBlogPostId(blogPostId);
            return tourRepository.save(tour);
        } catch (Exception e) {
            // Kompenzacija: obriši blog post i vrati turu na DRAFT
            try {
                blogClient.deleteBlogPost(blogPostId);
            } catch (Exception deleteEx) {
                // log - manuelna intervencija potrebna
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
