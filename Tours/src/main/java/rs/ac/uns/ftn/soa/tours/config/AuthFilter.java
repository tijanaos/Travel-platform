package rs.ac.uns.ftn.soa.tours.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

public class AuthFilter extends OncePerRequestFilter {

    @Value("${stakeholders.service.url}")
    private String stakeholdersUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Public endpoints — no auth needed
        if (isPublicPath(path, request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Missing or invalid Authorization header");
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<ValidateResponse> resp = restTemplate.exchange(
                    stakeholdersUrl + "/api/auth/validate",
                    HttpMethod.GET,
                    entity,
                    ValidateResponse.class
            );

            if (resp.getStatusCode() == HttpStatus.OK && resp.getBody() != null) {
                request.setAttribute("userId", resp.getBody().getUserId());

                // Decode JWT payload to extract role and username
                try {
                    String payload = authHeader.substring(7).split("\\.")[1];
                    byte[] decoded = Base64.getUrlDecoder().decode(payload);
                    Map<?, ?> claims = objectMapper.readValue(decoded, Map.class);
                    request.setAttribute("role", claims.get("role"));
                    request.setAttribute("username", claims.get("username"));
                } catch (Exception ignored) {}

                filterChain.doFilter(request, response);
            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid token");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Token validation failed");
        }
    }

    private boolean isPublicPath(String path, String method) {
        if (method.equals("GET") && path.matches("/api/tours/?.*")) return true;
        return false;
    }

    // Stakeholders /api/auth/validate returns {"user_id": <number>}
    public record ValidateResponse(Long user_id) {
        public Long getUserId() { return user_id; }
    }
}
