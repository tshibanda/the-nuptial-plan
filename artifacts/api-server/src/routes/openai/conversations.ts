import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages, weddingsTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { assistantTools, executeAssistantTool } from "./assistant-tools";

const router: IRouter = Router();
const owner = (req: unknown) => (req as { userId?: string }).userId!;

const SYSTEM_PROMPT = `Tu es Nuptia, l'assistante IA du Nuptial Plan — une application de planification de mariage élégante et bienveillante.

Tu es experte en organisation de mariages : budgets, prestataires, listes d'invités, calendriers, tendances, traditions françaises et internationales, et bien plus encore.

Ton style : chaleureux, précis, légèrement poétique. Tu tutoies les planificateurs avec douceur. Tes réponses sont concises mais complètes — jamais sèches, jamais trop longues.

Tu réponds toujours en français sauf si l'utilisateur écrit dans une autre langue.

Si un contexte de mariage t'est fourni (noms, date, lieu, budget), utilise-le pour personnaliser tes conseils.

Tu peux agir dans les données de l'utilisateur avec l'outil disponible. N'utilise cet outil que lorsque l'utilisateur demande clairement de créer, modifier ou supprimer quelque chose. Après une action, confirme exactement ce qui a été fait. Ne prétends jamais avoir modifié une donnée si l'outil n'a pas réussi.`;

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

  const { content, weddingId } = req.body as {
    content?: string;
    weddingId?: number;
  };

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
  let systemContent = SYSTEM_PROMPT;
  if (typeof weddingId === "number" && Number.isInteger(weddingId)) {
    const [wedding] = await db.select().from(weddingsTable).where(
      and(eq(weddingsTable.id, weddingId), eq(weddingsTable.ownerId, owner(req))),
    );
    if (!wedding) {
      res.status(404).json({ error: "Wedding not found" });
      return;
    }
    systemContent += `\n\n---\nContexte vérifié du mariage :\nMariage : ${wedding.names}\nDate : ${wedding.weddingDate}\nLieu : ${wedding.venue}\nBudget : ${wedding.totalBudget} ${wedding.currency}`;
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
