package rs.ac.uns.ftn.soa.tours.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import rs.ac.uns.ftn.soa.tours.client.StakeholdersClient;
import rs.ac.uns.ftn.soa.tours.model.Review;
import rs.ac.uns.ftn.soa.tours.service.ReviewService;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tours/{tourId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final StakeholdersClient stakeholdersClient;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addReview(
            @PathVariable Long tourId,
            @RequestParam Integer rating,
            @RequestParam(required = false) String comment,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate visitDate,
            @RequestParam(required = false) List<MultipartFile> images,
            HttpServletRequest request) {

        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String authHeader = request.getHeader("Authorization");
        String touristUsername = stakeholdersClient.getUsernameById(touristId, authHeader);

        try {
            Review review = reviewService.addReview(tourId, rating, comment,
                    visitDate, touristUsername, touristId, images);
            return ResponseEntity.status(HttpStatus.CREATED).body(review);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Image upload failed");
        }
    }

    @GetMapping
    public ResponseEntity<List<Review>> getReviews(@PathVariable Long tourId) {
        return ResponseEntity.ok(reviewService.getReviewsForTour(tourId));
    }
}
