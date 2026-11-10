package ru.hexlet.calendar.api;

import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
public class MeetingTypesController {

    private final MeetingTypesResponse response = new MeetingTypesResponse(List.of(
            new MeetingType(
                    "introduction",
                    "Знакомство",
                    "Короткий разговор, чтобы познакомиться и обсудить запрос.",
                    15),
            new MeetingType(
                    "working-session",
                    "Рабочая встреча",
                    "Обсудим текущие задачи и наметим следующие шаги.",
                    30),
            new MeetingType(
                    "consultation",
                    "Консультация",
                    "Разберём ваш вопрос и возможные решения.",
                    60)));

    @GetMapping("/api/v1/meeting-types")
    public MeetingTypesResponse listMeetingTypes() {
        return response;
    }
}
