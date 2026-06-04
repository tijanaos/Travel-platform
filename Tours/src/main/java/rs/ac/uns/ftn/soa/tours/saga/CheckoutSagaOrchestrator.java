package rs.ac.uns.ftn.soa.tours.saga;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.nats.client.Connection;
import io.nats.client.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class CheckoutSagaOrchestrator {

    private final Connection nats;
    private final ObjectMapper objectMapper;

    public void validate(Long touristId, List<String> tokenValues) throws Exception {

        Map<String, Object> payload = Map.of(
                "touristId", touristId,
                "tokens",    tokenValues
        );

        Message reply = nats.request(
                "checkout.validate",
                objectMapper.writeValueAsBytes(payload),
                Duration.ofSeconds(10)
        );

        if (reply == null) {
            throw new RuntimeException("Stakeholders servis nije odgovorio na vreme (timeout)");
        }

        Map<?, ?> response = objectMapper.readValue(reply.getData(), Map.class);

        if (!"success".equals(response.get("status"))) {
            throw new RuntimeException("Validacija nije uspela: " + response.get("error"));
        }
    }

    public void rollback(Long touristId) {
        try {
            Map<String, Object> payload = Map.of("touristId", touristId);
            nats.publish("checkout.rollback", objectMapper.writeValueAsBytes(payload));
        } catch (Exception e) {
            log.error("Rollback event nije mogao biti poslat za touristId {}: {}", touristId, e.getMessage());
        }
    }
}