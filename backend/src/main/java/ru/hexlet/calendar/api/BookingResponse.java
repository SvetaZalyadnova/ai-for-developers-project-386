package ru.hexlet.calendar.api;

import java.time.OffsetDateTime;

public record BookingResponse(
        String id,
        MeetingTypeSnapshot meetingType,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt) {
}
