"use client";

import { useState } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import DynamicChart from "@/components/dynamic-chart";

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  toolResult?: {
    sql: string;
    cols: string[];
    rows: Record<string, unknown>[];
    elapsedMs: number;
  } | null;
}

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setError(null);
    setInput("");
    setLoading(true);
    setEntries((prev) => [...prev, { role: "user", text: q }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setEntries((prev) => [
        ...prev,
        {
          role: "assistant",
          text: json.text ?? "",
          toolResult: json.toolResult ?? null,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MessageSquare className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Escribí tu pregunta… ej. «ventas por mes»"
            className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
            disabled={loading}
          />
        </div>
        <Button
          onClick={send}
          disabled={loading || !input.trim()}
          size="icon"
          aria-label="Enviar pregunta"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col gap-3">
          {entries.map((entry, i) =>
            entry.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {entry.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col gap-2">
                {entry.text && (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                    {entry.text}
                  </div>
                )}
                {entry.toolResult && (
                  <DynamicChart result={entry.toolResult} />
                )}
              </div>
            )
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Consultando los datos…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
