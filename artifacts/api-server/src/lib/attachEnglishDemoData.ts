import { pool } from "@workspace/db";

const DEMO_EMAIL = "thenuptialplan2@yopmail.com";
const LEGACY_DEMO_OWNER_ID = "user_3HI5JlCVOdBa7ELBQ71LL5dpB4a";

/**
 * The demo dataset originally used a fixed development Clerk ID. Development
 * Clerk users can be recreated, so attach that dataset to the person who signs
 * in with the dedicated demo address rather than leaving it orphaned.
 */
export async function attachEnglishDemoData(ownerId: string, email: string | null | undefined): Promise<void> {
  if (email?.trim().toLowerCase() !== DEMO_EMAIL || ownerId === LEGACY_DEMO_OWNER_ID) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const movedWeddings = await client.query(
      `UPDATE weddings
       SET owner_id = $1
       WHERE owner_id = $2
         AND NOT EXISTS (SELECT 1 FROM weddings WHERE owner_id = $1)
       RETURNING id`,
      [ownerId, LEGACY_DEMO_OWNER_ID],
    );

    // Only move direct account records when the wedding collection moved. This
    // makes repeated requests safe and prevents overwriting an account that
    // already has planner-created data.
    if (movedWeddings.rowCount) {
      await client.query("UPDATE address_book_entries SET owner_id = $1 WHERE owner_id = $2", [ownerId, LEGACY_DEMO_OWNER_ID]);
      await client.query("UPDATE conversations SET owner_id = $1 WHERE owner_id = $2", [ownerId, LEGACY_DEMO_OWNER_ID]);
      await client.query("UPDATE editorial_posts SET owner_id = $1 WHERE owner_id = $2", [ownerId, LEGACY_DEMO_OWNER_ID]);
      await client.query("UPDATE social_accounts SET owner_id = $1 WHERE owner_id = $2", [ownerId, LEGACY_DEMO_OWNER_ID]);
      await client.query("UPDATE subscriptions SET owner_id = $1 WHERE owner_id = $2", [ownerId, LEGACY_DEMO_OWNER_ID]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}