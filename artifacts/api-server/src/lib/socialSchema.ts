import { pool } from "@workspace/db";
import { encryptToken, isEncryptedToken } from "./socialCrypto";

/**
 * The API server owns this small integration table and creates it idempotently
 * at boot. This keeps a new deployment from depending on a manual Drizzle
 * push before planners can connect a social account.
 */
export async function ensureSocialSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id text PRIMARY KEY,
      owner_id text NOT NULL,
      platform text NOT NULL,
      handle text NOT NULL DEFAULT '',
      page_id text,
      access_token text NOT NULL,
      refresh_token text,
      token_expires_at timestamptz,
      scopes text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'connected',
      stats_cache jsonb,
      stats_updated_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_owner_platform_idx
      ON social_accounts (owner_id, platform);

    -- Upgrade the first-generation social account table in place. The old
    -- table used an integer id and encrypted_access_token; keeping the
    -- additive migration here avoids losing connected accounts on deploy.
    ALTER TABLE social_accounts ALTER COLUMN id TYPE text USING id::text;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS access_token text;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS refresh_token text;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS page_id text;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS scopes text;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS status text;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS stats_cache jsonb;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS stats_updated_at timestamptz;
    ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS encrypted_access_token text;
    UPDATE social_accounts
      SET access_token = COALESCE(access_token, encrypted_access_token),
          handle = COALESCE(handle, ''),
          scopes = COALESCE(scopes, ''),
          status = COALESCE(status, 'connected')
      WHERE access_token IS NULL OR handle IS NULL OR scopes IS NULL OR status IS NULL;
    ALTER TABLE social_accounts ALTER COLUMN access_token SET NOT NULL;
    ALTER TABLE social_accounts ALTER COLUMN handle SET DEFAULT '';
    ALTER TABLE social_accounts ALTER COLUMN handle SET NOT NULL;
    ALTER TABLE social_accounts ALTER COLUMN scopes SET DEFAULT '';
    ALTER TABLE social_accounts ALTER COLUMN scopes SET NOT NULL;
    ALTER TABLE social_accounts ALTER COLUMN status SET DEFAULT 'connected';
    ALTER TABLE social_accounts ALTER COLUMN status SET NOT NULL;
  `);

  // Upgrade credentials created before storage encryption was introduced.
  // This runs before the API starts serving requests and is safe to repeat.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string; access_token: string; refresh_token: string | null }>(
      "SELECT id, access_token, refresh_token FROM social_accounts FOR UPDATE",
    );
    for (const row of rows) {
      if (isEncryptedToken(row.access_token) && (!row.refresh_token || isEncryptedToken(row.refresh_token))) continue;
      await client.query(
        "UPDATE social_accounts SET access_token = $1, refresh_token = $2, updated_at = now() WHERE id = $3",
        [
          isEncryptedToken(row.access_token) ? row.access_token : encryptToken(row.access_token),
          row.refresh_token ? (isEncryptedToken(row.refresh_token) ? row.refresh_token : encryptToken(row.refresh_token)) : null,
          row.id,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}