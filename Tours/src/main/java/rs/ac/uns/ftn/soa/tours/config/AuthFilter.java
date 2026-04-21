package rs.ac.uns.ftn.soa.tours.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.io.IOException;

@Component
public class AuthFilter extends OncePerRequestFilter {

    @Value("${stakeholders.service.url}")
    private String stakeholdersUrl;

    private final RestTemplate restTemplate = new RestTemplate();

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
                request.setAttribute("role", resp.getBody().getRole());
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
        // GET on tours list and single tour is public (tourists browse before buying)
        if (method.equals("GET") && path.matches("/api/tours/?.*")) return true;
        return false;
    }

    public record ValidateResponse(Long userId, String role) {
        public Long getUserId() { return userId; }
        public String getRole() { return role; }
    }
}
