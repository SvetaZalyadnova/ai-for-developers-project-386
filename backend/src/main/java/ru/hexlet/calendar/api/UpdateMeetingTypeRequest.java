package ru.hexlet.calendar.api;

public record UpdateMeetingTypeRequest(
        String title,
        String description,
        Integer durationMinutes) {
}
