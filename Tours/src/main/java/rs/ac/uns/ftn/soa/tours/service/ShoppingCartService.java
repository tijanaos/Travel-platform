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
import rs.ac.uns.ftn.soa.tours.saga.CheckoutSagaOrchestrator;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShoppingCartService {

    private final ShoppingCartRepository cartRepository;
    private final TourPurchaseTokenRepository tokenRepository;
    private final TourRepository tourRepository;
    private final CheckoutSagaOrchestrator checkoutSagaOrchestrator;

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

    public List<TourPurchaseToken> checkout(Long touristId) {
        ShoppingCart cart = getOrCreateCart(touristId);
        if (cart.getItems().isEmpty()) throw new RuntimeException("Korpa je prazna");

        // Saga prvi korak - kreiramo token za svaku turu u cartu(status Pending)
        List<TourPurchaseToken> tokens = cart.getItems().stream().map(item -> {
            TourPurchaseToken token = new TourPurchaseToken();
            token.setTouristId(touristId);
            token.setTourId(item.getTourId());
            token.setToken(UUID.randomUUID().toString());
            token.setStatus(PurchaseStatus.PENDING);
            return tokenRepository.save(token);
        }).toList();

        //  Saga drugi korak - proveravamo dal je turista blokiran
        List<String> tokenValues = tokens.stream()
                .map(TourPurchaseToken::getToken)
                .toList();

        try {
            checkoutSagaOrchestrator.validate(touristId, tokenValues);
        } catch (Exception e) {
            tokens.forEach(t -> {
                t.setStatus(PurchaseStatus.CANCELLED);
                tokenRepository.save(t);
            });
            checkoutSagaOrchestrator.rollback(touristId);
            throw new RuntimeException("Saga prekinuta (Korak 2): " + e.getMessage());
        }

        // Saga treci korak
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
            checkoutSagaOrchestrator.rollback(touristId);
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
