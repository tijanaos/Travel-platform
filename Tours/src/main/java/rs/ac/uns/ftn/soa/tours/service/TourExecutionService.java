package rs.ac.uns.ftn.soa.tours.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rs.ac.uns.ftn.soa.tours.model.*;
import rs.ac.uns.ftn.soa.tours.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TourExecutionService {

    private static final double PROXIMITY_RADIUS_KM = 0.1; // 100 meters

    private final TourExecutionRepository executionRepository;
    private final TourRepository tourRepository;
    private final KeyPointRepository keyPointRepository;
    private final TourPurchaseTokenRepository purchaseTokenRepository;
    private final TouristPositionRepository positionRepository;

    @Transactional
    public TourExecution startTour(Long tourId, Long touristId) {
        Tour tour = tourRepository.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        if (tour.getStatus() != Tour.TourStatus.PUBLISHED && tour.getStatus() != Tour.TourStatus.ARCHIVED) {
            throw new IllegalStateException("Only published or archived tours can be started");
        }

        if (!purchaseTokenRepository.existsByTouristIdAndTourId(touristId, tourId)) {
            throw new SecurityException("Tour must be purchased before starting");
        }

        Optional<TourExecution> existing = executionRepository.findByTouristIdAndStatus(
                touristId, TourExecution.ExecutionStatus.ACTIVE);
        if (existing.isPresent()) {
            throw new IllegalStateException("You already have an active tour session");
        }

        TourExecution execution = new TourExecution();
        execution.setTourId(tourId);
        execution.setTouristId(touristId);
        execution.setLastActivity(LocalDateTime.now());

        positionRepository.findByTouristId(touristId).ifPresent(pos -> {
            execution.setStartLatitude(pos.getLatitude());
            execution.setStartLongitude(pos.getLongitude());
        });

        return executionRepository.save(execution);
    }

    @Transactional
    public TourExecution abandonTour(Long executionId, Long touristId) {
        TourExecution execution = getOwnedExecution(executionId, touristId);
        if (execution.getStatus() != TourExecution.ExecutionStatus.ACTIVE) {
            throw new IllegalStateException("Only active sessions can be abandoned");
        }

        execution.setStatus(TourExecution.ExecutionStatus.ABANDONED);
        execution.setAbandonedAt(LocalDateTime.now());
        execution.setLastActivity(LocalDateTime.now());
        return executionRepository.save(execution);
    }

    @Transactional
    public TourExecution completeTour(Long executionId, Long touristId) {
        TourExecution execution = getOwnedExecution(executionId, touristId);
        if (execution.getStatus() != TourExecution.ExecutionStatus.ACTIVE) {
            throw new IllegalStateException("Only active sessions can be completed");
        }

        execution.setStatus(TourExecution.ExecutionStatus.COMPLETED);
        execution.setCompletedAt(LocalDateTime.now());
        execution.setLastActivity(LocalDateTime.now());
        return executionRepository.save(execution);
    }

    @Transactional
    public ProximityResult checkProximity(Long executionId, Long touristId) {
        TourExecution execution = getOwnedExecution(executionId, touristId);
        if (execution.getStatus() != TourExecution.ExecutionStatus.ACTIVE) {
            throw new IllegalStateException("Session is not active");
        }

        TouristPosition position = positionRepository.findByTouristId(touristId)
                .orElseThrow(() -> new RuntimeException("Tourist position not set. Use the simulator first."));

        List<KeyPoint> keyPoints = keyPointRepository.findByTourId(execution.getTourId());

        List<Long> alreadyCompleted = execution.getCompletedKeyPoints().stream()
                .map(CompletedKeyPoint::getKeyPointId)
                .toList();

        CompletedKeyPoint newlyCompleted = null;
        for (KeyPoint kp : keyPoints) {
            if (alreadyCompleted.contains(kp.getId())) continue;

            double distanceKm = haversineKm(
                    position.getLatitude(), position.getLongitude(),
                    kp.getLatitude(), kp.getLongitude()
            );

            if (distanceKm <= PROXIMITY_RADIUS_KM) {
                CompletedKeyPoint ckp = new CompletedKeyPoint();
                ckp.setExecution(execution);
                ckp.setKeyPointId(kp.getId());
                execution.getCompletedKeyPoints().add(ckp);
                newlyCompleted = ckp;
                break;
            }
        }

        execution.setLastActivity(LocalDateTime.now());
        executionRepository.save(execution);

        return new ProximityResult(newlyCompleted != null, newlyCompleted,
                execution.getCompletedKeyPoints().size(), keyPoints.size());
    }

    public TourExecution getExecution(Long executionId, Long touristId) {
        return getOwnedExecution(executionId, touristId);
    }

    public Optional<TourExecution> getActiveSession(Long touristId) {
        return executionRepository.findByTouristIdAndStatus(touristId, TourExecution.ExecutionStatus.ACTIVE);
    }

    public List<TourExecution> getHistory(Long touristId) {
        return executionRepository.findByTouristId(touristId);
    }

    private TourExecution getOwnedExecution(Long executionId, Long touristId) {
        TourExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));
        if (!execution.getTouristId().equals(touristId)) {
            throw new SecurityException("Access denied");
        }
        return execution;
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public record ProximityResult(
            boolean newKeyPointCompleted,
            CompletedKeyPoint completedKeyPoint,
            int totalCompleted,
            int totalKeyPoints
    ) {}
}
