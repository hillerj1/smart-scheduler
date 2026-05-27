export const calendarTools = [
    {
      name: "get_available_slots",
      description:
        "Get available time slots on a specific date for a meeting of a given duration. Use this when the user wants to find a free time to meet.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description:
              "The date to check availability for, in YYYY-MM-DD format. Convert relative dates like 'tomorrow' or 'next Tuesday' to this format based on today's date.",
          },
          duration_minutes: {
            type: "number",
            description:
              "The duration of the meeting in minutes. Convert hours to minutes (e.g. 1 hour = 60 minutes).",
          },
        },
        required: ["date", "duration_minutes"],
      },
    },
    {
      name: "create_calendar_event",
      description:
        "Create a calendar event once the user has confirmed a specific time. Only call this after the user has explicitly confirmed the time they want.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date of the event in YYYY-MM-DD format.",
          },
          time: {
            type: "string",
            description: "The start time of the event, e.g. '2:00 PM'.",
          },
          duration_minutes: {
            type: "number",
            description: "The duration of the meeting in minutes.",
          },
          title: {
            type: "string",
            description:
              "The title of the meeting. Ask the user if not provided, default to 'Meeting'.",
          },
        },
        required: ["date", "time", "duration_minutes"],
      },
    },
  ];
  
  export const SYSTEM_PROMPT = `You are a helpful scheduling assistant that helps users find and book meeting times.
  
  Your job is to:
  1. Understand what the user needs (meeting duration, preferred day/time)
  2. Ask clarifying questions if information is missing
  3. Check their Google Calendar for available slots
  4. Present options clearly and conversationally
  5. Book the meeting once the user confirms a time
  
  Guidelines:
  - Always confirm the meeting duration before checking availability
  - If a requested time is fully booked, proactively suggest alternative days/times
  - Keep responses concise and natural — this is a voice conversation
  - Once a time is confirmed, create the event and confirm it back to the user
  - Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  - Convert all relative dates (tomorrow, next Tuesday, etc.) to exact dates before calling tools`;