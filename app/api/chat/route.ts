import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, createEvent } from '@/lib/calendar';
import { calendarTools, SYSTEM_PROMPT } from '@/lib/tools';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const tokensCookie = request.cookies.get('google_tokens');
    if (!tokensCookie) {
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
    }
    const tokens = JSON.parse(tokensCookie.value);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: calendarTools }],
    });

    const allMessages = messages.slice(0, -1)
    .filter((msg: any) => msg.content && msg.content.trim() !== '')
    .map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
  const firstUserIndex = allMessages.findIndex((m: any) => m.role === 'user');
  const history = firstUserIndex >= 0 ? allMessages.slice(firstUserIndex) : [];

    const chat = model.startChat({ history });

    const lastMessage = messages[messages.length - 1].content;
    let result = await chat.sendMessage(lastMessage);
    let response = result.response;

    while (response.functionCalls()?.length) {
      const functionCall = response.functionCalls()![0];
      const { name, args } = functionCall;

      let toolResult;

      if (name === 'get_available_slots') {
        const slots = await getAvailableSlots(
          tokens,
          args.date as string,
          args.duration_minutes as number
        );
        toolResult = slots.length > 0
          ? `Available slots: ${slots.join(', ')}`
          : `No available slots found on ${args.date}`;
      } else if (name === 'create_calendar_event') {
        const event = await createEvent(
          tokens,
          args.date as string,
          args.time as string,
          args.duration_minutes as number,
          (args.title as string) || 'Meeting'
        );
        toolResult = `Successfully created event: ${event.summary} on ${event.start?.dateTime}`;
      } else {
        toolResult = 'Unknown tool';
      }

      result = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { result: toolResult },
          },
        },
      ]);
      response = result.response;
    }

    const text = response.text();
    return NextResponse.json({ message: text });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
