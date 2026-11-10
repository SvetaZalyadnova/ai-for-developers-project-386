package ru.hexlet.calendar.api;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class BookingCalendar {

    private static final ZoneId CALENDAR_ZONE = ZoneId.of("Europe/Moscow");
    private static final int WORK_START_MINUTE = 9 * 60;
    private static final int WORK_END_MINUTE = 18 * 60;
    private static final int SLOT_INCREMENT_MINUTES = 15;
    private static final int BOOKING_WINDOW_DAYS = 14;
    private static final int MINIMUM_NOTICE_MINUTES = 15;

    private final MeetingTypeCatalog meetingTypeCatalog;
    private final Clock clock;
    private final List<StoredBooking> bookings = new ArrayList<>();

    public BookingCalendar(MeetingTypeCatalog meetingTypeCatalog, Clock clock) {
        this.meetingTypeCatalog = meetingTypeCatalog;
        this.clock = clock;
    }

    public synchronized AvailabilityResponse availability(
            String slug,
            LocalDate from,
            LocalDate to) {
        MeetingType meetingType = findMeetingType(slug);
        validateRange(from, to);

        List<AvailabilityDate> dates = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            List<AvailabilitySlot> slots = slotsFor(date, meetingType);
            if (!slots.isEmpty()) {
                dates.add(new AvailabilityDate(date, slots));
            }
        }
        return new AvailabilityResponse(dates);
    }

    public synchronized BookingResponse createBooking(CreateBookingRequest request) {
        if (request == null) {
            throw badRequest("body", "required", "Данные бронирования обязательны.");
        }
        MeetingType meetingType = findMeetingType(request.meetingTypeSlug());
        validateGuest(request.guest());

        OffsetDateTime requestedStart;
        try {
            requestedStart = OffsetDateTime.parse(request.startsAt());
        } catch (DateTimeParseException | NullPointerException exception) {
            throw badRequest("startsAt", "invalid_datetime",
                    "Укажите время начала в формате RFC3339 с часовым поясом.");
        }

        Instant startInstant = requestedStart.toInstant();
        ZonedDateTime localStart = startInstant.atZone(CALENDAR_ZONE);
        LocalDate date = localStart.toLocalDate();
        validateRange(date, date);
        AvailabilitySlot availableSlot = candidateSlots(date, meetingType).stream()
                .filter(slot -> slot.startsAt().toInstant().equals(startInstant))
                .findFirst()
                .orElseThrow(() -> badRequest("startsAt", "unavailable",
                        "Выбранное время недоступно. Выберите другой слот."));

        Instant endInstant = availableSlot.endsAt().toInstant();
        boolean overlaps = bookings.stream().anyMatch(booking ->
                startInstant.isBefore(booking.endsAt().toInstant())
                        && booking.startsAt().toInstant().isBefore(endInstant));
        if (overlaps) {
            throw new ApiException(HttpStatus.CONFLICT, "booking_conflict",
                    "Это время уже занято. Выберите другое", List.of());
        }

        MeetingTypeSnapshot snapshot = new MeetingTypeSnapshot(
                meetingType.slug(), meetingType.title(), meetingType.durationMinutes());
        StoredBooking booking = new StoredBooking(
                UUID.randomUUID().toString(),
                request.guest().name().trim(),
                request.guest().email().trim(),
                snapshot,
                availableSlot.startsAt(),
                availableSlot.endsAt(),
                clock.instant());
        bookings.add(booking);
        return new BookingResponse(
                booking.id(), snapshot, booking.startsAt(), booking.endsAt());
    }

    public synchronized List<StoredBooking> futureBookings() {
        Instant now = clock.instant();
        return bookings.stream()
                .filter(booking -> booking.startsAt().toInstant().isAfter(now))
                .sorted(Comparator.comparing(booking -> booking.startsAt().toInstant()))
                .toList();
    }

    private MeetingType findMeetingType(String slug) {
        return meetingTypeCatalog.findActive(slug)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "meeting_type_not_found",
                        "Тип встречи не найден.",
                        List.of()));
    }

    private void validateRange(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(clock.withZone(CALENDAR_ZONE));
        LocalDate lastDate = today.plusDays(BOOKING_WINDOW_DAYS - 1);
        if (from == null || to == null || from.isAfter(to)
                || from.isBefore(today) || to.isAfter(lastDate)) {
            throw badRequest("from", "invalid_date_range",
                    "Выберите диапазон дат внутри ближайших 14 календарных дней.");
        }
    }

    private List<AvailabilitySlot> slotsFor(LocalDate date, MeetingType meetingType) {
        return candidateSlots(date, meetingType).stream()
                .filter(slot -> !hasConflict(slot.startsAt().toInstant(), slot.endsAt().toInstant()))
                .toList();
    }

    private List<AvailabilitySlot> candidateSlots(LocalDate date, MeetingType meetingType) {
        if (date.getDayOfWeek().getValue() > 5) {
            return List.of();
        }

        Instant earliestStart = clock.instant().plus(MINIMUM_NOTICE_MINUTES, ChronoUnit.MINUTES);
        List<AvailabilitySlot> slots = new ArrayList<>();
        for (int minute = WORK_START_MINUTE;
                minute + meetingType.durationMinutes() <= WORK_END_MINUTE;
                minute += SLOT_INCREMENT_MINUTES) {
            LocalDateTime localStart = date.atTime(minute / 60, minute % 60);
            List<ZoneOffset> offsets = CALENDAR_ZONE.getRules().getValidOffsets(localStart);
            if (offsets.isEmpty()) {
                continue;
            }

            Instant start = localStart.toInstant(offsets.get(0));
            Instant end = start.plus(meetingType.durationMinutes(), ChronoUnit.MINUTES);
            if (start.isBefore(earliestStart)) {
                continue;
            }
            slots.add(new AvailabilitySlot(
                    start.atZone(CALENDAR_ZONE).toOffsetDateTime(),
                    end.atZone(CALENDAR_ZONE).toOffsetDateTime()));
        }
        return slots;
    }

    private boolean hasConflict(Instant start, Instant end) {
        return bookings.stream().anyMatch(booking ->
                start.isBefore(booking.endsAt().toInstant())
                        && booking.startsAt().toInstant().isBefore(end));
    }

    private void validateGuest(GuestInput guest) {
        if (guest == null) {
            throw badRequest("guest", "required", "Укажите имя и email.");
        }
        List<ApiFieldError> errors = new ArrayList<>();
        if (guest.name() == null || guest.name().isBlank()) {
            errors.add(new ApiFieldError("guest.name", "required", "Укажите имя."));
        }
        String email = guest.email();
        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            errors.add(new ApiFieldError(
                    "guest.email", "invalid_email", "Укажите корректный адрес электронной почты."));
        }
        if (!errors.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "validation_error",
                    "Некорректные данные запроса.",
                    errors);
        }
    }

    private ApiException badRequest(String field, String code, String message) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "validation_error",
                "Некорректные данные запроса.",
                List.of(new ApiFieldError(field, code, message)));
    }
}
