package rs.ac.uns.ftn.soa.tours.grpc;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import rs.ac.uns.ftn.soa.tours.model.TouristPosition;
import rs.ac.uns.ftn.soa.tours.service.TouristPositionService;
import rs.ac.uns.ftn.soa.tours.grpc.TouristPositionServiceGrpc;
import rs.ac.uns.ftn.soa.tours.grpc.UpdatePositionRequest;
import rs.ac.uns.ftn.soa.tours.grpc.GetPositionRequest;
import rs.ac.uns.ftn.soa.tours.grpc.TouristPositionResponse;

@GrpcService
@RequiredArgsConstructor
public class TouristPositionGrpcService extends TouristPositionServiceGrpc.TouristPositionServiceImplBase {

    private final TouristPositionService service;

    @Override
    public void updatePosition(UpdatePositionRequest request, StreamObserver<TouristPositionResponse> responseObserver) {
        TouristPosition pos = service.updatePosition(request.getTouristId(), request.getLatitude(), request.getLongitude());
        
        responseObserver.onNext(mapToResponse(pos));
        responseObserver.onCompleted();
    }

    @Override
    public void getPosition(GetPositionRequest request, StreamObserver<TouristPositionResponse> responseObserver) {
        service.getPosition(request.getTouristId()).ifPresentOrElse(pos -> {
            responseObserver.onNext(mapToResponse(pos));
            responseObserver.onCompleted();
        }, () -> responseObserver.onError(Status.NOT_FOUND.withDescription("Position not found").asRuntimeException()));
    }

    private TouristPositionResponse mapToResponse(TouristPosition pos) {
        return TouristPositionResponse.newBuilder()
                .setId(pos.getId())
                .setTouristId(pos.getTouristId())
                .setLatitude(pos.getLatitude())
                .setLongitude(pos.getLongitude())
                .setUpdatedAt(pos.getUpdatedAt() != null ? pos.getUpdatedAt().toString() : "")
                .build();
    }
}