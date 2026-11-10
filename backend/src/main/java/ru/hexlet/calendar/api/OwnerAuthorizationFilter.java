package ru.hexlet.calendar.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class OwnerAuthorizationFilter extends OncePerRequestFilter {

    private static final String OWNER_PATH_PREFIX = "/api/v1/owner/";
    private static final String BEARER_PREFIX = "Bearer ";

    private final byte[] ownerToken;
    private final ObjectMapper objectMapper;

    public OwnerAuthorizationFilter(
            @Value("${OWNER_API_TOKEN:}") String ownerToken,
            ObjectMapper objectMapper) {
        this.ownerToken = ownerToken.isBlank()
                ? new byte[0]
                : ownerToken.getBytes(StandardCharsets.UTF_8);
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!request.getRequestURI().startsWith(OWNER_PATH_PREFIX)
                || "OPTIONS".equalsIgnoreCase(request.getMethod())
                || isAuthorized(request.getHeader("Authorization"))) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setHeader("WWW-Authenticate", "Bearer");
        response.setContentType(MediaType.valueOf("application/problem+json").toString());
        objectMapper.writeValue(response.getOutputStream(), new ProblemDetails(
                "about:blank",
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                HttpStatus.UNAUTHORIZED.value(),
                "Предъявите действительный Bearer-токен владельца.",
                "authorization_required",
                List.of()));
    }

    private boolean isAuthorized(String authorization) {
        if (ownerToken.length == 0
                || authorization == null
                || !authorization.startsWith(BEARER_PREFIX)) {
            return false;
        }
        String rawToken = authorization.substring(BEARER_PREFIX.length());
        if (rawToken.isBlank()) {
            return false;
        }
        byte[] providedToken = rawToken.getBytes(StandardCharsets.UTF_8);
        return providedToken.length > 0 && MessageDigest.isEqual(ownerToken, providedToken);
    }
}
