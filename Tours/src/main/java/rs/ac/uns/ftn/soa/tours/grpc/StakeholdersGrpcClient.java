package rs.ac.uns.ftn.soa.tours.grpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class StakeholdersGrpcClient {

    @Value("${stakeholders.grpc.host:localhost}")
    private String host;

    @Value("${stakeholders.grpc.port:9090}")
    private int port;

    private ManagedChannel channel;
    private UserServiceGrpc.UserServiceBlockingStub stub;

    @PostConstruct
    public void init() {
        channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        stub = UserServiceGrpc.newBlockingStub(channel);
    }

    @PreDestroy
    public void destroy() throws InterruptedException {
        if (channel != null) {
            channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    public String getUsernameById(Long userId) {
        try {
            GetUsernameRequest request = GetUsernameRequest.newBuilder()
                    .setUserId(userId)
                    .build();
            GetUsernameResponse response = stub.getUsernameById(request);
            return response.getUsername();
        } catch (Exception e) {
            return "user-" + userId;
        }
    }
}
