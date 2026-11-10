package ru.hexlet.calendar.api;

import java.util.List;

public record OwnerBookingsResponse(List<OwnerBooking> items) {
}
