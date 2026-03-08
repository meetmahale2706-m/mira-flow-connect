import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Bot, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

export default function SupportChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setFetching(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    // Save user message
    const { data: userMsg, error: userErr } = await supabase
      .from("support_messages")
      .insert({ user_id: user!.id, content: text, role: "user" })
      .select()
      .single();

    if (userErr) {
      toast.error("Failed to send message");
      setLoading(false);
      return;
    }

    setMessages((prev) => [...prev, userMsg as Message]);

    // Stream AI response
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
    
    try {
      const conversationHistory = [...messages, userMsg as Message].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationHistory, user_id: user!.id }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Too many requests, please wait a moment");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted");
        } else {
          toast.error("Failed to get AI response");
        }
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setLoading(false); return; }

      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      // Add placeholder assistant message
      const tempId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: tempId, content: "", role: "assistant", created_at: new Date().toISOString() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, content: assistantContent } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to DB
      if (assistantContent) {
        const { data: savedMsg } = await supabase
          .from("support_messages")
          .insert({ user_id: user!.id, content: assistantContent, role: "assistant" })
          .select()
          .single();
        if (savedMsg) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? (savedMsg as Message) : m)));
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Failed to connect to support");
    }

    setLoading(false);
  };

  return (
    <Card className="shadow-card flex flex-col h-[600px]">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          AI Support Chat
        </CardTitle>
        <p className="text-xs text-muted-foreground">Get help with deliveries, pricing, and more</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Hi! I'm your MiraLink support assistant.</p>
              <p className="text-xs text-muted-foreground mt-1">Ask me about deliveries, pricing, tracking, or anything else!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0">
                        <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-border p-3 flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
