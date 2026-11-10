import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Booking Calendar API" })
@server("http://localhost:8080", "Local server")
namespace BookingCalendar;

model BearerAuth {
  @doc("HTTP authentication")
  type: "http";
  @doc("Bearer authentication scheme")
  scheme: "Bearer";
}

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

model CreateMeetingTypeRequest {
  slug: string;
  title: string;
  description: string;
  durationMinutes: int32;
}

model UpdateMeetingTypeRequest {
  title: string;
  description: string;
  durationMinutes: int32;
}

model CreatedMeetingTypeResponse {
  @statusCode statusCode: 201;
  @body body: MeetingType;
}

model NoContentResponse {
  @statusCode statusCode: 204;
}

model UnauthorizedResponse {
  @statusCode statusCode: 401;
  @header("WWW-Authenticate") wwwAuthenticate: string;
  @body body: ProblemDetails;
}

model OwnerBooking {
  guest: GuestInput;
  meetingType: MeetingTypeSnapshot;
  startsAt: offsetDateTime;
  endsAt: offsetDateTime;
}

model OwnerBookingsResponse {
  items: OwnerBooking[];
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

@route("/api/v1/owner/meeting-types")
@get
@useAuth(BearerAuth)
op listOwnerMeetingTypes(): MeetingTypesResponse | UnauthorizedResponse;

@route("/api/v1/owner/meeting-types")
@post
@useAuth(BearerAuth)
op createMeetingType(
  @body body: CreateMeetingTypeRequest,
): CreatedMeetingTypeResponse | BadRequestResponse | ConflictResponse | UnauthorizedResponse;

@route("/api/v1/owner/meeting-types/{slug}")
@patch
@useAuth(BearerAuth)
op updateMeetingType(
  @path slug: string,
  @body body: UpdateMeetingTypeRequest,
): MeetingType | BadRequestResponse | NotFoundResponse | UnauthorizedResponse;

@route("/api/v1/owner/meeting-types/{slug}/archive")
@post
@useAuth(BearerAuth)
op archiveMeetingType(
  @path slug: string,
): NoContentResponse | NotFoundResponse | UnauthorizedResponse;

@route("/api/v1/owner/bookings")
@get
@useAuth(BearerAuth)
op listOwnerBookings(): OwnerBookingsResponse | UnauthorizedResponse;
