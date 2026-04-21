package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import rs.ac.uns.ftn.soa.tours.model.Review;
import rs.ac.uns.ftn.soa.tours.repository.ReviewRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final TourRepository tourRepository;

    @Value("${upload.dir}")
    private String uploadDir;

    public Review addReview(Long tourId, Integer rating, String comment,
                            LocalDate visitDate, String touristUsername,
                            Long touristId, List<MultipartFile> images) throws IOException {

        if (!tourRepository.existsById(tourId)) {
            throw new RuntimeException("Tour not found: " + tourId);
        }

        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        if (reviewRepository.existsByTourIdAndTouristId(tourId, touristId)) {
            throw new IllegalStateException("Tourist already reviewed this tour");
        }

        Review review = new Review();
        review.setTourId(tourId);
        review.setTouristId(touristId);
        review.setTouristUsername(touristUsername);
        review.setRating(rating);
        review.setComment(comment);
        review.setVisitDate(visitDate);

        if (images != null) {
            List<String> urls = new ArrayList<>();
            for (MultipartFile img : images) {
                if (!img.isEmpty()) {
                    urls.add(saveImage(img));
                }
            }
            review.setImageUrls(urls);
        }

        return reviewRepository.save(review);
    }

    public List<Review> getReviewsForTour(Long tourId) {
        return reviewRepository.findByTourId(tourId);
    }

    private String saveImage(MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(dir);

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        file.transferTo(dir.resolve(filename));

        return "/uploads/" + filename;
    }
}
