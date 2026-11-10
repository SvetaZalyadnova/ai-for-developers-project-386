package ru.hexlet.calendar.api;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class MeetingTypeCatalog {

    private final Map<String, MeetingType> activeTypes = new LinkedHashMap<>();

    public MeetingTypeCatalog() {
        add(new MeetingType(
                "introduction",
                "Знакомство",
                "Короткий разговор, чтобы познакомиться и обсудить запрос.",
                15));
        add(new MeetingType(
                "working-session",
                "Рабочая встреча",
                "Обсудим текущие задачи и наметим следующие шаги.",
                30));
        add(new MeetingType(
                "consultation",
                "Консультация",
                "Разберём ваш вопрос и возможные решения.",
                60));
    }

    public synchronized List<MeetingType> activeTypes() {
        return new ArrayList<>(activeTypes.values());
    }

    public synchronized Optional<MeetingType> findActive(String slug) {
        return Optional.ofNullable(activeTypes.get(slug));
    }

    private void add(MeetingType meetingType) {
        activeTypes.put(meetingType.slug(), meetingType);
    }
}
