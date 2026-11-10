package ru.hexlet.calendar.api;

public record CreateMeetingTypeRequest(
        String slug,
        String title,
        String description,
        Integer durationMinutes) {
}
