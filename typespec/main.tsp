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

@route("/api/v1/meeting-types")
@get
op listMeetingTypes(): MeetingTypesResponse;
