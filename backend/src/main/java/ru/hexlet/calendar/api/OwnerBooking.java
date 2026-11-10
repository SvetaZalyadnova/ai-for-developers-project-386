package ru.hexlet.calendar.api;

import java.time.OffsetDateTime;

public record OwnerBooking(
        GuestInput guest,
        MeetingTypeSnapshot meetingType,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt) {
}
