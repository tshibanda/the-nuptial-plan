import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages, weddingsTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { assistantTools, executeAssistantTool } from "./assistant-tools";

const router: IRouter = Router();
const owner = (req: unknown) => (req as { userId?: string }).userId!;

const SYSTEM_PROMPT = `You are Nuptia, the AI assistant for The Nuptial Plan — an elegant, caring wedding-planning app.

You are an expert in wedding planning: budgets, vendors, guest lists, calendars, trends, French and international traditions, and more.

Your style is warm, precise, and slightly poetic. Address planners gently and directly. Keep answers concise but complete — never abrupt, never overly long.

Always answer in the application's active language. The trusted active language is supplied below. Do not infer the response language from the message alone.

When verified wedding context is supplied (names, date, venue, budget), use it to personalise your advice.

You can act on the planner's data with the available tool. Use it only when the planner clearly asks to create, edit, or delete something. After an action, confirm exactly what happened in the active language. Never claim a change was made if the tool did not succeed.`;

function activeLanguageInstruction(language: "en" | "fr"): string {
  return language === "fr"
    ? "Langue active vérifiée de l'application : français. Réponds entièrement en français, y compris les confirmations après une action."
    : "Verified active application language: English. Reply entirely in English, including confirmations after an action.";
}

/* ── List conversations ──────────────────────────────────────────────────── */
router.get("/", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.ownerId, owner(req)))
    .orderBy(asc(conversations.createdAt));
  res.json(rows);
});

/* ── Create conversation ─────────────────────────────────────────────────── */
router.post("/", async (req, res): Promise<void> => {
  const { title } = req.body as { title?: string };
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ title: title.slice(0, 200), ownerId: owner(req) })
    .returning();
  res.status(201).json(conv);
});

/* ── Get conversation with messages ─────────────────────────────────────── */
router.get("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (conv?.ownerId !== owner(req)) { res.status(404).json({ error: "Not found" }); return; }
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.json({ ...conv, messages: msgs });
});

/* ── Delete conversation ─────────────────────────────────────────────────── */
router.delete("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.ownerId !== owner(req)) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

/* ── List messages ───────────────────────────────────────────────────────── */
router.get("/:id/messages", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv || conv.ownerId !== owner(req)) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

/* ── Send message (SSE streaming) ───────────────────────────────────────── */
router.post("/:id/messages", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.ownerId !== owner(req)) { res.status(404).json({ error: "Not found" }); return; }

  const { content, weddingId, language } = req.body as {
    content?: string;
    weddingId?: number;
    language?: unknown;
  };
  const activeLanguage: "en" | "fr" = language === "en" ? "en" : "fr";

  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  // Persist user message
  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: content.trim(),
  });

  // Build message history (last 20 for context window)
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const lastMessages = history.slice(-20);

  // Build context from the server-owned wedding row. Never trust client-sent
  // wedding details for authorization or personalization.
  let systemContent = `${SYSTEM_PROMPT}\n\n${activeLanguageInstruction(activeLanguage)}`;
  if (typeof weddingId === "number" && Number.isInteger(weddingId)) {
    const [wedding] = await db.select().from(weddingsTable).where(
      and(eq(weddingsTable.id, weddingId), eq(weddingsTable.ownerId, owner(req))),
    );
    if (!wedding) {
      res.status(404).json({ error: "Wedding not found" });
      return;
    }
    const contextHeading = activeLanguage === "fr" ? "Contexte vérifié du mariage" : "Verified wedding context";
    const weddingLabel = activeLanguage === "fr" ? "Mariage" : "Wedding";
    const dateLabel = activeLanguage === "fr" ? "Date" : "Date";
    const venueLabel = activeLanguage === "fr" ? "Lieu" : "Venue";
    const budgetLabel = activeLanguage === "fr" ? "Budget" : "Budget";
    systemContent += `\n\n---\n${contextHeading}:\n${weddingLabel}: ${wedding.names}\n${dateLabel}: ${wedding.weddingDate}\n${venueLabel}: ${wedding.venue}\n${budgetLabel}: ${wedding.totalBudget} ${wedding.currency}`;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const modelMessages: any[] = [
      { role: "system", content: systemContent },
      ...lastMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const decision = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 4096,
      messages: modelMessages,
      tools: assistantTools as any,
      tool_choice: "auto",
      stream: false,
    });
    const decisionMessage: any = decision.choices[0]?.message;
    const toolCalls = decisionMessage?.tool_calls ?? [];

    if (toolCalls.length > 0) {
      modelMessages.push(decisionMessage);
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function" || toolCall.function?.name !== "manage_wedding_data") continue;
        let result: unknown;
        try {
          result = await executeAssistantTool(JSON.parse(toolCall.function.arguments), owner(req));
        } catch (error) {
          result = { error: error instanceof Error ? error.message : "Action impossible." };
        }
        modelMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
      const stream = await openai.chat.completions.create({
        model: "gpt-5.6-luna",
        max_completion_tokens: 8192,
        messages: modelMessages,
        stream: true,
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }
    } else if (decisionMessage?.content) {
      fullResponse = decisionMessage.content;
      res.write(`data: ${JSON.stringify({ content: fullResponse })}\n\n`);
    }

    // Persist assistant response
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
