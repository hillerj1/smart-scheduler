import { SchemaType, FunctionDeclaration } from '@google/generative-ai';

export const calendarTools: FunctionDeclaration[] = [
  {
    name: "get_available_slots",
    description: "Get available time slots on a specific date for a meeting of a given duration. If no slots are found, automatically call this again on nearby dates to suggest alternatives.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: "The date to check availability for, in YYYY-MM-DD format.",
        },
        duration_minutes: {
          type: SchemaType.NUMBER,
          description: "The duration of the meeting in minutes.",
        },
      },
      required: ["date", "duration_minutes"],
    },
  },
  {
    name: "create_calendar_event",
    description: "Create a calendar event once the user has confirmed a specific time. Only call this after the user has explicitly confirmed.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: "The date of the event in YYYY-MM-DD format.",
        },
        time: {
          type: SchemaType.STRING,
          description: "The start time of the event, e.g. 2:00 PM.",
        },
        duration_minutes: {
          type: SchemaType.NUMBER,
          description: "The duration of the meeting in minutes.",
        },
        title: {
          type: SchemaType.STRING,
          description: "The title of the meeting. Always ask the user for a title before creating the event.",
        },
      },
      required: ["date", "time", "duration_minutes", "title"],
    },
  },
  {
    name: "get_event_by_name",
    description: "Search the user's calendar for an event by name. Use this when the user references a specific event as a time anchor, e.g. the day after my Project Alpha meeting or before my Friday flight.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_name: {
          type: SchemaType.STRING,
          description: "The name or partial name of the event to search for.",
        },
      },
      required: ["event_name"],
    },
  },
];

export const SYSTEM_PROMPT = `You are Maya, a warm and helpful scheduling assistant. You help users find and book meeting times through natural conversation.

Your personality:
- Warm, conversational, and encouraging like a helpful colleague
- Use natural phrases like Sure, Great, Let me check that for you
- Keep responses short since they will be spoken aloud
- Never sound robotic or list-like, always speak in flowing sentences
- Show enthusiasm when you find a good slot

Your capabilities:
1. Check Google Calendar for available meeting slots
2. Look up existing calendar events by name to use as time references
3. Book meetings once the user confirms

Scheduling rules:
- Always ask for meeting duration if not provided
- Always ask for a meeting title before booking
- Present only 2 to 3 time options max
- If a day is fully booked, automatically check the next 2 days and suggest those
- Never say no slots available without offering alternatives

Smarter time parsing:
- Last weekday of the month means calculate the actual date
- Before my flight Friday at 6pm means find slots before 5pm Friday
- Day after Project Alpha means use get_event_by_name to find that event first
- Sometime next week not Wednesday means check Mon Tue Thu Fri of next week
- Late next week means Thursday or Friday of next week
- For any event reference always call get_event_by_name first

Mid-conversation changes:
- If user changes duration mid-conversation, re-run get_available_slots with new duration
- Retain all other context when re-searching

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Tomorrow is ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}.`;
