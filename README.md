# Smart Scheduler AI Agent

A voice-enabled AI scheduling assistant that helps users find and book meetings through natural conversation. Built for the NextDimension take-home assignment.

**Live Demo:** https://smart-scheduler-rust.vercel.app

## What it does

- Understands natural language scheduling requests via voice or text
- Checks your Google Calendar for available slots in real time
- Handles complex time references like "last weekday of the month" or "the day after my Project Alpha meeting"
- Suggests alternative times when requested slots are fully booked
- Books meetings directly to your Google Calendar with a title of your choice

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| LLM | Gemini 2.5 Flash | Function calling support, generous free tier |
| STT | Web Speech API (browser-native) | Zero latency, no extra service needed |
| TTS | Web Speech Synthesis API | Instant response, works across devices |
| Calendar | Google Calendar API v3 | Direct integration with OAuth2 |
| Backend | Next.js API Routes | Easy Vercel deployment, TypeScript support |
| Deploy | Vercel | Seamless GitHub integration |

## How it works

The agent uses a three-layer architecture:

1. **Voice layer** — Browser's built-in Speech Recognition captures user audio and converts it to text instantly. Responses are spoken back using Speech Synthesis.

2. **Gemini layer** — Each message is sent to Gemini 2.5 Flash with a system prompt defining the assistant's personality (Maya) and scheduling rules. Gemini decides when to call calendar tools vs when to ask clarifying questions.

3. **Calendar layer** — Three tools are available to Gemini:
   - `get_available_slots` — queries free/busy times for a given date and duration
   - `create_calendar_event` — books a confirmed meeting
   - `get_event_by_name` — looks up an existing event by name, enabling relative scheduling like "the day after my dentist appointment"

## Design Choices

**Browser-native voice over external TTS/STT services**
Using the Web Speech API instead of Google Cloud TTS or OpenAI Realtime keeps latency low for STT (instant, local processing) and avoids extra API costs. The tradeoff is slightly less natural-sounding TTS, but response time is well under 800ms.

**Timezone handling**
Vercel servers run in UTC. To avoid timezone bugs, all datetime strings are constructed manually as local time strings (e.g. `2026-05-27T09:00:00`) and passed to Google Calendar with an explicit `timeZone: 'America/New_York'` field, rather than using `.toISOString()` which converts to UTC.

**Conflict resolution via prompt engineering**
Rather than building complex fallback logic in code, the system prompt instructs Gemini to automatically call `get_available_slots` on adjacent days when a requested day is fully booked. This keeps the backend simple while giving Gemini flexibility to handle edge cases naturally.

**Stateful conversation via message history**
The full conversation history is sent with every request to Gemini, enabling context retention across turns (e.g. remembering meeting duration when the user changes their mind mid-conversation).

## Setup Instructions

### Prerequisites
- Node.js 18+
- A Google account
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/hillerj1/smart-scheduler.git
cd smart-scheduler
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Google Cloud
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google Calendar API**
4. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
5. Set application type to **Web Application**
6. Add `http://localhost:3000/api/auth/callback` as an authorized redirect URI
7. Copy your **Client ID** and **Client Secret**

### 4. Get a Gemini API key
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key → Create API Key**
3. Copy the key

### 5. Configure environment variables
Create a `.env.local` file in the root:
- GEMINI_API_KEY=your_gemini_key
- GOOGLE_CLIENT_ID=your_oauth_client_id
- GOOGLE_CLIENT_SECRET=your_oauth_client_secret
- GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

### 6. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Connect Google Calendar** to authenticate.

### 7. Deploy to Vercel
1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add your environment variables in Vercel settings
4. Update `GOOGLE_REDIRECT_URI` to your Vercel URL
5. Add the Vercel callback URL to your Google OAuth authorized redirect URIs

## Example Conversations

**Basic scheduling:**
> "I need to schedule a 1 hour meeting for Tuesday afternoon"

**Conflict resolution:**
> "Find me a slot on Wednesday" → if fully booked → "Wednesday is full, but I have openings Thursday at 2 PM or Friday at 10 AM"

**Complex time parsing:**
> "Schedule something for the last weekday of this month"
> "Find a time the day after my Project Alpha meeting"
> "I need 30 minutes before my 3 PM call on Friday"

**Mid-conversation changes:**
> "Find a 30 minute slot tomorrow" → "Actually make it an hour, do those times still work?"

## Architecture

    +------------------------------------------------------------------+
    |                        CLIENT (Browser)                          |
    |                                                                  |
    |   +------------------+          +---------------------------+   |
    |   |  Web Speech API  |          |   React UI (Next.js)      |   |
    |   |  (STT / TTS)     |<-------->|   page.tsx                |   |
    |   |  Browser-native  |          |   Hold mic to speak       |   |
    |   +------------------+          +-------------+-------------+   |
    |                                               |                  |
    |                                    POST /api/chat                |
    +-----------------------------------------------+------------------+
                                                    |
                                                    v
    +------------------------------------------------------------------+
    |                   SERVER (Vercel / Next.js)                      |
    |                                                                  |
    |   +------------------------------------------------------------+ |
    |   |                  /api/chat/route.ts                        | |
    |   |                                                            | |
    |   |  1. Receive message + conversation history                 | |
    |   |  2. Send to Gemini with tools + system prompt              | |
    |   |  3. Execute tool calls if Gemini requests them             | |
    |   |  4. Return final text response                             | |
    |   +--------------------+---------------------+-----------------+ |
    |                        |                     |                   |
    |                        v                     v                   |
    |   +------------------------+   +---------------------------+    |
    |   |   Gemini 2.5 Flash     |   |    lib/calendar.ts        |    |
    |   |   (Google AI)          |   |                           |    |
    |   |                        |   |  getAvailableSlots()      |    |
    |   |  - Natural language    |   |  createEvent()            |    |
    |   |  - Decides tool calls  |   |  getEventByName()         |    |
    |   |  - Generates responses |   +-------------+-------------+    |
    |   +------------------------+                 |                   |
    |                                              v                   |
    |                              +---------------------------+       |
    |                              |  Google Calendar API v3   |       |
    |                              |  OAuth2                   |       |
    |                              |                           |       |
    |                              |  - Query free/busy        |       |
    |                              |  - Create events          |       |
    |                              |  - Search by name         |       |
    |                              +---------------------------+       |
    +------------------------------------------------------------------+

### Component Breakdown

**Client Layer**
The browser handles all voice I/O using the built-in Web Speech API. Speech recognition runs locally for near-zero STT latency. The React UI manages conversation state and renders the chat interface.

**API Layer**
The core orchestration layer. Receives the full conversation history on every request, passes it to Gemini with tool definitions, and executes any tool calls Gemini requests before returning the final response.

**Gemini 2.5 Flash**
The reasoning engine. Decides when to ask clarifying questions, when to call calendar tools, and how to handle edge cases like conflict resolution and complex time parsing.

**Calendar Layer**
Three focused functions talking to Google Calendar API v3 over OAuth2. getAvailableSlots queries free/busy times, createEvent books confirmed meetings with explicit timezone handling, and getEventByName searches by event name for relative scheduling.

**Authentication**
OAuth2 flow via Google. Tokens are stored in an HTTP-only cookie and passed server-side on each calendar request.
