package ru.hexlet.calendar.api;

public record CreateBookingRequest(String meetingTypeSlug, String startsAt, GuestInput guest) {
}
