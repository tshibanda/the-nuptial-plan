import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { and, eq, like } from "drizzle-orm";
import { db, weddingsTable } from "@workspace/db";
import weddingsRouter from "../src/routes/weddings";

const ownerId = "currency-regression-planner";
const supportedCurrencies = ["EUR", "GBP", "USD", "CHF"] as const;

const weddingInput = (currency: string) => ({
  names: "Sophie & James",
  partner1: "Sophie",
  partner2: "James",
  currency,
  weddingDate: "2027-06-12",
  venue: "The Orangery",
  totalBudget: 123456,
  guestCount: 80,
  notes: "",
});

const app = express();
app.use(express.json());
app.use(
  "/weddings",
  (req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = ownerId;
    next();
  },
  weddingsRouter,
);

async function deleteTestWeddings() {
  await db.delete(weddingsTable).where(like(weddingsTable.ownerId, "currency-regression-planner%"));
}

before(async () => {
  await deleteTestWeddings();
});

beforeEach(async () => {
  await deleteTestWeddings();
});

after(async () => {
  await deleteTestWeddings();
});

describe("wedding currency API", () => {
  it("rejects unsupported currency codes on create and update", async () => {
    for (const currency of ["CAD", "JPY", "eur", "", null]) {
      await request(app)
        .post("/weddings")
        .send(weddingInput(currency as string))
        .expect(400);
    }

    const created = await request(app)
      .post("/weddings")
      .send(weddingInput("EUR"))
      .expect(201);

    for (const currency of ["CAD", "JPY", "eur", "", null]) {
      await request(app)
        .patch(`/weddings/${created.body.id}`)
        .send({ currency })
        .expect(400);
    }
  });

  it("accepts every supported currency and keeps the numeric amount when the currency changes", async () => {
    for (const currency of supportedCurrencies) {
      const created = await request(app)
        .post("/weddings")
        .send(weddingInput(currency))
        .expect(201);

      assert.equal(created.body.currency, currency);
      assert.equal(Number(created.body.totalBudget), 123456);

      const changed = currency === "EUR" ? "GBP" : "EUR";
      const updated = await request(app)
        .patch(`/weddings/${created.body.id}`)
        .send({ currency: changed })
        .expect(200);

      assert.equal(updated.body.currency, changed);
      assert.equal(Number(updated.body.totalBudget), 123456);

      const [stored] = await db
        .select()
        .from(weddingsTable)
        .where(and(eq(weddingsTable.id, created.body.id), eq(weddingsTable.ownerId, ownerId)));
      assert.ok(stored);
      assert.equal(stored.currency, changed);
      assert.equal(Number(stored.totalBudget), 123456);
    }
  });
});