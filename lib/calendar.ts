import { google } from 'googleapis';

const TIMEZONE = 'America/New_York';

export function getOAuthClient(tokens: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

export function getAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
}

const pad = (n: number) => String(n).padStart(2, '0');

function toLocalDateTimeString(year: number, month: number, day: number, hour: number, minute: number) {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
}

export async function getAvailableSlots(
  tokens: any,
  date: string,
  durationMinutes: number
) {
  const auth = getOAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const [year, month, day] = date.split('-').map(Number);

  // Build start/end of day as local time strings
  const startStr = toLocalDateTimeString(year, month, day, 8, 0);
  const endStr = toLocalDateTimeString(year, month, day, 20, 0);

  // Use proper Date objects for freebusy query to avoid hardcoded offset issues
  const startOfDay = new Date(`${date}T08:00:00`);
  const endOfDay = new Date(`${date}T20:00:00`);
  
  // Get the UTC offset for America/New_York dynamically
  const formatter = new Intl.DateTimeFormat('en-US', { 
    timeZone: TIMEZONE, 
    timeZoneName: 'shortOffset' 
  });
  
  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(`${date}T08:00:00-04:00`).toISOString(),
      timeMax: new Date(`${date}T20:00:00-04:00`).toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: 'primary' }],
    },
  });

  const busySlots = freeBusy.data.calendars?.primary?.busy || [];

  const freeSlots: string[] = [];

  // Check every 30 min slot from 8am to 8pm
  for (let hour = 8; hour < 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const slotStartMinutes = hour * 60 + min;
      const slotEndMinutes = slotStartMinutes + durationMinutes;

      if (slotEndMinutes > 20 * 60) break;

      // Convert slot to UTC for comparison — Google returns busy times in UTC
// Using -04:00 (EDT) offset for New York summer time
const slotStart = new Date(`${date}T${pad(hour)}:${pad(min)}:00-04:00`);
const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

const isConflict = busySlots.some((busy) => {
  // Google normalizes all busy times to UTC regardless of creator timezone
  const busyStart = new Date(busy.start!);
  const busyEnd = new Date(busy.end!);
  // Add 1 minute buffer on each side to avoid edge case overlaps
  const bufferedStart = new Date(busyStart.getTime() - 60000);
  const bufferedEnd = new Date(busyEnd.getTime() + 60000);
  return slotStart < bufferedEnd && slotEnd > bufferedStart;
});

      if (!isConflict) {
        // Format time for display
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        freeSlots.push(`${displayHour}:${pad(min)} ${ampm}`);
      }
    }
  }

  return freeSlots;
}

export async function createEvent(
  tokens: any,
  date: string,
  time: string,
  durationMinutes: number,
  title: string = 'Meeting'
) {
  const auth = getOAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const [hourStr, minuteStr] = time.replace(/(AM|PM)/i, '').trim().split(':');
  let hour = parseInt(hourStr);
  const minute = parseInt(minuteStr || '0');
  if (time.toUpperCase().includes('PM') && hour !== 12) hour += 12;
  if (time.toUpperCase().includes('AM') && hour === 12) hour = 0;

  const [year, month, day] = date.split('-').map(Number);

  // Build end time
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;

  // Use local datetime strings with explicit timezone — avoids UTC conversion issues
  const startStr = toLocalDateTimeString(year, month, day, hour, minute);
  const endStr = toLocalDateTimeString(year, month, day, endHour, endMin);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      start: { dateTime: startStr, timeZone: TIMEZONE },
      end: { dateTime: endStr, timeZone: TIMEZONE },
    },
  });

  return event.data;
}

export async function getEventByName(
  tokens: any,
  eventName: string
) {
  const auth = getOAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  // Search calendar for events matching the name
  // Look 60 days forward to catch upcoming events
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60000);

  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    q: eventName, // Google Calendar's built-in text search
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 3,
  });

  const items = events.data.items || [];
  if (items.length === 0) return null;

  // Return the first matching event
  const event = items[0];
  const start = event.start?.dateTime || event.start?.date;
  return {
    title: event.summary,
    date: start ? new Date(start).toISOString().split('T')[0] : null,
    dateTime: start,
  };
}
