package ru.hexlet.calendar.api;

import java.util.List;

public record AvailabilityResponse(List<AvailabilityDate> dates) {
}
