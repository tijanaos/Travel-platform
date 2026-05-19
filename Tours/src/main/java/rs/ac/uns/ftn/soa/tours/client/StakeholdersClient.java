package rs.ac.uns.ftn.soa.tours.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class StakeholdersClient {

    private final RestTemplate restTemplate;
    private final String stakeholdersUrl;

    public StakeholdersClient(RestTemplate restTemplate,
                               @Value("${stakeholders.service.url}") String stakeholdersUrl) {
        this.restTemplate = restTemplate;
        this.stakeholdersUrl = stakeholdersUrl;
    }

    public String getUsernameById(Long userId, String authorizationHeader) {
        try {
            HttpHeaders headers = new HttpHeaders();
            if (authorizationHeader != null) {
                headers.set("Authorization", authorizationHeader);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    stakeholdersUrl + "/api/users/" + userId,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );
            Object username = response.getBody() != null ? response.getBody().get("username") : null;
            return username != null ? username.toString() : "user-" + userId;
        } catch (Exception e) {
            return "user-" + userId;
        }
    }
}
