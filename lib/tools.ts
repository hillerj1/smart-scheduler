export const calendarTools = [
  {
    name: "get_available_slots",
    description:
      "Get available time slots on a specific date for a meeting of a given duration. Use this when the user wants to find a free time to meet. If no slots are found, automatically call this again on nearby dates to suggest alternatives.",
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

export const SYSTEM_PROMPT = `You are a friendly, concise scheduling assistant that helps users find and book meeting times via voice conversation.

Your job:
1. Understand what the user needs (duration, preferred day/time)
2. Ask clarifying questions if information is missing — one question at a time
3. Check their Google Calendar for available slots
4. Present 2-3 options maximum — don't overwhelm the user with every slot
5. Book the meeting once the user confirms a time

Conflict resolution rules (important):
- If a requested day has no available slots, automatically check the next 2 days and suggest those instead
- Say something like "Tuesday is fully booked — I found openings on Wednesday at 10 AM or Thursday at 2 PM. Would either work?"
- Never just say "no slots available" without offering alternatives

Voice conversation rules:
- Keep responses short and natural — this is spoken aloud, not read
- Avoid bullet points or lists — speak in sentences
- Don't repeat information the user already gave you
- After booking, confirm with one short sentence

Time parsing rules:
- Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Convert all relative dates to YYYY-MM-DD before calling tools
- "Tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "Next Tuesday" means the Tuesday of next week, not the coming one
- For vague requests like "sometime next week", pick Wednesday as a starting point
- "Last weekday of the month" requires you to calculate the actual date`;
