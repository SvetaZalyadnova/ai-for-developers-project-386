package ru.hexlet.calendar.api;

public record MeetingType(String slug, String title, String description, int durationMinutes) {
}
