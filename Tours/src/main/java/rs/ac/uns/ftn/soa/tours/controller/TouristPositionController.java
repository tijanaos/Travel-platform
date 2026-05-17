package rs.ac.uns.ftn.soa.tours.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rs.ac.uns.ftn.soa.tours.model.TouristPosition;
import rs.ac.uns.ftn.soa.tours.service.TouristPositionService;

import java.util.Map;

@RestController
@RequestMapping("/api/tourist-position")
@RequiredArgsConstructor
public class TouristPositionController {

    private final TouristPositionService service;

    /**
     * PUT /api/tourist-position
     * Body: { "latitude": 44.8, "longitude": 20.4 }
     * Upisuje ili ažurira trenutnu poziciju ulogovanog turiste.
     */
    @PutMapping
    public ResponseEntity<?> updatePosition(
            @RequestBody Map<String, Double> body,
            HttpServletRequest request) {

        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().body("latitude and longitude are required");
        }

        TouristPosition pos = service.updatePosition(userId, lat, lng);
        return ResponseEntity.ok(pos);
    }

    /**
     * GET /api/tourist-position
     * Vraća trenutnu poziciju ulogovanog turiste.
     */
    @GetMapping
    public ResponseEntity<?> getMyPosition(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return service.getPosition(userId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
