import { google } from 'googleapis';

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

export async function getAvailableSlots(
  tokens: any,
  date: string,
  durationMinutes: number
) {
  const auth = getOAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  // Set up time range for the requested day
  const [year, month, day] = date.split('-').map(Number);
  const startOfDay = new Date(year, month - 1, day, 8, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 20, 0, 0);

  // Get busy times
  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  const busySlots = freeBusy.data.calendars?.primary?.busy || [];

  // Find free slots
  const freeSlots: string[] = [];
  let current = new Date(startOfDay);

  while (current.getTime() + durationMinutes * 60000 <= endOfDay.getTime()) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);

    const isConflict = busySlots.some((busy) => {
      const busyStart = new Date(busy.start!);
      const busyEnd = new Date(busy.end!);
      return current < busyEnd && slotEnd > busyStart;
    });

    if (!isConflict) {
      freeSlots.push(
        current.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    }

    // Move forward 30 min
    current = new Date(current.getTime() + 30 * 60000);
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

  const [hourStr, minuteStr] = time.replace(/(AM|PM)/, '').trim().split(':');
  let hour = parseInt(hourStr);
  const minute = parseInt(minuteStr || '0');
  if (time.includes('PM') && hour !== 12) hour += 12;
  if (time.includes('AM') && hour === 12) hour = 0;

  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(year, month - 1, day, hour, minute, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  return event.data;
}