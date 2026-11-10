package ru.hexlet.calendar.api;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(BookingApiTest.FixedClockConfiguration.class)
class BookingApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void availabilityListsValidStartsInMoscowTime() throws Exception {
        mockMvc.perform(get("/api/v1/meeting-types/working-session/availability")
                        .queryParam("from", "2030-01-01")
                        .queryParam("to", "2030-01-14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dates.length()").value(10))
                .andExpect(jsonPath("$.dates[0].date").value("2030-01-01"))
                .andExpect(jsonPath("$.dates[0].slots[0].startsAt")
                        .value("2030-01-01T09:15:00+03:00"))
                .andExpect(jsonPath("$.dates[0].slots[0].endsAt")
                        .value("2030-01-01T09:45:00+03:00"))
                .andExpect(jsonPath("$.dates[0].slots[-1].startsAt")
                        .value("2030-01-01T17:30:00+03:00"))
                .andExpect(jsonPath("$.dates[0].slots[-1].endsAt")
                        .value("2030-01-01T18:00:00+03:00"));
    }

    @Test
    void guestCanBookAnAvailableTimeAndOverlapsAreRejected() throws Exception {
        String firstBooking = """
                {
                  "meetingTypeSlug": "working-session",
                  "startsAt": "2030-01-02T09:15:00+03:00",
                  "guest": {"name": "Анна", "email": "anna@example.com"}
                }
                """;
        String overlappingBooking = """
                {
                  "meetingTypeSlug": "introduction",
                  "startsAt": "2030-01-02T09:30:00+03:00",
                  "guest": {"name": "Иван", "email": "ivan@example.com"}
                }
                """;

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(firstBooking))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.meetingType.title").value("Рабочая встреча"))
                .andExpect(jsonPath("$.startsAt").value("2030-01-02T09:15:00+03:00"))
                .andExpect(jsonPath("$.endsAt").value("2030-01-02T09:45:00+03:00"))
                .andExpect(jsonPath("$.guest").doesNotExist());

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(overlappingBooking))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("booking_conflict"))
                .andExpect(jsonPath("$.detail").value("Это время уже занято. Выберите другое"));
    }

    @Test
    void adjacentBookingsAreAllowedAndGuestFieldsAreValidated() throws Exception {
        String firstBooking = """
                {
                  "meetingTypeSlug": "working-session",
                  "startsAt": "2030-01-03T09:15:00+03:00",
                  "guest": {"name": "Анна", "email": "anna@example.com"}
                }
                """;
        String adjacentBooking = """
                {
                  "meetingTypeSlug": "consultation",
                  "startsAt": "2030-01-03T09:45:00+03:00",
                  "guest": {"name": "Борис", "email": "boris@example.com"}
                }
                """;
        String invalidGuest = """
                {
                  "meetingTypeSlug": "introduction",
                  "startsAt": "2030-01-04T09:15:00+03:00",
                  "guest": {"name": " ", "email": "not-an-email"}
                }
                """;

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(firstBooking))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(adjacentBooking))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endsAt").value("2030-01-03T10:45:00+03:00"));
        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(invalidGuest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.errors.length()").value(2));
    }

    @Test
    void bookingWindowAndStartTimeAreValidated() throws Exception {
        mockMvc.perform(get("/api/v1/meeting-types/working-session/availability")
                        .queryParam("from", "2029-12-31")
                        .queryParam("to", "2030-01-14"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("validation_error"));

        String offGridBooking = """
                {
                  "meetingTypeSlug": "introduction",
                  "startsAt": "2030-01-08T09:16:00+03:00",
                  "guest": {"name": "Анна", "email": "anna@example.com"}
                }
                """;
        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(offGridBooking))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("startsAt"));
    }

    @Test
    void concurrentRequestsCanCreateOnlyOneOverlappingBooking() throws Exception {
        String request = """
                {
                  "meetingTypeSlug": "introduction",
                  "startsAt": "2030-01-09T10:15:00+03:00",
                  "guest": {"name": "Анна", "email": "anna@example.com"}
                }
                """;
        int requestCount = 8;
        CountDownLatch ready = new CountDownLatch(requestCount);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(requestCount);
        try {
            List<Future<Integer>> responses = new ArrayList<>();
            for (int index = 0; index < requestCount; index++) {
                responses.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    return mockMvc.perform(post("/api/v1/bookings")
                                    .contentType(APPLICATION_JSON)
                                    .content(request))
                            .andReturn()
                            .getResponse()
                            .getStatus();
                }));
            }
            ready.await();
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> response : responses) {
                statuses.add(response.get());
            }
            org.junit.jupiter.api.Assertions.assertEquals(1,
                    statuses.stream().filter(status -> status == 201).count());
            org.junit.jupiter.api.Assertions.assertEquals(requestCount - 1,
                    statuses.stream().filter(status -> status == 409).count());
        } finally {
            executor.shutdownNow();
        }
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(Instant.parse("2030-01-01T06:00:00Z"), ZoneOffset.UTC);
        }
    }
}
