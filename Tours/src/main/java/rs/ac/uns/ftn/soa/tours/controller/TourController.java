package rs.ac.uns.ftn.soa.tours.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rs.ac.uns.ftn.soa.tours.dto.CreateTourRequest;
import rs.ac.uns.ftn.soa.tours.model.Tour;
import rs.ac.uns.ftn.soa.tours.service.TourService;

import java.util.List;

@RestController
@RequestMapping("/api/tours")
@RequiredArgsConstructor
public class TourController {

    private final TourService tourService;

    @PostMapping
    public ResponseEntity<Tour> createTour(@Valid @RequestBody CreateTourRequest request,
                                           HttpServletRequest httpRequest) {
        Long authorId = (Long) httpRequest.getAttribute("userId");
        if (authorId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String role = (String) httpRequest.getAttribute("role");
        if (!"author".equalsIgnoreCase(role) && !"guide".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Tour tour = tourService.createTour(request, authorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(tour);
    }

    @GetMapping
    public ResponseEntity<List<Tour>> getAllTours() {
        return ResponseEntity.ok(tourService.getAllTours());
    }

    @GetMapping("/my")
    public ResponseEntity<List<Tour>> getMyTours(HttpServletRequest httpRequest) {
        Long authorId = (Long) httpRequest.getAttribute("userId");
        if (authorId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return ResponseEntity.ok(tourService.getMyTours(authorId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tour> getTour(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(tourService.getTourById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
