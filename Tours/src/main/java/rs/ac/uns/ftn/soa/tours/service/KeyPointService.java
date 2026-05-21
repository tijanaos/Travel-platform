package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import rs.ac.uns.ftn.soa.tours.model.KeyPoint;
import rs.ac.uns.ftn.soa.tours.model.Tour;
import rs.ac.uns.ftn.soa.tours.repository.KeyPointRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KeyPointService {

    private final KeyPointRepository keyPointRepository;
    private final TourRepository tourRepository;

    @Value("${upload.dir}")
    private String uploadDir;

    public KeyPoint addKeyPoint(Long tourId, String name, String description,
                                Double latitude, Double longitude,
                                MultipartFile image, Long requesterId) throws IOException {

        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found: " + tourId));

        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can add key points");
        }

        KeyPoint kp = new KeyPoint();
        kp.setTourId(tourId);
        kp.setName(name);
        kp.setDescription(description);
        kp.setLatitude(latitude);
        kp.setLongitude(longitude);

        if (image != null && !image.isEmpty()) {
            kp.setImageUrl(saveImage(image));
        }

        KeyPoint saved = keyPointRepository.save(kp);
        recalculateTourLength(tourId);
        return saved;
    }

    public List<KeyPoint> getKeyPointsForTour(Long tourId) {
        return keyPointRepository.findByTourId(tourId);
    }

    public KeyPoint updateKeyPoint(Long keyPointId, String name, String description,
                                   Double latitude, Double longitude,
                                   MultipartFile image, Long requesterId) throws IOException {
        KeyPoint kp = keyPointRepository.findById(keyPointId)
                .orElseThrow(() -> new RuntimeException("KeyPoint not found: " + keyPointId));

        Tour tour = tourRepository.findById(kp.getTourId())
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can edit key points");
        }

        kp.setName(name);
        kp.setDescription(description);
        kp.setLatitude(latitude);
        kp.setLongitude(longitude);

        if (image != null && !image.isEmpty()) {
            kp.setImageUrl(saveImage(image));
        }

        return keyPointRepository.save(kp);
    }

    public void deleteKeyPoint(Long keyPointId, Long requesterId) {
        KeyPoint kp = keyPointRepository.findById(keyPointId)
                .orElseThrow(() -> new RuntimeException("KeyPoint not found: " + keyPointId));

        Tour tour = tourRepository.findById(kp.getTourId())
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        if (!tour.getAuthorId().equals(requesterId)) {
            throw new SecurityException("Only the tour author can delete key points");
        }

        keyPointRepository.delete(kp);
        recalculateTourLength(kp.getTourId());
    }

    private void recalculateTourLength(Long tourId) {
        List<KeyPoint> points = keyPointRepository.findByTourId(tourId);
        if (points.size() < 2) {
            Tour tour = tourRepository.findById(tourId).orElse(null);
            if (tour != null) {
                tour.setLengthKm(null);
                tourRepository.save(tour);
            }
            return;
        }
        double total = 0;
        for (int i = 0; i < points.size() - 1; i++) {
            total += haversineKm(
                points.get(i).getLatitude(), points.get(i).getLongitude(),
                points.get(i + 1).getLatitude(), points.get(i + 1).getLongitude()
            );
        }
        Tour tour = tourRepository.findById(tourId).orElse(null);
        if (tour != null) {
            tour.setLengthKm(Math.round(total * 100.0) / 100.0);
            tourRepository.save(tour);
        }
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private String saveImage(MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(dir);

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dest = dir.resolve(filename);
        file.transferTo(dest);

        return "/uploads/" + filename;
    }

    public KeyPoint updateKeyPoint(Long keyPointId, String name, String description,
                               Double latitude, Double longitude,
                               MultipartFile image, Long requesterId) throws IOException {

    KeyPoint kp = keyPointRepository.findById(keyPointId)
            .orElseThrow(() -> new RuntimeException("KeyPoint not found: " + keyPointId));

    Tour tour = tourRepository.findById(kp.getTourId())
            .orElseThrow(() -> new RuntimeException("Tour not found"));

    if (!tour.getAuthorId().equals(requesterId)) {
        throw new SecurityException("Only the tour author can update key points");
    }

    kp.setName(name);
    kp.setDescription(description);
    kp.setLatitude(latitude);
    kp.setLongitude(longitude);

    if (image != null && !image.isEmpty()) {
        kp.setImageUrl(saveImage(image));
    }

    return keyPointRepository.save(kp);
}
}
