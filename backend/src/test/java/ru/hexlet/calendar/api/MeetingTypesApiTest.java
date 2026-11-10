package ru.hexlet.calendar.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeetingTypesApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicMeetingTypesReturnsAvailableDemoTypes() throws Exception {
        mockMvc.perform(get("/api/v1/meeting-types"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].slug").value("introduction"))
                .andExpect(jsonPath("$.items[0].title").value("Знакомство"))
                .andExpect(jsonPath("$.items[0].description").value(
                        "Короткий разговор, чтобы познакомиться и обсудить запрос."))
                .andExpect(jsonPath("$.items[0].durationMinutes").value(15))
                .andExpect(jsonPath("$.items[1].slug").value("working-session"))
                .andExpect(jsonPath("$.items[1].title").value("Рабочая встреча"))
                .andExpect(jsonPath("$.items[1].description").value(
                        "Обсудим текущие задачи и наметим следующие шаги."))
                .andExpect(jsonPath("$.items[1].durationMinutes").value(30))
                .andExpect(jsonPath("$.items[2].slug").value("consultation"))
                .andExpect(jsonPath("$.items[2].title").value("Консультация"))
                .andExpect(jsonPath("$.items[2].description").value(
                        "Разберём ваш вопрос и возможные решения."))
                .andExpect(jsonPath("$.items[2].durationMinutes").value(60));
    }
}
