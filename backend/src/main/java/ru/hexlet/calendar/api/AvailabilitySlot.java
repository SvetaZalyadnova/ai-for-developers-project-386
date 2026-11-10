package ru.hexlet.calendar.api;

import java.time.OffsetDateTime;

public record AvailabilitySlot(OffsetDateTime startsAt, OffsetDateTime endsAt) {
}
