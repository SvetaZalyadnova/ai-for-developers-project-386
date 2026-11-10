package ru.hexlet.calendar.api;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class MeetingTypeCatalog {

    private final Map<String, MeetingType> activeTypes = new LinkedHashMap<>();
    private final Set<String> archivedSlugs = new HashSet<>();

    private static final Pattern VALID_SLUG = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");

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

    public synchronized MeetingType create(CreateMeetingTypeRequest request) {
        if (request == null) {
            throw invalidField("body", "required", "Данные типа встречи обязательны.");
        }
        validateMeetingType(
                request.slug(),
                request.title(),
                request.description(),
                request.durationMinutes());
        if (activeTypes.containsKey(request.slug()) || archivedSlugs.contains(request.slug())) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "meeting_type_conflict",
                    "Тип встречи с таким slug уже существует.",
                    List.of());
        }
        MeetingType meetingType = new MeetingType(
                request.slug(),
                request.title().trim(),
                request.description().trim(),
                request.durationMinutes());
        activeTypes.put(meetingType.slug(), meetingType);
        return meetingType;
    }

    public synchronized MeetingType update(String slug, UpdateMeetingTypeRequest request) {
        MeetingType current = findActive(slug).orElseThrow(this::notFound);
        if (request == null) {
            throw invalidField("body", "required", "Данные типа встречи обязательны.");
        }
        validateMeetingType(
                slug,
                request.title(),
                request.description(),
                request.durationMinutes());
        MeetingType updated = new MeetingType(
                current.slug(),
                request.title().trim(),
                request.description().trim(),
                request.durationMinutes());
        activeTypes.put(slug, updated);
        return updated;
    }

    public synchronized void archive(String slug) {
        if (activeTypes.remove(slug) == null) {
            throw notFound();
        }
        archivedSlugs.add(slug);
    }

    private void validateMeetingType(
            String slug,
            String title,
            String description,
            Integer durationMinutes) {
        List<ApiFieldError> errors = new ArrayList<>();
        if (slug == null || !VALID_SLUG.matcher(slug).matches()) {
            errors.add(new ApiFieldError(
                    "slug",
                    "invalid_slug",
                    "Используйте строчные латинские буквы, цифры и дефисы; дефис не может стоять в начале или конце."));
        }
        if (title == null || title.isBlank()) {
            errors.add(new ApiFieldError("title", "required", "Укажите название типа встречи."));
        }
        if (description == null || description.isBlank()) {
            errors.add(new ApiFieldError(
                    "description", "required", "Укажите описание типа встречи."));
        }
        if (durationMinutes == null
                || !List.of(15, 30, 60).contains(durationMinutes)) {
            errors.add(new ApiFieldError(
                    "durationMinutes",
                    "invalid_duration",
                    "Длительность должна составлять 15, 30 или 60 минут."));
        }
        if (!errors.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "validation_error",
                    "Некорректные данные запроса.",
                    errors);
        }
    }

    private ApiException notFound() {
        return new ApiException(
                HttpStatus.NOT_FOUND,
                "meeting_type_not_found",
                "Тип встречи не найден.",
                List.of());
    }

    private ApiException invalidField(String field, String code, String message) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "validation_error",
                "Некорректные данные запроса.",
                List.of(new ApiFieldError(field, code, message)));
    }

    private void add(MeetingType meetingType) {
        activeTypes.put(meetingType.slug(), meetingType);
    }
}
