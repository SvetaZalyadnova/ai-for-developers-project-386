package ru.hexlet.calendar.api;

import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
public class MeetingTypesController {

    private final MeetingTypeCatalog meetingTypeCatalog;
    private final BookingCalendar bookingCalendar;

    public MeetingTypesController(
            MeetingTypeCatalog meetingTypeCatalog,
            BookingCalendar bookingCalendar) {
        this.meetingTypeCatalog = meetingTypeCatalog;
        this.bookingCalendar = bookingCalendar;
    }

    @GetMapping("/api/v1/meeting-types")
    public MeetingTypesResponse listMeetingTypes() {
        return new MeetingTypesResponse(meetingTypeCatalog.activeTypes());
    }

    @GetMapping("/api/v1/meeting-types/{slug}/availability")
    public AvailabilityResponse availability(
            @PathVariable String slug,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return bookingCalendar.availability(slug, from, to);
    }

    @PostMapping("/api/v1/bookings")
    public ResponseEntity<BookingResponse> createBooking(
            @RequestBody CreateBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingCalendar.createBooking(request));
    }
}
