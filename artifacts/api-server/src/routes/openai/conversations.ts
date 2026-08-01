import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const SYSTEM_PROMPT = `Tu es Nuptia, l'assistante IA du Nuptial Plan — une application de planification de mariage élégante et bienveillante.

Tu es experte en organisation de mariages : budgets, prestataires, listes d'invités, calendriers, tendances, traditions françaises et internationales, et bien plus encore.

Ton style : chaleureux, précis, légèrement poétique. Tu tutoies les planificateurs avec douceur. Tes réponses sont concises mais complètes — jamais sèches, jamais trop longues.

Tu réponds toujours en français sauf si l'utilisateur écrit dans une autre langue.

Si un contexte de mariage t'est fourni (noms, date, lieu, budget), utilise-le pour personnaliser tes conseils.

Tu ne peux pas accéder à Internet ni modifier directement les données de l'application. Tu peux en revanche guider les utilisateurs, répondre à leurs questions, les inspirer et les aider à prendre de meilleures décisions.`;

/* ── List conversations ──────────────────────────────────────────────────── */
router.get("/", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
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
    .values({ title: title.slice(0, 200) })
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
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

/* ── List messages ───────────────────────────────────────────────────────── */
router.get("/:id/messages", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
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

  const { content, weddingContext } = req.body as {
    content?: string;
    weddingContext?: {
      names?: string;
      weddingDate?: string;
      venue?: string;
      daysUntil?: number;
      budgetTotal?: number;
      budgetSpent?: number;
      totalGuests?: number;
      confirmedGuests?: number;
    };
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

  // Build system prompt with optional wedding context
  let systemContent = SYSTEM_PROMPT;
  if (weddingContext && Object.keys(weddingContext).length > 0) {
    const ctx: string[] = [];
    if (weddingContext.names)       ctx.push(`Mariage : ${weddingContext.names}`);
    if (weddingContext.weddingDate) ctx.push(`Date : ${new Date(weddingContext.weddingDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`);
    if (weddingContext.venue)       ctx.push(`Lieu : ${weddingContext.venue}`);
    if (weddingContext.daysUntil !== undefined)
      ctx.push(weddingContext.daysUntil > 0 ? `Jours restants : ${weddingContext.daysUntil}` : "Le mariage a déjà eu lieu.");
    if (weddingContext.budgetTotal) {
      ctx.push(`Budget total : ${(weddingContext.budgetTotal / 100).toLocaleString("fr-FR")} €`);
      if (weddingContext.budgetSpent)
        ctx.push(`Dépensé : ${(weddingContext.budgetSpent / 100).toLocaleString("fr-FR")} €`);
    }
    if (weddingContext.totalGuests) {
      ctx.push(`Invités : ${weddingContext.confirmedGuests ?? 0}/${weddingContext.totalGuests} confirmés`);
    }
    systemContent += `\n\n---\nContexte du mariage :\n${ctx.join("\n")}`;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemContent },
        ...lastMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
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
