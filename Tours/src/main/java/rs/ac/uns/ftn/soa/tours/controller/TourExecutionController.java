package rs.ac.uns.ftn.soa.tours.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rs.ac.uns.ftn.soa.tours.model.TourExecution;
import rs.ac.uns.ftn.soa.tours.service.TourExecutionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/executions")
@RequiredArgsConstructor
public class TourExecutionController {

    private final TourExecutionService executionService;

    @PostMapping
    public ResponseEntity<?> startTour(@RequestBody Map<String, Long> body,
                                       HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Long tourId = body.get("tourId");
        if (tourId == null) return ResponseEntity.badRequest().body("tourId is required");

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(executionService.startTour(tourId, touristId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/abandon")
    public ResponseEntity<?> abandonTour(@PathVariable Long id, HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            return ResponseEntity.ok(executionService.abandonTour(id, touristId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeTour(@PathVariable Long id, HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            return ResponseEntity.ok(executionService.completeTour(id, touristId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/check-proximity")
    public ResponseEntity<?> checkProximity(@PathVariable Long id, HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            return ResponseEntity.ok(executionService.checkProximity(id, touristId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveSession(HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return executionService.getActiveSession(touristId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getExecution(@PathVariable Long id, HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            return ResponseEntity.ok(executionService.getExecution(id, touristId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<TourExecution>> getHistory(HttpServletRequest request) {
        Long touristId = (Long) request.getAttribute("userId");
        if (touristId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return ResponseEntity.ok(executionService.getHistory(touristId));
    }
}
