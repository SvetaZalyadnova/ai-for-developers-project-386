package ru.hexlet.calendar.api;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner")
@CrossOrigin(origins = "*")
public class OwnerController {

    private final MeetingTypeCatalog meetingTypeCatalog;
    private final BookingCalendar bookingCalendar;

    public OwnerController(
            MeetingTypeCatalog meetingTypeCatalog,
            BookingCalendar bookingCalendar) {
        this.meetingTypeCatalog = meetingTypeCatalog;
        this.bookingCalendar = bookingCalendar;
    }

    @GetMapping("/meeting-types")
    public MeetingTypesResponse listMeetingTypes() {
        return new MeetingTypesResponse(meetingTypeCatalog.activeTypes());
    }

    @PostMapping("/meeting-types")
    public ResponseEntity<MeetingType> createMeetingType(
            @RequestBody CreateMeetingTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(meetingTypeCatalog.create(request));
    }

    @PatchMapping("/meeting-types/{slug}")
    public MeetingType updateMeetingType(
            @PathVariable String slug,
            @RequestBody UpdateMeetingTypeRequest request) {
        return meetingTypeCatalog.update(slug, request);
    }

    @PostMapping("/meeting-types/{slug}/archive")
    public ResponseEntity<Void> archiveMeetingType(@PathVariable String slug) {
        meetingTypeCatalog.archive(slug);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookings")
    public OwnerBookingsResponse listBookings() {
        List<OwnerBooking> bookings = bookingCalendar.futureBookings().stream()
                .map(booking -> new OwnerBooking(
                        new GuestInput(booking.guestName(), booking.guestEmail()),
                        booking.meetingType(),
                        booking.startsAt(),
                        booking.endsAt()))
                .toList();
        return new OwnerBookingsResponse(bookings);
    }
}
