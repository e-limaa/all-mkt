import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

interface ChatRequestBody {
  text?: string;
  threadId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}

interface NormalizedResponse {
  reply: string;
  suggestions: string[];
  attachments: unknown[];
  context: Record<string, unknown>;
  requestId: string;
  raw?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractReply(source: unknown): string | null {
  if (!source) return null;
  if (Array.isArray(source)) {
    for (const item of source) {
      const nested = extractReply(item);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof source === "string") {
    return source.trim() || null;
  }
  if (!isRecord(source)) {
    return null;
  }

  const candidateKeys = ["reply", "message", "text", "response", "output"];

  for (const key of candidateKeys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if ("data" in source) {
    const nested = extractReply((source as Record<string, unknown>).data);
    if (nested) return nested;
  }

  if ("body" in source) {
    const nested = extractReply((source as Record<string, unknown>).body);
    if (nested) return nested;
  }

  return null;
}

function extractSuggestions(source: unknown): string[] {
  if (Array.isArray(source)) {
    const direct = source.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (direct.length > 0) {
      return direct;
    }
    for (const item of source) {
      const nested = extractSuggestions(item);
      if (nested.length > 0) {
        return nested;
      }
    }
    return [];
  }
  if (!isRecord(source)) {
    return [];
  }

  const keys = ["suggestions", "hints", "options"];
  for (const key of keys) {
    const candidate = source[key];
    if (Array.isArray(candidate)) {
      return candidate.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    }
  }

  if ("data" in source) {
    return extractSuggestions((source as Record<string, unknown>).data);
  }

  return [];
}

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
      console.error("[n8n/chat] misconfigured", {
        hasUrl: Boolean(WEBHOOK_URL),
        hasSecret: Boolean(WEBHOOK_SECRET),
        requestId,
      });
      return NextResponse.json({ error: "misconfigured" }, { status: 500 });
    }

    const body: ChatRequestBody = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }

    const sessionId =
      body.sessionId ?? body.threadId ?? body.userId ?? `session-${requestId}`;

    const upstreamPayload = {
      text,
      threadId: body.threadId ?? null,
      userId: body.userId ?? null,
      sessionId,
      metadata: body.metadata ?? {},
      context: {
        referer: req.headers.get("referer"),
        userAgent: req.headers.get("user-agent"),
        locale: req.headers.get("accept-language"),
        appVersion: APP_VERSION,
      },
    };

    console.info("[n8n/chat] → webhook", {
      requestId,
      hasText: text.length > 0,
      threadId: upstreamPayload.threadId,
      userId: upstreamPayload.userId,
      sessionId,
    });

    const upstream = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WEBHOOK_SECRET}`,
        "X-Request-Id": requestId,
      },
      body: JSON.stringify(upstreamPayload),
    });

    const raw = await upstream.text();
    let data: unknown = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error("[n8n/chat] failed to parse webhook response", {
        requestId,
        raw,
        error,
      });
      if (typeof raw === "string" && raw.trim().length > 0) {
        data = { output: raw };
      }
    }

    const replyText = extractReply(data);
    const replyPreview = replyText ? replyText.slice(0, 120) : null;

    console.info("[n8n/chat] ← webhook", {
      requestId,
      status: upstream.status,
      durationMs: Date.now() - startedAt,
      hasReply: Boolean(replyText),
      replyPreview,
    });

    if (!upstream.ok) {
      console.error("[n8n/chat] upstream_error", {
        requestId,
        status: upstream.status,
        raw: process.env.NODE_ENV === "development" ? data : undefined,
      });
      return NextResponse.json(
        {
          error: "upstream_error",
          data,
        },
        { status: upstream.status === 404 ? 502 : upstream.status },
      );
    }

    const dataRecord = isRecord(data) ? data : undefined;
    const normalized: NormalizedResponse = {
      reply: replyText ?? "",
      suggestions: extractSuggestions(data),
      attachments:
        dataRecord && Array.isArray(dataRecord.attachments)
          ? (dataRecord.attachments as unknown[])
          : [],
      context: dataRecord && isRecord(dataRecord.context) ? dataRecord.context : {},
      requestId,
      raw: process.env.NODE_ENV === "development" ? data : undefined,
    };

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("[n8n/chat] internal error", { requestId, error });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
