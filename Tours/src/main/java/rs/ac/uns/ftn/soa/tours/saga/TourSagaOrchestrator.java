package rs.ac.uns.ftn.soa.tours.saga;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.nats.client.Connection;
import io.nats.client.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import rs.ac.uns.ftn.soa.tours.model.Tour;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class TourSagaOrchestrator {

    private final Connection nats;
    private final ObjectMapper objectMapper;

    public String publishTourSaga(Tour tour) throws Exception {

        Map<String, Object> payload = Map.of(
                "tourId",      tour.getId(),
                "title",       "New tour: " + tour.getName(),
                "description", String.format("## %s\n\n%s\n\n**Difficulty:** %s\n**Tags:** %s",
                        tour.getName(), tour.getDescription(),
                        tour.getDifficulty(), String.join(", ", tour.getTags())),
                "authorId",    tour.getAuthorId()
        );

        byte[] data = objectMapper.writeValueAsBytes(payload);

        Message reply = nats.request(
                "tour.publish.create",
                data,
                Duration.ofSeconds(10)
        );

        if (reply == null) {
            throw new RuntimeException("Blog servis nije odgovorio na vreme (timeout)");
        }

        Map<?, ?> response = objectMapper.readValue(reply.getData(), Map.class);

        if (!"success".equals(response.get("status"))) {
            throw new RuntimeException("Blog servis vratio grešku: " + response.get("error"));
        }

        return response.get("blogPostId").toString();
    }
}