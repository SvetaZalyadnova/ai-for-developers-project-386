import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Booking Calendar API" })
@server("http://localhost:8080", "Local server")
namespace BookingCalendar;

model MeetingType {
  slug: string;
  title: string;
  description: string;
  durationMinutes: int32;
}

model MeetingTypesResponse {
  items: MeetingType[];
}

model AvailabilitySlot {
  startsAt: offsetDateTime;
  endsAt: offsetDateTime;
}

model AvailabilityDate {
  date: plainDate;
  slots: AvailabilitySlot[];
}

model AvailabilityResponse {
  dates: AvailabilityDate[];
}

model GuestInput {
  name: string;
  email: string;
}

model CreateBookingRequest {
  meetingTypeSlug: string;
  startsAt: offsetDateTime;
  guest: GuestInput;
}

model MeetingTypeSnapshot {
  slug: string;
  title: string;
  durationMinutes: int32;
}

model BookingResponse {
  id: string;
  meetingType: MeetingTypeSnapshot;
  startsAt: offsetDateTime;
  endsAt: offsetDateTime;
}

model ProblemDetails {
  type: string;
  title: string;
  status: int32;
  detail: string;
  code: string;
  errors?: FieldError[];
}

model FieldError {
  field: string;
  code: string;
  message: string;
}

model BadRequestResponse {
  @statusCode statusCode: 400;
  @body body: ProblemDetails;
}

model NotFoundResponse {
  @statusCode statusCode: 404;
  @body body: ProblemDetails;
}

model ConflictResponse {
  @statusCode statusCode: 409;
  @body body: ProblemDetails;
}

model CreatedBookingResponse {
  @statusCode statusCode: 201;
  @body body: BookingResponse;
}

@route("/api/v1/meeting-types")
@get
op listMeetingTypes(): MeetingTypesResponse;

@route("/api/v1/meeting-types/{slug}/availability")
@get
op getAvailability(
  @path slug: string,
  @query from: plainDate,
  @query to: plainDate,
): AvailabilityResponse | BadRequestResponse | NotFoundResponse;

@route("/api/v1/bookings")
@post
op createBooking(
  @body body: CreateBookingRequest,
): CreatedBookingResponse | BadRequestResponse | NotFoundResponse | ConflictResponse;
