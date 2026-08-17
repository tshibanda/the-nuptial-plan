import {
  activityTable,
  addressBookEntriesTable,
  budgetCategoriesTable,
  calendarEventsTable,
  contractsTable,
  db,
  guestsTable,
  paymentsTable,
  vendorsTable,
  weddingsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const assistantTools = [{
  type: "function",
  function: {
    name: "manage_wedding_data",
    description: "Créer, modifier ou supprimer une donnée du planner connecté, uniquement après une demande claire de l'utilisateur.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: { type: "string", enum: ["create", "update", "delete"] },
        entity: { type: "string", enum: ["wedding", "guest", "vendor", "budget_category", "event", "contract", "payment", "address_book_entry"] },
        weddingId: { type: ["integer", "null"] },
        recordId: { type: ["integer", "null"] },
        data: { type: "object", additionalProperties: true },
      },
      required: ["action", "entity", "weddingId", "recordId", "data"],
    },
  },
}] as const;

type Args = {
  action: "create" | "update" | "delete";
  entity: "wedding" | "guest" | "vendor" | "budget_category" | "event" | "contract" | "payment" | "address_book_entry";
  weddingId: number | null;
  recordId: number | null;
  data: Record<string, unknown>;
};

const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : undefined;
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : undefined;
const ownerWedding = async (id: number | null, ownerId: string) => {
  if (id === null || !Number.isInteger(id)) return null;
  const [row] = await db.select().from(weddingsTable).where(and(eq(weddingsTable.id, id), eq(weddingsTable.ownerId, ownerId)));
  return row ?? null;
};

const entityTables = {
  guest: guestsTable,
  vendor: vendorsTable,
  budget_category: budgetCategoriesTable,
  event: calendarEventsTable,
  contract: contractsTable,
  payment: paymentsTable,
} as const;

function createdValues(entity: keyof typeof entityTables, weddingId: number, d: Record<string, unknown>) {
  if (entity === "guest") {
    const name = text(d.name);
    if (!name) throw new Error("Un invité nécessite un nom.");
    return { weddingId, name, email: text(d.email), tableNumber: text(d.tableNumber), dietaryRequirements: text(d.dietaryRequirements), rsvpStatus: text(d.rsvpStatus) ?? "pending", plusOne: d.plusOne === true, notes: text(d.notes) };
  }
  if (entity === "vendor") {
    const name = text(d.name); const category = text(d.category);
    if (!name || !category) throw new Error("Un prestataire nécessite un nom et une catégorie.");
    return { weddingId, name, category, status: text(d.status) ?? "awaiting_contract", totalAmountCents: String(number(d.totalAmount) ?? 0), depositAmountCents: number(d.depositAmount) === undefined ? null : String(d.depositAmount), contactName: text(d.contactName), contactEmail: text(d.contactEmail), contactPhone: text(d.contactPhone), notes: text(d.notes) };
  }
  if (entity === "budget_category") {
    const name = text(d.name); if (!name) throw new Error("Une catégorie de budget nécessite un nom.");
    return { weddingId, name, allocatedCents: String(number(d.allocatedAmount) ?? 0), spentCents: String(number(d.spentAmount) ?? 0), notes: text(d.notes) };
  }
  if (entity === "event") {
    const title = text(d.title); const eventDate = text(d.eventDate);
    if (!title || !eventDate) throw new Error("Un événement nécessite un titre et une date.");
    return { weddingId, title, eventDate, detail: text(d.detail), eventTime: text(d.eventTime), location: text(d.location), actors: text(d.actors), tone: text(d.tone), completed: d.completed === true };
  }
  if (entity === "contract") {
    const vendorName = text(d.vendorName); if (!vendorName) throw new Error("Un contrat nécessite le nom du prestataire.");
    return { weddingId, vendorId: number(d.vendorId), vendorName, status: text(d.status) ?? "pending", totalAmountCents: String(number(d.totalAmount) ?? 0), depositPaidCents: number(d.depositPaid) === undefined ? null : String(d.depositPaid), signedDate: text(d.signedDate), notes: text(d.notes) };
  }
  const vendorName = text(d.vendorName); const description = text(d.description); const dueDate = text(d.dueDate);
  if (!vendorName || !description || !dueDate) throw new Error("Un paiement nécessite un prestataire, une description et une échéance.");
  return { weddingId, vendorId: number(d.vendorId), vendorName, description, amountCents: String(number(d.amount) ?? 0), dueDate, status: text(d.status) ?? "pending", paidDate: text(d.paidDate), notes: text(d.notes) };
}

function updatedValues(d: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const stringFields = ["name", "email", "tableNumber", "dietaryRequirements", "rsvpStatus", "category", "status", "notes", "title", "detail", "eventDate", "eventTime", "location", "actors", "tone", "vendorName", "description", "dueDate", "paidDate", "signedDate", "contactName", "contactEmail", "contactPhone"];
  const numericFields: Record<string, string> = { totalAmount: "totalAmountCents", depositAmount: "depositAmountCents", allocatedAmount: "allocatedCents", spentAmount: "spentCents", depositPaid: "depositPaidCents", amount: "amountCents" };
  for (const key of stringFields) if (key in d) out[key] = text(d[key]) ?? null;
  for (const [input, column] of Object.entries(numericFields)) if (input in d && number(d[input]) !== undefined) out[column] = String(d[input]);
  if ("completed" in d) out.completed = d.completed === true;
  if ("plusOne" in d) out.plusOne = d.plusOne === true;
  return out;
}

