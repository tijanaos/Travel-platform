package rs.ac.uns.ftn.soa.tours.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class BlogClient {

    private final RestTemplate restTemplate;
    private final String blogUrl;

    public BlogClient(RestTemplate restTemplate,
                      @Value("${blog.service.url}") String blogUrl) {
        this.restTemplate = restTemplate;
        this.blogUrl = blogUrl;
    }

    public String createBlogPost(String title, String description, Long authorId) {
        Map<String, Object> body = Map.of(
                "title", title,
                "description", description,
                "author_id", authorId
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                blogUrl + "/blogs/internal",
                HttpMethod.POST,
                entity,
                Map.class
        );

        Map<?, ?> responseBody = response.getBody();
        if (responseBody == null || responseBody.get("id") == null) {
            throw new RuntimeException("Blog service returned empty response");
        }

        return responseBody.get("id").toString();
    }

    public void deleteBlogPost(String blogId) {
        restTemplate.delete(blogUrl + "/blogs/internal/" + blogId);
    }
}