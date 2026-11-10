package ru.hexlet.calendar.api;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "OWNER_API_TOKEN=owner-test-token")
@AutoConfigureMockMvc
@Import(OwnerApiTest.FixedClockConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class OwnerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void ownerRoutesRequireBearerTokenAndReturnUnauthorizedChallenge() throws Exception {
        mockMvc.perform(get("/api/v1/owner/meeting-types"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("authorization_required"));

        mockMvc.perform(get("/api/v1/owner/meeting-types")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"));
    }

    @Test
    void ownerCanCreateUpdateAndArchiveMeetingTypes() throws Exception {
        String createRequest = """
                {
                  "slug": "owner-created",
                  "title": "Первичная встреча",
                  "description": "Исходное описание",
                  "durationMinutes": 15
                }
                """;
        String updateRequest = """
                {
                  "title": "Обновлённая встреча",
                  "description": "Новое описание",
                  "durationMinutes": 30
                }
                """;

        mockMvc.perform(post("/api/v1/owner/meeting-types")
                        .header("Authorization", "Bearer owner-test-token")
                        .contentType(APPLICATION_JSON)
                        .content(createRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("owner-created"));

        mockMvc.perform(post("/api/v1/owner/meeting-types")
                        .header("Authorization", "Bearer owner-test-token")
                        .contentType(APPLICATION_JSON)
                        .content(createRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("meeting_type_conflict"));

        String invalidRequest = """
                {
                  "slug": "-invalid-",
                  "title": " ",
                  "description": " ",
                  "durationMinutes": 45
                }
                """;
        mockMvc.perform(post("/api/v1/owner/meeting-types")
                        .header("Authorization", "Bearer owner-test-token")
                        .contentType(APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.length()").value(4));

        String bookingRequest = """
                {
                  "meetingTypeSlug": "owner-created",
                  "startsAt": "2030-01-02T09:15:00+03:00",
                  "guest": {"name": "Анна", "email": "anna@example.com"}
                }
                """;
        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(bookingRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.meetingType.title").value("Первичная встреча"));

        mockMvc.perform(patch("/api/v1/owner/meeting-types/owner-created")
                        .header("Authorization", "Bearer owner-test-token")
                        .contentType(APPLICATION_JSON)
                        .content(updateRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Обновлённая встреча"))
                .andExpect(jsonPath("$.durationMinutes").value(30));

        mockMvc.perform(get("/api/v1/owner/meeting-types")
                        .header("Authorization", "Bearer owner-test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.slug == 'owner-created')]",
                        hasSize(1)));

        mockMvc.perform(post("/api/v1/owner/meeting-types/owner-created/archive")
                        .header("Authorization", "Bearer owner-test-token"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/meeting-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.slug == 'owner-created')]",
                        hasSize(0)));

        mockMvc.perform(get("/api/v1/meeting-types/owner-created/availability")
                        .queryParam("from", "2030-01-02")
                        .queryParam("to", "2030-01-02"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(bookingRequest))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/owner/meeting-types")
                        .header("Authorization", "Bearer owner-test-token")
                        .contentType(APPLICATION_JSON)
                        .content(createRequest))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/owner/bookings")
                        .header("Authorization", "Bearer owner-test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].meetingType.title")
                        .value("Первичная встреча"))
                .andExpect(jsonPath("$.items[0].meetingType.durationMinutes").value(15));
    }

    @Test
    void ownerCanReadFutureBookingsWithoutPubliclyHiddenMetadata() throws Exception {
        String laterBooking = """
                {
                  "meetingTypeSlug": "introduction",
                  "startsAt": "2030-01-02T10:15:00+03:00",
                  "guest": {"name": "Анна", "email": "anna@example.com"}
                }
                """;
        String earlierBooking = """
                {
                  "meetingTypeSlug": "introduction",
                  "startsAt": "2030-01-02T09:15:00+03:00",
                  "guest": {"name": "Борис", "email": "boris@example.com"}
                }
                """;

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(laterBooking))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.guest").doesNotExist());
        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(APPLICATION_JSON)
                        .content(earlierBooking))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/owner/bookings")
                        .header("Authorization", "Bearer owner-test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].guest.name").value("Борис"))
                .andExpect(jsonPath("$.items[0].guest.email").value("boris@example.com"))
                .andExpect(jsonPath("$.items[0].startsAt")
                        .value("2030-01-02T09:15:00+03:00"))
                .andExpect(jsonPath("$.items[0].endsAt")
                        .value("2030-01-02T09:30:00+03:00"))
                .andExpect(jsonPath("$.items[0].id").doesNotExist())
                .andExpect(jsonPath("$.items[0].createdAt").doesNotExist())
                .andExpect(jsonPath("$.items[1].guest.name").value("Анна"))
                .andExpect(jsonPath("$.items[1].guest.email").value("anna@example.com"))
                .andExpect(jsonPath("$.items[1].meetingType.title").value("Знакомство"));
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock ownerApiTestClock() {
            return Clock.fixed(Instant.parse("2030-01-01T06:00:00Z"), ZoneOffset.UTC);
        }
    }
}
