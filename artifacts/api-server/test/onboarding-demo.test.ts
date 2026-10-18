import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { pool } from "@workspace/db";
import { seedOnboardingDemo } from "../src/lib/seedOnboardingDemo";

const ownerId = `onboarding-demo-test-${Date.now()}`;

async function cleanUp() {
  const client = await pool.connect();
  try {
    const weddingIds = await client.query<{ id: number }>(
      "SELECT id FROM weddings WHERE owner_id = $1",
      [ownerId],
    );
    const ids = weddingIds.rows.map(({ id }) => id);
    if (ids.length) {
      const idList = ids.join(",");
      await client.query(`DELETE FROM milestones WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM contracts WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM payments WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM guests WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM vendors WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM budget_categories WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM calendar_events WHERE wedding_id IN (${idList})`);
      await client.query(`DELETE FROM activity WHERE wedding_id IN (${idList})`);
      await client.query("DELETE FROM weddings WHERE owner_id = $1", [ownerId]);
    }
  } finally {
    client.release();
  }
}

after(cleanUp);

describe("onboarding sample wedding", () => {
  it("creates one private, complete sample file even when signup requests race", async () => {
    const results = await Promise.all([
      seedOnboardingDemo(ownerId, "en"),
      seedOnboardingDemo(ownerId, "en"),
    ]);

    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(results[0]?.weddingId, results[1]?.weddingId);
    assert.ok(results[0]?.weddingId);

    const client = await pool.connect();
    try {
      const wedding = await client.query<{ owner_id: string; budget_total: string }>(
        "SELECT owner_id, budget_total FROM weddings WHERE id = $1",
        [results[0]!.weddingId],
      );
      assert.equal(wedding.rows[0]?.owner_id, ownerId);
      assert.equal(Number(wedding.rows[0]?.budget_total), 2_400_000);

      const counts = await client.query<{
        guests: number;
        vendors: number;
        budget: number;
        events: number;
        payments: number;
        contracts: number;
        milestones: number;
      }>(
        `SELECT
          (SELECT COUNT(*)::int FROM guests WHERE wedding_id = $1) AS guests,
          (SELECT COUNT(*)::int FROM vendors WHERE wedding_id = $1) AS vendors,
          (SELECT COUNT(*)::int FROM budget_categories WHERE wedding_id = $1) AS budget,
          (SELECT COUNT(*)::int FROM calendar_events WHERE wedding_id = $1) AS events,
          (SELECT COUNT(*)::int FROM payments WHERE wedding_id = $1) AS payments,
          (SELECT COUNT(*)::int FROM contracts WHERE wedding_id = $1) AS contracts,
          (SELECT COUNT(*)::int FROM milestones WHERE wedding_id = $1) AS milestones`,
        [results[0]!.weddingId],
      );

      assert.deepEqual(counts.rows[0], {
        guests: 6,
        vendors: 4,
        budget: 8,
        events: 4,
        payments: 4,
        contracts: 4,
        milestones: 6,
      });
    } finally {
      client.release();
    }
  });
});