export async function executeAssistantTool(raw: unknown, ownerId: string) {
  const args = raw as Args;
  if (!["create", "update", "delete"].includes(args.action)) throw new Error("Action non autorisée.");
  if (args.entity !== "address_book_entry" && args.action !== "create" && !Number.isInteger(args.recordId)) throw new Error("Identifiant de donnée manquant.");

  if (args.entity === "address_book_entry") {
    if (args.action === "create") {
      const name = text(args.data.name); const category = text(args.data.category);
      if (!name || !category) throw new Error("Une entrée du carnet nécessite un nom et une catégorie.");
      const [created] = await db.insert(addressBookEntriesTable).values({ ownerId, name, category, contactName: text(args.data.contactName), contactEmail: text(args.data.contactEmail), contactPhone: text(args.data.contactPhone), website: text(args.data.website), notes: text(args.data.notes) }).returning();
      return { action: args.action, entity: args.entity, record: created };
    }
    const [existing] = await db.select().from(addressBookEntriesTable).where(and(eq(addressBookEntriesTable.id, args.recordId!), eq(addressBookEntriesTable.ownerId, ownerId)));
    if (!existing) throw new Error("Entrée du carnet introuvable.");
    if (args.action === "delete") {
      await db.delete(addressBookEntriesTable).where(and(eq(addressBookEntriesTable.id, args.recordId!), eq(addressBookEntriesTable.ownerId, ownerId)));
      return { action: args.action, entity: args.entity, recordId: args.recordId };
    }
    const [updated] = await db.update(addressBookEntriesTable).set({ ...updatedValues(args.data), website: "website" in args.data ? text(args.data.website) ?? null : undefined }).where(and(eq(addressBookEntriesTable.id, args.recordId!), eq(addressBookEntriesTable.ownerId, ownerId))).returning();
    return { action: args.action, entity: args.entity, record: updated };
  }

  if (args.entity === "wedding") {
    if (args.action === "create") {
      const names = text(args.data.names); const weddingDate = text(args.data.weddingDate); const venue = text(args.data.venue);
      if (!names || !weddingDate || !venue) throw new Error("Un mariage nécessite names, weddingDate et venue.");
      const [created] = await db.insert(weddingsTable).values({ ownerId, names, weddingDate, venue, currency: text(args.data.currency) ?? "EUR", partner1: text(args.data.partner1), partner2: text(args.data.partner2), totalBudget: String(number(args.data.totalBudget) ?? 0), guestCount: number(args.data.guestCount) ?? 0, notes: text(args.data.notes) }).returning();
      await db.insert(activityTable).values({ weddingId: created!.id, description: `Nuptia a créé le mariage ${created!.names}`, entityType: "wedding" });
      return { action: args.action, entity: args.entity, record: created };
    }
    const existing = await ownerWedding(args.recordId, ownerId);
    if (!existing) throw new Error("Mariage introuvable.");
    if (args.action === "delete") {
      await db.delete(weddingsTable).where(and(eq(weddingsTable.id, existing.id), eq(weddingsTable.ownerId, ownerId)));
      return { action: args.action, entity: args.entity, recordId: existing.id };
    }
    const [updated] = await db.update(weddingsTable).set({ names: text(args.data.names), partner1: text(args.data.partner1), partner2: text(args.data.partner2), weddingDate: text(args.data.weddingDate), venue: text(args.data.venue), currency: text(args.data.currency), totalBudget: number(args.data.totalBudget) === undefined ? undefined : String(args.data.totalBudget), guestCount: number(args.data.guestCount), notes: text(args.data.notes) }).where(and(eq(weddingsTable.id, existing.id), eq(weddingsTable.ownerId, ownerId))).returning();
    return { action: args.action, entity: args.entity, record: updated };
  }

  const wedding = await ownerWedding(args.weddingId, ownerId);
  if (!wedding) throw new Error("Mariage introuvable ou inaccessible.");
  const table = entityTables[args.entity as keyof typeof entityTables];
  if (args.action === "create") {
    const [created] = await db.insert(table).values(createdValues(args.entity as keyof typeof entityTables, wedding.id, args.data) as never).returning();
    await db.insert(activityTable).values({ weddingId: wedding.id, description: `Nuptia a créé une donnée (${args.entity})`, entityType: args.entity });
    return { action: args.action, entity: args.entity, record: created };
  }
  const [existing] = await db.select().from(table).where(and(eq(table.id, args.recordId!), eq(table.weddingId, wedding.id)));
  if (!existing) throw new Error("Donnée introuvable.");
  if (args.action === "delete") {
    await db.delete(table).where(and(eq(table.id, args.recordId!), eq(table.weddingId, wedding.id)));
    return { action: args.action, entity: args.entity, recordId: args.recordId };
  }
  const [updated] = await db.update(table).set(updatedValues(args.data) as never).where(and(eq(table.id, args.recordId!), eq(table.weddingId, wedding.id))).returning();
  return { action: args.action, entity: args.entity, record: updated };
}