'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your scheduling assistant. I can help you find and book a meeting time. What would you like to schedule?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Using browser's built-in Speech API for low latency — no external service needed
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const hasTokens = cookies.some((c) => c.trim().startsWith('google_tokens='));
    setIsAuthenticated(hasTokens);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak assistant responses aloud using browser TTS
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick the best available voice — prefer natural-sounding English voices
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.name.includes('Google US English')) ||
      voices.find(v => v.name.includes('Karen')) ||
      voices.find(v => v.lang === 'en-US' && v.localService) ||
      voices.find(v => v.lang === 'en-US');
    
    if (preferred) utterance.voice = preferred;
    
    // Slightly slower and lower pitch sounds more natural than default
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (data.error === 'Not authenticated with Google') {
        setIsAuthenticated(false);
        const msg = 'Please connect your Google Calendar first!';
        setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
        speak(msg);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        // Speak the response for a natural voice conversation feel
        speak(data.message);
      }
    } catch (error) {
      const msg = 'Sorry, something went wrong. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
      speak(msg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, speak]);

  // Initialize speech recognition — browser-native for minimal latency
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    // Stop TTS if user starts speaking
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto-send after speech recognition completes
      sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [sendMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold">Smart Scheduler</h1>
        {!isAuthenticated ? (
          <a href="/api/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
            Connect Google Calendar
          </a>
        ) : (
          <span className="text-green-400 text-sm">✓ Calendar Connected</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 px-4 py-3 rounded-2xl text-sm">Thinking...</div>
          </div>
        )}
        {isSpeaking && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-300 px-4 py-3 rounded-2xl text-sm animate-pulse">Speaking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex gap-3 items-center">
          {/* Mic button — hold to talk, release to send */}
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            className={`p-3 rounded-xl transition ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Hold to speak"
          >
            🎤
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isListening ? 'Listening...' : 'Type or hold mic to speak...'}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-5 py-3 rounded-xl text-sm font-medium transition"
          >
            Send
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2 text-center">Hold the mic button to speak • Works best in Chrome</p>
      </div>
    </main>
  );
}
