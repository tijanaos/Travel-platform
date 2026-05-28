package rs.ac.uns.ftn.soa.tours.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rs.ac.uns.ftn.soa.tours.model.TourPurchaseToken;
import rs.ac.uns.ftn.soa.tours.service.ShoppingCartService;

import java.util.List;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final ShoppingCartService shoppingCartService;

    @GetMapping
    public ResponseEntity<List<TourPurchaseToken>> getPurchases(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(shoppingCartService.getPurchases(userId));
    }
}
