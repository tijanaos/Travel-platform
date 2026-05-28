package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rs.ac.uns.ftn.soa.tours.model.*;
import rs.ac.uns.ftn.soa.tours.repository.ShoppingCartRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourPurchaseTokenRepository;
import rs.ac.uns.ftn.soa.tours.repository.TourRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShoppingCartService {

    private final ShoppingCartRepository cartRepository;
    private final TourPurchaseTokenRepository tokenRepository;
    private final TourRepository tourRepository;

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

    @Transactional
    public List<TourPurchaseToken> checkout(Long touristId) {
        ShoppingCart cart = getOrCreateCart(touristId);

        List<TourPurchaseToken> tokens = cart.getItems().stream().map(item -> {
            TourPurchaseToken token = new TourPurchaseToken();
            token.setTouristId(touristId);
            token.setTourId(item.getTourId());
            token.setToken(UUID.randomUUID().toString());
            return tokenRepository.save(token);
        }).toList();

        cart.getItems().clear();
        cart.setTotalPrice(0.0);
        cartRepository.save(cart);

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
