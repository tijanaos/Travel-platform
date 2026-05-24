package rs.ac.uns.ftn.soa.tours.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import rs.ac.uns.ftn.soa.tours.model.KeyPoint;
import rs.ac.uns.ftn.soa.tours.model.Tour;
import rs.ac.uns.ftn.soa.tours.service.KeyPointService;
import rs.ac.uns.ftn.soa.tours.service.TourService;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/tours/{tourId}/keypoints")
@RequiredArgsConstructor
public class KeyPointController {

    private final KeyPointService keyPointService;
    private final TourService tourService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addKeyPoint(
            @PathVariable Long tourId,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false) MultipartFile image,
            HttpServletRequest request) {

        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            KeyPoint kp = keyPointService.addKeyPoint(tourId, name, description,
                    latitude, longitude, image, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(kp);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Image upload failed");
        }
    }

    @GetMapping
    public ResponseEntity<List<KeyPoint>> getKeyPoints(@PathVariable Long tourId,
                                                       HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        List<KeyPoint> all = keyPointService.getKeyPointsForTour(tourId);

        try {
            Tour tour = tourService.getTourById(tourId);
            boolean isAuthor = userId != null && userId.equals(tour.getAuthorId());
            if (!isAuthor && tour.getStatus() != Tour.TourStatus.PUBLISHED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (!isAuthor && all.size() > 1) {
                return ResponseEntity.ok(List.of(all.get(0)));
            }
        } catch (RuntimeException ignored) {}

        return ResponseEntity.ok(all);
    }

    @PutMapping(value = "/{keyPointId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateKeyPoint(
            @PathVariable Long tourId,
            @PathVariable Long keyPointId,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false) MultipartFile image,
            HttpServletRequest request) {

        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            KeyPoint kp = keyPointService.updateKeyPoint(keyPointId, name, description,
                    latitude, longitude, image, userId);
            return ResponseEntity.ok(kp);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Image upload failed");
        }
    }

    @DeleteMapping("/{keyPointId}")
    public ResponseEntity<?> deleteKeyPoint(@PathVariable Long tourId,
                                            @PathVariable Long keyPointId,
                                            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            keyPointService.deleteKeyPoint(keyPointId, userId);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
