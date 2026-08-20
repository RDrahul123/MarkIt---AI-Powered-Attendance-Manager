import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import type { AIProvider } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const PROVIDERS: { value: AIProvider; label: string; models: string[] }[] = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-3-haiku-20240307", "claude-3-opus-20240229"] },
  { value: "gemini", label: "Google Gemini", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  { value: "ollama", label: "Ollama (Local)", models: ["llama3", "mistral", "codellama"] },
  { value: "custom", label: "Custom Endpoint", models: [] },
];

const PROMPT_TEMPLATES = [
  "Generate attendance report summary",
  "Identify at-risk students",
  "Draft parent notification email",
  "Predict end-term attendance",
];

const API_KEY_STORAGE = "markit-ai-api-key";
const HISTORY_STORAGE = "markit-ai-history";

export default function AIAssistantPage() {
  const { apiFetch } = useApi();
  const { selectedSection, selectedSubject } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [provider, setProvider] = useState<AIProvider>("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || "");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_STORAGE) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE, JSON.stringify(history.slice(0, 50)));
  }, [history]);

  const currentProvider = PROVIDERS.find((p) => p.value === provider);

  useEffect(() => {
    if (currentProvider && currentProvider.models.length > 0) {
      setModel(currentProvider.models[0]);
    }
  }, [provider]);

  const getAttendanceContext = async (): Promise<string> => {
    try {
      if (!selectedSection || !selectedSubject) return "No section/subject selected. ";
      const data = await apiFetch<any[]>(`/api/attendance/summary/${selectedSection}/${selectedSubject}`);
      if (!data || data.length === 0) return "No attendance data available for the selected section/subject. ";
      const summary = data.map((s: any) => `${s.student_name} (${s.roll_no}): ${s.percentage}% attendance, ${s.absent} absences`).join("\n");
      return `Current attendance data for the section:\n${summary}\n\n`;
    } catch {
      return "Could not fetch attendance context. ";
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = await getAttendanceContext();
      const fullPrompt = context + text;

      const response = await apiFetch<any>("/api/ai", {
        method: "POST",
        body: {
          provider,
          model,
          api_key: apiKey,
          api_url: provider === "custom" ? customEndpoint : undefined,
          prompt: fullPrompt,
          section_id: selectedSection,
        },
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: response.response || response.message || "No response received.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setHistory((prev) => [assistantMsg, userMsg, ...prev].slice(0, 50));
    } catch (err: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: `Error: ${err.message || "Failed to get response"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-1">
          <Card title="Configuration">
            <div className="space-y-3">
              <Select
                label="Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIProvider)}
                options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
              />
              {currentProvider && currentProvider.models.length > 0 && (
                <Select
                  label="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  options={currentProvider.models.map((m) => ({ value: m, label: m }))}
                />
              )}
              {provider === "custom" && (
                <Input
                  label="Custom Endpoint"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://api.example.com/chat"
                />
              )}
              <Input
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
              />
            </div>
          </Card>

          <Card title="Prompt Templates">
            <div className="flex flex-wrap gap-2">
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template}
                  onClick={() => sendMessage(template)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {template}
                </button>
              ))}
            </div>
          </Card>

          <Card title="History">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{history.length} past conversations</p>
              <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {history.length > 0 && (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {history.slice(0, 10).map((msg, i) => (
                  <div key={i} className="truncate rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                    {msg.content.slice(0, 80)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="flex h-[600px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Bot className="mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">MarkIt AI Assistant</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Ask questions about attendance data or use a prompt template to get started.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="rounded-lg bg-gray-100 px-4 py-3">
                    <Spinner size="sm" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about attendance data..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
              <Button type="submit" disabled={!input.trim() || loading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
