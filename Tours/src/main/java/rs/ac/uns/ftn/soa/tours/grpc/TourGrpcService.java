package rs.ac.uns.ftn.soa.tours.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import rs.ac.uns.ftn.soa.tours.dto.CreateTourRequest;
import rs.ac.uns.ftn.soa.tours.model.Tour;
import rs.ac.uns.ftn.soa.tours.service.TourService;

import java.util.List;

@GrpcService
@RequiredArgsConstructor
public class TourGrpcService extends TourServiceGrpc.TourServiceImplBase {

    private final TourService tourService;

    @Override
    public void createTour(rs.ac.uns.ftn.soa.tours.grpc.CreateTourRequest request,
                           StreamObserver<rs.ac.uns.ftn.soa.tours.grpc.CreateTourResponse> responseObserver) {
        try {
            Tour.Difficulty difficulty;
            try {
                difficulty = Tour.Difficulty.valueOf(request.getDifficulty().toUpperCase());
            } catch (IllegalArgumentException e) {
                difficulty = Tour.Difficulty.EASY;
            }

            CreateTourRequest dto = new CreateTourRequest(
                    request.getName(),
                    request.getDescription(),
                    difficulty,
                    request.getTagsList().isEmpty() ? List.of() : request.getTagsList()
            );

            Tour tour = tourService.createTour(dto, request.getAuthorId());

            rs.ac.uns.ftn.soa.tours.grpc.CreateTourResponse response =
                    rs.ac.uns.ftn.soa.tours.grpc.CreateTourResponse.newBuilder()
                            .setId(tour.getId())
                            .setName(tour.getName())
                            .setDescription(tour.getDescription() != null ? tour.getDescription() : "")
                            .setDifficulty(tour.getDifficulty().name())
                            .addAllTags(tour.getTags())
                            .setStatus(tour.getStatus().name())
                            .setPrice(tour.getPrice() != null ? tour.getPrice() : 0.0)
                            .setAuthorId(tour.getAuthorId())
                            .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        }
    }
}
