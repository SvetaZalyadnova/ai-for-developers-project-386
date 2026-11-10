package ru.hexlet.calendar.api;

import java.time.LocalDate;
import java.util.List;

public record AvailabilityDate(LocalDate date, List<AvailabilitySlot> slots) {
}
