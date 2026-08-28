import { and, eq } from "drizzle-orm";
import { db, pushDevicesTable, weddingsTable } from "@workspace/db";
import { logger } from "./logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

type PushPayload = {
  title: string;
  body: string;
  route?: string | null;
  type?: string;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  details?: { error?: string };
};

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

/**
 * Sends a native push notification to every registered device belonging to the
 * wedding owner. Expo ticket errors are handled without exposing device tokens
 * in logs; invalid tokens are removed so later sends stay reliable.
 */
export async function sendPushNotificationToWedding(weddingId: number, payload: PushPayload): Promise<void> {
  const [wedding] = await db.select({ ownerId: weddingsTable.ownerId })
    .from(weddingsTable)
    .where(eq(weddingsTable.id, weddingId))
    .limit(1);
  const ownerId = wedding?.ownerId;
  if (!ownerId) return;

  const devices = await db.select({ token: pushDevicesTable.expoPushToken })
    .from(pushDevicesTable)
    .where(eq(pushDevicesTable.ownerId, ownerId));
  if (!devices.length) return;

  for (const deviceBatch of chunks(devices, EXPO_BATCH_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deviceBatch.map(({ token }) => ({
          to: token,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: { route: payload.route ?? undefined, type: payload.type ?? undefined, weddingId },
        }))),
      });

      if (!response.ok) {
        logger.warn({ weddingId, status: response.status, deviceCount: deviceBatch.length }, "Expo push delivery request failed");
        continue;
      }

      const result = await response.json() as { data?: ExpoPushTicket[] };
      const invalidTokens = (result.data ?? [])
        .flatMap((ticket, index) =>
          ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
            ? [deviceBatch[index]?.token]
            : [],
        )
        .filter((token): token is string => Boolean(token));

      if (invalidTokens.length) {
        await Promise.all(invalidTokens.map((token) =>
          db.delete(pushDevicesTable).where(and(
            eq(pushDevicesTable.ownerId, ownerId),
            eq(pushDevicesTable.expoPushToken, token),
          )),
        ));
      }
    } catch (error) {
      logger.warn({ error, weddingId, deviceCount: deviceBatch.length }, "Expo push delivery request failed");
    }
  }
}