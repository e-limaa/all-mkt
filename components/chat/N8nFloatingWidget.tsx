/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { MessageCircle, Send, Loader2, X, Download, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  pending?: boolean;
  error?: boolean;
};

type N8nResponse = {
  reply?: string;
  suggestions?: string[];
  attachments?: unknown[];
  context?: Record<string, unknown>;
  requestId?: string;
  raw?: unknown;
  error?: string;
};

const USER_STORAGE_KEY = "dam-n8n-chat-user-id";

function ensureUserId(): string {
  const globalScope = typeof window === "undefined" ? null : window;
  if (!globalScope) {
    return uuidv4();
  }
  const existing = globalScope.localStorage.getItem(USER_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const generated = uuidv4();
  globalScope.localStorage.setItem(USER_STORAGE_KEY, generated);
  return generated;
}

const REPLY_KEYS = ["reply", "message", "text", "response", "output"];
const SUGGESTION_KEYS = ["suggestions", "hints", "options"];
const BULLETED_FOLLOW_UP_REGEX = /\bQuer que\b/i;
const LINK_REGEX = /(https?:\/\/[^\s]+)|(materials\?[^\s]+)/gi;
const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dam.allmkt.com";

const MATERIAL_NAME_PATTERNS: RegExp[] = [
  /material\s*["'`“”‘’]([^"'`“”‘’]+)["'`“”‘’]/i,
  /material:\s*([^(\n]+)/i,
  /nome\s+do\s+material[:\-]?\s*([^(\n]+)/i,
];

const extractMaterialNameFromText = (text: string): string | null => {
  for (const pattern of MATERIAL_NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
};

function findFirstReply(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findFirstReply(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of REPLY_KEYS) {
      if (key in record) {
        const nested = findFirstReply(record[key]);
        if (nested) {
          return nested;
        }
      }
    }
    for (const nested of Object.values(record)) {
      const resolved = findFirstReply(nested);
      if (resolved) {
        return resolved;
      }
    }
  }
  return null;
}

function extractReply(payload: N8nResponse): string | null {
  const direct = typeof payload.reply === "string" ? payload.reply.trim() : null;
  if (direct) {
    return direct;
  }
  return findFirstReply(payload.raw);
}

function findSuggestions(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    const direct = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (direct.length > 0) {
      return direct;
    }
    for (const nested of value) {
      const fallback = findSuggestions(nested);
      if (fallback.length > 0) {
        return fallback;
      }
    }
    return [];
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of SUGGESTION_KEYS) {
      if (key in record) {
        const nested = findSuggestions(record[key]);
        if (nested.length > 0) {
          return nested;
        }
      }
    }
    for (const nested of Object.values(record)) {
      const fallback = findSuggestions(nested);
      if (fallback.length > 0) {
        return fallback;
      }
    }
  }
  return [];
}

const formatAssistantText = (text: string) => {
  if (!text) return text;
  if (!/\d+\.\s+/.test(text)) {
    return text;
  }

  let result = text.replace(/\s*(\d+\.\s+)/g, "\n$1");
  result = result.replace(/^\n+/, "");
  result = result.replace(/\n{2,}/g, "\n");

  if (BULLETED_FOLLOW_UP_REGEX.test(result)) {
    result = result.replace(/\s+(Quer que)/i, "\n$1");
  }

  return result.trim();
};

const getFileNameFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      const decoded = decodeURIComponent(lastSegment);
      if (decoded) {
        return decoded;
      }
    }
  } catch {
    // ignore parsing issues
  }
  return "material";
};

const extractFileNameFromDisposition = (header: string | null) => {
  if (!header) return null;
  const filenameMatch = header.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (filenameMatch?.[1]) {
    try {
      return decodeURIComponent(filenameMatch[1]);
    } catch {
      return filenameMatch[1];
    }
  }
  return null;
};

const truncateLabel = (value: string, maxLength = 32) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

function extractSuggestions(payload: N8nResponse): string[] {
  if (Array.isArray(payload.suggestions) && payload.suggestions.length > 0) {
    return payload.suggestions.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  return findSuggestions(payload.raw);
}

export function N8nFloatingWidget() {
  const baseShareUrl = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return DEFAULT_SITE_URL;
  }, []);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uuidv4(),
      role: "assistant",
      text: "Ola! Como posso ajudar voce hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const handleMaterialDownload = useCallback(
    async (url: string) => {
      if (!url) return;
      try {
        setError(null);
        setDownloadingUrl(url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Download failed with status ${response.status}`);
        }

        const blob = await response.blob();
        const dispositionName = extractFileNameFromDisposition(response.headers.get("Content-Disposition"));
        const fileName = dispositionName || getFileNameFromUrl(url);
        const objectUrl = URL.createObjectURL(blob);

        const tempLink = document.createElement("a");
        tempLink.href = objectUrl;
        tempLink.download = fileName;
        document.body.appendChild(tempLink);
        tempLink.click();
        tempLink.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (downloadError) {
        console.error("[chat] Falha ao baixar material:", downloadError);
        setError("Nao foi possivel baixar o arquivo. Tente novamente.");
      } finally {
        setDownloadingUrl(null);
      }
    },
    [setError],
  );

  const renderDownloadButton = useCallback(
    (url: string, key: string, materialName?: string | null) => {
      const labelSource =
        materialName && materialName.trim().length > 0 ? materialName : getFileNameFromUrl(url);
      const label = truncateLabel(labelSource);
      const isDownloading = downloadingUrl === url;
      const fullTitle = isDownloading ? `Baixando ${labelSource}` : `Baixar ${labelSource}`;
      const textLabel = isDownloading ? `Baixando ${label}` : `Baixar ${label}`;

      return (
        <button
          key={key}
          type="button"
          onClick={() => void handleMaterialDownload(url)}
          className="ml-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={fullTitle}
          title={fullTitle}
        >
          {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {textLabel}
        </button>
      );
    },
    [downloadingUrl, handleMaterialDownload],
  );

  const renderShareLink = useCallback(
    (sharePath: string, key: string, materialName?: string | null) => {
      const cleaned = sharePath.trim().replace(/^[\"'`(]+/, "").replace(/[)"'`]+$/, "");
      const normalizedPath = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
      const shareUrl = `${baseShareUrl}${normalizedPath}`;
      const labelSource = materialName && materialName.trim().length > 0 ? materialName : "material";
      const label = truncateLabel(labelSource);
      const fullTitle = `Visualizar ${labelSource}`;
      const textLabel = `Visualizar ${label}`;

      return (
        <a
          key={key}
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={fullTitle}
          title={fullTitle}
        >
          <Eye className="h-3.5 w-3.5" />
          {textLabel}
        </a>
      );
    },
    [baseShareUrl],
  );

  const renderAssistantContent = useCallback(
    (text: string, isError?: boolean): ReactNode => {
      const materialName = extractMaterialNameFromText(text);
      const lines = text.split("\n");
      return (
        <div className={cn("space-y-1 text-left", isError && "text-destructive")}>
          {lines.map((line, lineIndex) => {
            if (!line.trim()) {
              return <span key={lineIndex} className="block">&nbsp;</span>;
            }

            const segments: ReactNode[] = [];
            let lastIndex = 0;

            const matches = [...line.matchAll(LINK_REGEX)];
            for (const match of matches) {
              const [fullMatch, urlMatch, shareMatch] = match;
              const offset = match.index ?? 0;

              if (offset > lastIndex) {
                segments.push(line.slice(lastIndex, offset));
              }
              const key = `${lineIndex}-${offset}`;

              if (urlMatch) {
                segments.push(renderDownloadButton(urlMatch, key, materialName));
              } else if (shareMatch) {
                segments.push(renderShareLink(shareMatch, key, materialName));
              } else {
                segments.push(fullMatch);
              }

              lastIndex = offset + fullMatch.length;
            }

            if (lastIndex < line.length) {
              segments.push(line.slice(lastIndex));
            }

            return (
              <span key={lineIndex} className="block">
                {segments}
              </span>
            );
          })}
        </div>
      );
    },
    [renderDownloadButton, renderShareLink],
  );

  const listRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | undefined>(undefined);
  const threadIdRef = useRef<string>(uuidv4());

  useEffect(() => {
    userIdRef.current = ensureUserId();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const style = document.createElement("style");
    style.textContent = "@keyframes n8n-typing {0%,80%,100%{opacity:0.25;transform:translateY(0);}40%{opacity:1;transform:translateY(-3px);}}";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const getTypingDotStyle = (index: number): CSSProperties => ({
    backgroundColor: "currentColor",
    opacity: 0.55,
    animation: "n8n-typing 1.2s ease-in-out infinite",
    animationDelay: `${index * 0.18}s`,
  });

  const TypingIndicator = () => (
    <div className="flex items-center gap-1" aria-label="Assistente digitando">
      {[0, 1, 2].map((index) => (
        <span key={index} className="h-2.5 w-2.5 rounded-full" style={getTypingDotStyle(index)} />
      ))}
    </div>
  );

  const hasMessages = messages.length > 0;
  const avatarSrc = "/images/chat/tais.png";
  const avatarAlt = "Tais, colaboradora virtual";

  const handleSuggestionClick = async (value: string) => {
    setInput(value);
    await handleSend(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSend();
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) {
      return;
    }

    setError(null);
    setInput("");
    setSuggestions([]);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      text,
    };

    const placeholder: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      text: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMessage, placeholder]);
    setLoading(true);

    const start = Date.now();
    const threadId = threadIdRef.current;
    const userId = userIdRef.current ?? ensureUserId();

    try {
      const response = await fetch("/api/n8n/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, threadId, userId, sessionId: userId }),
      });

      const payload = (await response.json().catch(() => ({}))) as N8nResponse;

      console.info("[chat] reply", {
        durationMs: Date.now() - start,
        status: response.status,
        payload,
      });

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao obter resposta do n8n.");
      }

      const reply = extractReply(payload);

      if (!reply) {
        console.warn("[chat] webhook respondeu sem texto util", payload);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.pending
              ? {
                  ...msg,
                  pending: false,
                  text: "O fluxo foi iniciado no n8n, mas nenhuma resposta foi gerada.",
                  error: true,
                }
              : msg,
          ),
        );
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.pending
            ? {
                ...msg,
                pending: false,
                text: reply,
              }
            : msg,
        ),
      );

      const resolvedSuggestions = extractSuggestions(payload);
      if (resolvedSuggestions.length > 0) {
        setSuggestions(resolvedSuggestions);
      }
    } catch (err) {
      console.error("[chat] error", err);
      setError(err instanceof Error ? err.message : String(err));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.pending
            ? {
                ...msg,
                pending: false,
                error: true,
                text: "Nao foi possivel obter uma resposta. Tente novamente.",
              }
            : msg,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";
    const displayText = isUser ? message.text : formatAssistantText(message.text);

    let content: ReactNode;
    if (message.pending) {
      content = <TypingIndicator />;
    } else if (isUser) {
      content = <p className={cn(message.error && "text-destructive")}>{displayText}</p>;
    } else {
      content = renderAssistantContent(displayText, message.error);
    }

    return (
      <div
        key={message.id}
        className={cn("flex w-full gap-2", isUser ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {content}
        </div>
      </div>
    );
  };

  const suggestionChips = useMemo(() => {
    if (suggestions.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {suggestions.map((hint) => (
          <Button
            key={hint}
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full bg-muted text-xs text-muted-foreground hover:bg-muted/80"
            onClick={() => handleSuggestionClick(hint)}
          >
            {hint}
          </Button>
        ))}
      </div>
    );
  }, [suggestions]);

  return (
    <div className="pointer-events-none fixed right-4 bottom-24 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div className="pointer-events-auto w-[min(420px,calc(100vw-3rem))] max-w-full">
          <div className="flex h-[560px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/15">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 ring-4 ring-primary/10">
                  <img
                    src={avatarSrc}
                    alt={avatarAlt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Tais</span>
                  <span className="text-xs text-muted-foreground">Colaboradora Virtual</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  Online
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar assistente"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={listRef} className="h-full flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                {hasMessages ? (
                  messages.map((message) => renderMessage(message))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="h-6 w-6" />
                    <span>Envie uma mensagem para iniciar a conversa.</span>
                  </div>
                )}
              </div>
            </div>

            {suggestionChips}

            <div className="border-t border-border bg-background px-4 py-3">
              {error && (
                <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="relative flex-1">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Digite a sua mensagem..."
                    rows={2}
                    className="min-h-[52px] max-h-[160px] resize-none pr-16"
                  />
                  <Button
                    type="submit"
                    disabled={loading || input.trim().length === 0}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 transform items-center justify-center rounded-xl p-0"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="sr-only">Enviar mensagem</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="pointer-events-auto h-16 w-16 overflow-hidden rounded-full bg-primary/10 text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
                aria-expanded={open}
                aria-label="Abrir assistente virtual"
                onClick={() => setOpen(true)}
              >
                <img
                  src={avatarSrc}
                  alt={avatarAlt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={12} className="max-w-[220px] text-sm">
              Oi, sou a Tais. Como posso ajudar?
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default N8nFloatingWidget;
