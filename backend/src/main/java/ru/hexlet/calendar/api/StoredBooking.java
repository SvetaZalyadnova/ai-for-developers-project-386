package ru.hexlet.calendar.api;

import java.time.Instant;
import java.time.OffsetDateTime;

public record StoredBooking(
        String id,
        String guestName,
        String guestEmail,
        MeetingTypeSnapshot meetingType,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        Instant createdAt) {
}
