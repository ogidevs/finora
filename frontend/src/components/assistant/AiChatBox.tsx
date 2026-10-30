import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User as UserIcon } from 'lucide-react';
import { chatWithAssistantApi } from '../../api/assistant';
import { MarkdownView } from './MarkdownView';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provider?: string;
  model?: string;
}

interface AiChatBoxProps {
  currentMonth: number;
  currentYear: number;
}

const QUICK_PROMPTS = [
  'Explain my spending spikes this month',
  'How can I increase my monthly total?',
  'Can I afford a 500 EUR purchase?',
  'How is my savings balance progressing?',
];

export const AiChatBox: React.FC<AiChatBoxProps> = ({ currentMonth, currentYear }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your AI Financial Advisor. I have analyzed your transactions and account balances. How can I help you optimize your finances today?',
      provider: 'assistant',
      model: 'Finora AI',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await chatWithAssistantApi({
        message: trimmed,
        month: currentMonth,
        year: currentYear,
      });

      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.reply,
        provider: res.provider,
        model: res.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Failed to get a response from AI Assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[360px] sm:h-[480px] bg-[#11141D] rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-[#181D2D] border border-white/[0.08] text-slate-200 rounded-bl-none'
                }`}
            >
              {msg.sender === 'assistant' ? (
                <div className="space-y-1">
                  <MarkdownView content={msg.text} />
                  {msg.provider && (
                    <div className="pt-1.5 mt-1 border-t border-white/[0.06] text-[10px] text-slate-500 flex items-center justify-between">
                      <span>{msg.provider === 'ollama' ? 'Local LLaMA 3' : 'Advisor Engine'}</span>
                      <span className="opacity-75">{msg.model}</span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="leading-relaxed">{msg.text}</span>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#181D2D] border border-white/[0.08] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-[#141824] border-t border-white/[0.06] space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-medium whitespace-nowrap px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.06] transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask about spending, savings, or budget..."
            className="flex-1 bg-[#090A0F] border border-white/[0.08] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => handleSendMessage(input)}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
