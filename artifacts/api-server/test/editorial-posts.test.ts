import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { eq, like } from "drizzle-orm";
import { db, editorialPostsTable } from "@workspace/db";
import editorialPostsRouter from "../src/routes/editorial-posts";

const plannerA = "editorial-isolation-planner-a";
const plannerB = "editorial-isolation-planner-b";

const postInput = (title: string) => ({
  platform: "instagram",
  title,
  content: `${title} content`,
  scheduledDate: "2026-08-20",
  scheduledTime: "10:30",
  status: "draft",
  notes: `${title} notes`,
});

const app = express();
app.use(express.json());
app.use("/editorial-posts", (req, _res, next) => {
  const plannerId = req.header("x-test-planner-id");
  if (!plannerId) {
    next(new Error("test planner identity is required"));
    return;
  }
  (req as express.Request & { userId?: string }).userId = plannerId;
  next();
}, editorialPostsRouter);

before(async () => {
  await db.delete(editorialPostsTable).where(
    like(editorialPostsTable.ownerId, "editorial-isolation-planner-%"),
  );
});

beforeEach(async () => {
  await db.delete(editorialPostsTable).where(
    like(editorialPostsTable.ownerId, "editorial-isolation-planner-%"),
  );
});

after(async () => {
  await db.delete(editorialPostsTable).where(
    like(editorialPostsTable.ownerId, "editorial-isolation-planner-%"),
  );
});

describe("editorial post planner isolation", () => {
  it("lists only the posts owned by the authenticated planner", async () => {
    const plannerAPost = await request(app)
      .post("/editorial-posts")
      .set("x-test-planner-id", plannerA)
      .send(postInput("Planner A post"))
      .expect(201);
    await request(app)
      .post("/editorial-posts")
      .set("x-test-planner-id", plannerB)
      .send(postInput("Planner B post"))
      .expect(201);

    const plannerAList = await request(app)
      .get("/editorial-posts")
      .set("x-test-planner-id", plannerA)
      .expect(200);
    const plannerBList = await request(app)
      .get("/editorial-posts")
      .set("x-test-planner-id", plannerB)
      .expect(200);

    assert.deepEqual(plannerAList.body.map((post: { id: string }) => post.id), [plannerAPost.body.id]);
    assert.equal(plannerAList.body[0].ownerId, plannerA);
    assert.equal(plannerBList.body.length, 1);
    assert.equal(plannerBList.body[0].title, "Planner B post");
    assert.equal(plannerBList.body[0].ownerId, plannerB);
  });

  it("does not allow editing or deleting another planner's post", async () => {
    const plannerBPost = await request(app)
      .post("/editorial-posts")
      .set("x-test-planner-id", plannerB)
      .send(postInput("Planner B protected post"))
      .expect(201);

    await request(app)
      .patch(`/editorial-posts/${plannerBPost.body.id}`)
      .set("x-test-planner-id", plannerA)
      .send({ title: "Tampered by planner A" })
      .expect(404);

    await request(app)
      .delete(`/editorial-posts/${plannerBPost.body.id}`)
      .set("x-test-planner-id", plannerA)
      .expect(404);

    const [unchangedPost] = await db.select()
      .from(editorialPostsTable)
      .where(eq(editorialPostsTable.id, plannerBPost.body.id));
    assert.equal(unchangedPost.ownerId, plannerB);
    assert.equal(unchangedPost.title, "Planner B protected post");
    assert.equal(unchangedPost.content, "Planner B protected post content");
  });
});