package ru.hexlet.calendar;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CalendarApplicationSmokeTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void applicationStartsAndHealthEndpointResponds() {
        ResponseEntity<Map> response = restTemplate.getForEntity("/api/health", Map.class);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("UP", response.getBody().get("status"));
    }
}