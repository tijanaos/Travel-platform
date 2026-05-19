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

        return keyPointRepository.save(kp);
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
    }

    private String saveImage(MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(dir);

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dest = dir.resolve(filename);
        file.transferTo(dest);

        return "/uploads/" + filename;
    }
}
