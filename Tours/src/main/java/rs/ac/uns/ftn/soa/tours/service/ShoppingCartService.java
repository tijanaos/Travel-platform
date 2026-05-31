package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rs.ac.uns.ftn.soa.tours.model.*;
import rs.ac.uns.ftn.soa.tours.repository.ShoppingCartRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourPurchaseTokenRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourRepository;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import rs.ac.uns.ftn.soa.tours.dto.ReserveTokenRequest;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShoppingCartService {

    private final ShoppingCartRepository cartRepository;
    private final TourPurchaseTokenRepository tokenRepository;
    private final TourRepository tourRepository;
    private final RestTemplate restTemplate;

    @Value("${stakeholders.service.url}")
    private String stakeholdersUrl;

    @Transactional
    public ShoppingCart getOrCreateCart(Long touristId) {
        return cartRepository.findByTouristId(touristId)
                .orElseGet(() -> {
                    ShoppingCart cart = new ShoppingCart();
                    cart.setTouristId(touristId);
                    return cartRepository.save(cart);
                });
    }

    @Transactional
    public ShoppingCart addItem(Long touristId, Long tourId) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        if (tour.getStatus() != Tour.TourStatus.PUBLISHED) {
            throw new IllegalArgumentException("Tour is not available for purchase");
        }

        if (tokenRepository.existsByTouristIdAndTourId(touristId, tourId)) {
            throw new IllegalArgumentException("Tour already purchased");
        }

        ShoppingCart cart = getOrCreateCart(touristId);

        boolean alreadyInCart = cart.getItems().stream()
                .anyMatch(item -> item.getTourId().equals(tourId));
        if (alreadyInCart) {
            throw new IllegalArgumentException("Tour is already in the cart");
        }

        OrderItem item = new OrderItem();
        item.setCart(cart);
        item.setTourId(tour.getId());
        item.setTourName(tour.getName());
        item.setPrice(tour.getPrice());
        cart.getItems().add(item);

        recalculateTotal(cart);
        return cartRepository.save(cart);
    }

    @Transactional
    public ShoppingCart removeItem(Long touristId, Long itemId) {
        ShoppingCart cart = getOrCreateCart(touristId);

        boolean removed = cart.getItems().removeIf(item -> item.getId().equals(itemId));
        if (!removed) {
            throw new RuntimeException("Item not found in cart");
        }

        recalculateTotal(cart);
        return cartRepository.save(cart);
    }

    // Uklonjen @Transactional
    public List<TourPurchaseToken> checkout(Long touristId) {
        ShoppingCart cart = getOrCreateCart(touristId);
        if (cart.getItems().isEmpty()) throw new RuntimeException("Korpa je prazna");

        // ─── SAGA KORAK 1: Lokalna transakcija ───────────────────────────────────
        // Kreiramo token za svaku turu u korpi sa statusom PENDING.
        // Ovo je "zapis namere" — ako saga ovde stane, PENDING tokeni
        // ostaju u bazi ali ne daju pristup turi (samo CONFIRMED daje).
        List<TourPurchaseToken> tokens = cart.getItems().stream().map(item -> {
            TourPurchaseToken token = new TourPurchaseToken();
            token.setTouristId(touristId);
            token.setTourId(item.getTourId());
            token.setToken(UUID.randomUUID().toString());
            token.setStatus(PurchaseStatus.PENDING);
            return tokenRepository.save(token);
        }).toList();

        // ─── SAGA KORAK 2: Distribuirani poziv ka Stakeholders servisu ───────────
        // Stakeholders beleži rezervacije kako bi znao da je ovaj tourist
        // u procesu kupovine. Šaljemo samo UUID tokene (ne ceo objekat).
        // Kompenzacija: ako poziv ne uspe, svi PENDING tokeni se poništavaju
        // — Stakeholders nije ništa upisao, pa nema šta da se poništava tamo.
        try {
            List<ReserveTokenRequest> tokenDtos = tokens.stream()
                    .map(t -> new ReserveTokenRequest(t.getToken()))
                    .toList();
            restTemplate.postForEntity(stakeholdersUrl + "/api/users/" + touristId + "/reserve", tokenDtos, Void.class);
        } catch (Exception e) {
            tokens.forEach(t -> {
                t.setStatus(PurchaseStatus.CANCELLED);
                tokenRepository.save(t);
            });
            throw new RuntimeException("Saga prekinuta (Korak 2): " + e.getMessage());
        }

        // ─── SAGA KORAK 3: Finalizacija ──────────────────────────────────────────
        // Potvrđujemo tokene jedan po jedan i pratimo koji su već CONFIRMED
        // pre eventualnog pada. Korpa se prazni tek nakon što su svi tokeni
        // potvrđeni — atomičnost na nivou lokalnog servisa.
        // Kompenzacija: već CONFIRMED tokeni se vraćaju na CANCELLED,
        // i šalje se release-all ka Stakeholders da obriše rezervacije.
        // Ako i release-all padne, potrebna je manuelna intervencija.
        List<TourPurchaseToken> confirmed = new java.util.ArrayList<>();
        try {
            for (TourPurchaseToken t : tokens) {
                t.setStatus(PurchaseStatus.CONFIRMED);
                tokenRepository.save(t);
                confirmed.add(t);
            }

            cart.getItems().clear();
            cart.setTotalPrice(0.0);
            cartRepository.save(cart);
        } catch (Exception e) {
            confirmed.forEach(t -> {
                t.setStatus(PurchaseStatus.CANCELLED);
                tokenRepository.save(t);
            });

            try {
                restTemplate.delete(stakeholdersUrl + "/api/users/" + touristId + "/release-all");
            } catch (Exception releaseEx) {
                // Kompenzacija nije uspela — stanje je nekonzistentno,
                // potrebna je manuelna intervencija ili retry mehanizam.
            }

            throw new RuntimeException("Saga prekinuta (Korak 3): Rollback izvršen");
        }

        return tokens;
    }

    public boolean hasPurchased(Long touristId, Long tourId) {
        return tokenRepository.existsByTouristIdAndTourId(touristId, tourId);
    }

    public List<TourPurchaseToken> getPurchases(Long touristId) {
        return tokenRepository.findByTouristId(touristId);
    }

    private void recalculateTotal(ShoppingCart cart) {
        double total = cart.getItems().stream()
                .mapToDouble(OrderItem::getPrice)
                .sum();
        cart.setTotalPrice(total);
    }
}
