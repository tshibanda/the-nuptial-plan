/**
 * Idempotent seed for the Apple App Review demo account.
 * The target review account is populated after its first authenticated request,
 * so its Clerk user ID is never hard-coded into a development-only seed.
 */
import { pool } from "@workspace/db";
import { logger } from "./logger";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";

const DEMO_MARKER = "[APPLE_REVIEW_DEMO]";
const HISTORICAL_REVIEW_OWNER_ID = "user_3HyOEsScTvQuzvLFDB5bbaGbDoq";

type WeddingSeed = {
  names: string;
  partner1: string;
  partner2: string;
  date: string;
  venue: string;
  budget: number;
  guests: number;
  notes: string;
};

const weddings: WeddingSeed[] = [
  {
    names: "Maya & Daniel",
    partner1: "Maya",
    partner2: "Daniel",
    date: "2026-10-24",
    venue: "The Willow Estate, Oxfordshire",
    budget: 42000,
    guests: 118,
    notes: `${DEMO_MARKER} Premium planning file — relaxed garden celebration, managed since May 2025.`,
  },
  {
    names: "Harper & Lewis",
    partner1: "Harper",
    partner2: "Lewis",
    date: "2026-12-12",
    venue: "Pembroke Hall, London",
    budget: 68000,
    guests: 156,
    notes: `${DEMO_MARKER} Active production file — elegant city wedding with a civil ceremony.`,
  },
  {
    names: "Sophie & Alex",
    partner1: "Sophie",
    partner2: "Alex",
    date: "2025-09-13",
    venue: "The Olive House, Cotswolds",
    budget: 31500,
    guests: 92,
    notes: `${DEMO_MARKER} Archived project — wedding delivered and client debrief completed in October 2025.`,
  },
  {
    names: "Olivia & James",
    partner1: "Olivia",
    partner2: "James",
    date: "2027-05-15",
    venue: "The Mill Barn, Norfolk",
    budget: 27000,
    guests: 84,
    notes: `${DEMO_MARKER} Signed project — in the design and vendor research phase.`,
  },
];

const guestNames = [
  ["Emma Wilson", "Oliver Wilson", "Amelia Carter", "Noah Carter", "Grace Bennett", "Henry Brooks", "Isla Reed", "Theo Walker", "Lily Davies", "George Hall", "Florence Price", "Arthur Green"],
  ["Charlotte Moore", "Benjamin Moore", "Nora Khan", "Yusuf Khan", "Ava Turner", "Leo Clarke", "Mia Collins", "Jack Perry", "Zoe Morgan", "Thomas Ray", "Layla Shah", "William Cole"],
  ["Ella Rossi", "Leon Rossi", "Hannah White", "Theo White", "Ruby Ford", "Max Vidal", "Alice Foster", "Nathan Grant", "Chloe Reynolds", "Paige Andrews", "Sam Mitchell", "Lola Mason"],
  ["Agatha Simon", "Jasper Simon", "Victoria Henry", "Martin Henry", "Jane Noel", "Basil Noel", "Rose Foster", "Oscar Lloyd", "Iris Grant", "Valentine Roy", "Alex Davis", "Felix Taylor"],
];

const vendorTemplates: Array<[string, string, string, number, string]> = [
  ["Harvest & Hearth", "Catering", "confirmed", 12800, "Clara Morgan"],
  ["Wildflower Atelier", "Flowers & styling", "confirmed", 4600, "Morgan Ellis"],
  ["Northlight Studio", "Photography", "confirmed", 2800, "Alba Rossi"],
  ["The June Collective", "Music", "awaiting_contract", 2200, "June Bennett"],
  ["Paper & Thread", "Stationery", "confirmed", 980, "Eleanor Grant"],
];

const categories = ["Venue & reception", "Catering", "Flowers & styling", "Photography & video", "Music & entertainment", "Stationery & gifts"];

function dateRelativeToWedding(weddingDate: string, offsetDays: number): string {
  const date = new Date(`${weddingDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function saveReviewBrief(
  ownerId: string,
  projectIndex: number,
  wedding: WeddingSeed,
): Promise<{ objectPath: string; size: number }> {
  const objectPath = `/objects/apple-review-demo/${ownerId}/client-brief-${projectIndex + 1}.txt`;
  const storage = new ObjectStorageService();
  const privateDir = storage.getPrivateObjectDir().replace(/\/+$/, "");
  const fullPath = `${privateDir}${objectPath.slice("/objects".length)}`;
  const [bucketName, ...objectParts] = fullPath.replace(/^\//, "").split("/");
  const content = [
    `CLIENT BRIEF — ${wedding.names.toUpperCase()}`,
    "",
    `Wedding date: ${wedding.date}`,
    `Venue: ${wedding.venue}`,
    `Working budget: €${wedding.budget.toLocaleString("en-GB")}`,
    `Guest target: ${wedding.guests}`,
    "",
    "Planning focus",
    "• Keep the guest experience warm, personal and calm.",
    "• Confirm all supplier handovers before the final coordination meeting.",
    "• Maintain a clear weather contingency plan with the venue team.",
  ].join("\n");
  const contentBytes = Buffer.from(content, "utf8");

  await objectStorageClient
    .bucket(bucketName!)
    .file(objectParts.join("/"))
    .save(contentBytes, {
      contentType: "text/plain; charset=utf-8",
      resumable: false,
      metadata: { cacheControl: "private, max-age=0" },
    });

  return { objectPath, size: contentBytes.byteLength };
}

export async function seedAppleReviewForOwner(ownerId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [ownerId]);

    const existing = await client.query(
      "SELECT id FROM weddings WHERE owner_id = $1 LIMIT 1",
      [ownerId],
    );
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      logger.info("Apple Review workspace already contains data; skipping seed.");
      return;
    }

    const weddingIds: number[] = [];
    for (const wedding of weddings) {
      const result = await client.query(
        `INSERT INTO weddings
          (owner_id, couple_name, partner1, partner2, currency, wedding_date, venue, budget_total, guest_count_target, notes)
         VALUES ($1,$2,$3,$4,'EUR',$5,$6,$7,$8,$9)
         RETURNING id`,
         [ownerId, wedding.names, wedding.partner1, wedding.partner2, wedding.date, wedding.venue, wedding.budget * 100, wedding.guests, wedding.notes],
      );
      weddingIds.push(result.rows[0].id as number);
    }

    for (const [weddingIndex, weddingId] of weddingIds.entries()) {
      const names = guestNames[weddingIndex]!;
      for (const [index, name] of names.entries()) {
        const status = weddingIndex === 2 ? "confirmed" : index % 5 === 0 ? "declined" : index % 3 === 0 ? "pending" : "confirmed";
        await client.query(
          `INSERT INTO guests (wedding_id,name,email,table_number,dietary,rsvp_status,plus_one,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
           [weddingId, name, `${name.toLowerCase().replaceAll(" ", ".")}@example.test`, String((index % 6) + 1), index % 4 === 0 ? "Vegetarian" : "No dietary requirements", status, index % 4 === 0, index % 6 === 0 ? "Close family" : null],
        );
      }

      const multiplier = weddingIndex === 1 ? 1.55 : weddingIndex === 2 ? 0.82 : weddingIndex === 3 ? 0.7 : 1;
      for (const [index, template] of vendorTemplates.entries()) {
        const [name, category, status, amount, contactName] = template;
        const vendor = await client.query(
          `INSERT INTO vendors (wedding_id,name,category,status,total_amount,deposit_amount,contact_name,contact_email,contact_phone,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
           [weddingId, name, category, status, Math.round(amount * multiplier) * 100, Math.round(amount * multiplier * 0.3) * 100, contactName, `${contactName!.toLowerCase().replaceAll(" ", ".")}@example.test`, "+44 20 7946 0158", index === 0 ? "Contract and tasting tracked" : "Primary supplier contact for this project"],
        );
        const vendorId: number = vendor.rows[0].id as number;
        await client.query(
          `INSERT INTO contracts (wedding_id,vendor_id,vendor_name,status,total_amount,deposit_amount,signed_at,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
           [weddingId, vendorId, name, status === "confirmed" ? "signed" : "pending", Math.round(amount * multiplier) * 100, Math.round(amount * multiplier * 0.3) * 100, status === "confirmed" ? dateRelativeToWedding(weddings[weddingIndex]!.date, -180 + weddingIndex * 20) : null, "Reviewed with the couple and saved in the project file."],
        );
        await client.query(
          `INSERT INTO payments (wedding_id,vendor_id,vendor_name,description,amount,due_date,status,paid_at,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
           [weddingId, vendorId, name, "Contract deposit", Math.round(amount * multiplier * 0.3) * 100, dateRelativeToWedding(weddings[weddingIndex]!.date, -150 + index * 22), index % 2 === 0 ? "paid" : "pending", index % 2 === 0 ? dateRelativeToWedding(weddings[weddingIndex]!.date, -165 + index * 20) : null, "Due date tracked by the planner."],
        );
      }

      for (const [index, category] of categories.entries()) {
        const allocated = Math.round(weddings[weddingIndex]!.budget * 100 * (0.12 + (index % 3) * 0.04));
        await client.query(
          `INSERT INTO budget_categories (wedding_id,name,allocated_cents,spent_cents,notes)
           VALUES ($1,$2,$3,$4,$5)`,
           [weddingId, category, allocated, Math.round(allocated * (index < 2 ? 0.72 : 0.38)), index === 0 ? "Review against the total project budget" : "Monthly tracking"],
        );
      }

      const events: Array<[string, string, number, string, string, string, boolean]> = [
        ["Client progress meeting", "Review decisions and open approvals", -85, "10:00", "Video call", "Planner + couple", false],
        ["Venue walkthrough", "Review access, contingency plan and layout", -55, "14:30", weddingIndex === 1 ? "Pembroke Hall, London" : weddings[weddingIndex]!.venue, "Planner + venue team", weddingIndex === 2],
        ["Catering tasting", "Confirm menu and drinks pairing", -35, "12:00", "Harvest & Hearth", "Couple + caterer", weddingIndex === 2],
        ["Wedding-day team briefing", "Assign roles and review the minute-by-minute schedule", -10, "18:00", "Planner's studio", "Production team", false],
      ];
      for (const [title, detail, offset, time, location, actors, completed] of events) {
        await client.query(
          `INSERT INTO calendar_events (wedding_id,title,detail,event_date,event_time,location,actors,tone,completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'gold',$8)`,
           [weddingId, title, detail, dateRelativeToWedding(weddings[weddingIndex]!.date, offset), time, location, actors, completed],
        );
      }

      for (const [index, title] of ["Discovery brief and project scope", "Venue selection", "Budget approval", "Supplier selection", "Invitation mailing", "Final coordination"].entries()) {
        await client.query(
          `INSERT INTO milestones (wedding_id,title,detail,due_date,completed)
           VALUES ($1,$2,$3,$4,$5)`,
           [weddingId, title, "Production milestone tracked in the studio timeline.", dateRelativeToWedding(weddings[weddingIndex]!.date, -240 + index * 42), weddingIndex === 2 || index < 2],
        );
      }

      for (const [index, description] of ["Project created and client brief captured", "Initial budget structured", "Suppliers added to the project", "Progress meeting completed", "Contract document filed"].entries()) {
        await client.query(
          `INSERT INTO activity (wedding_id,description,entity_type,initials,created_at)
           VALUES ($1,$2,'wedding','NP',NOW() - ($3 || ' days')::interval)`,
          [weddingId, description, String(220 - weddingIndex * 30 - index * 18)],
        );
      }

      await client.query(
        `INSERT INTO notifications (wedding_id,kind,title,body,route,read,dedupe_key)
         VALUES ($1,'deadline','Deadlines to watch','Two production actions are due this week.','/retroplanning',false,$2)`,
        [weddingId, `apple-review-${weddingId}-deadline`],
      );

      const brief = await saveReviewBrief(ownerId, weddingIndex, weddings[weddingIndex]!);
      await client.query(
        `INSERT INTO documents (wedding_id,entity_type,name,object_path,content_type,size)
         VALUES ($1,'wedding',$2,$3,$4,$5)`,
         [weddingId, `Client brief — ${weddings[weddingIndex]!.names}.txt`, brief.objectPath, "text/plain", brief.size],
      );
    }

    const addressBook = [
      ["Harvest & Hearth", "Catering", "Clara Morgan", "clara@harvest-hearth.example", "+44 20 7946 0101", "https://harvest-hearth.example"],
      ["Wildflower Atelier", "Flowers & styling", "Morgan Ellis", "morgan@wildflower-atelier.example", "+44 20 7946 0102", "https://wildflower-atelier.example"],
      ["Northlight Studio", "Photography", "Alba Rossi", "hello@northlight-studio.example", "+44 20 7946 0103", "https://northlight-studio.example"],
      ["The June Collective", "Music", "June Bennett", "hello@june-collective.example", "+44 20 7946 0104", "https://june-collective.example"],
      ["Paper & Thread", "Stationery", "Eleanor Grant", "hello@paper-thread.example", "+44 20 7946 0105", "https://paper-thread.example"],
      ["Willow Estate", "Venue", "Helen Martin", "contact@willow-estate.example", "+44 20 7946 0106", "https://willow-estate.example"],
      ["The Roaming Table", "Catering", "Karim Daoud", "karim@roaming-table.example", "+44 20 7946 0107", "https://roaming-table.example"],
      ["Clear Line Studio", "Wedding design", "Maud Lefort", "maud@clear-line.example", "+44 20 7946 0108", "https://clear-line.example"],
      ["Vintage Car Co.", "Transport", "Nicholas Perrin", "nicholas@vintagecar.example", "+44 20 7946 0109", "https://vintagecar.example"],
      ["Sillage Beauty", "Beauty", "Louise Caron", "louise@sillage-beauty.example", "+44 20 7946 0110", "https://sillage-beauty.example"],
    ];
    for (const [name, category, contactName, email, phone, website] of addressBook) {
      await client.query(
        `INSERT INTO address_book_entries (owner_id,name,category,contact_name,contact_email,contact_phone,website,notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'Favourite studio contact — recommended for refined weddings.')`,
         [ownerId, name, category, contactName, email, phone, website],
      );
    }

    const conversation = await client.query(
      `INSERT INTO conversations (owner_id,title) VALUES ($1,'2026 season planning') RETURNING id`,
      [ownerId],
    );
    for (const [role, content] of [
      ["user", "Prepare the season brief and prioritise the active projects."],
      ["assistant", "Maya & Daniel and Harper & Lewis are the priority projects. The next production focus is supplier decisions and budget due dates."],
      ["user", "Add a follow-up note for the team."],
      ["assistant", "Team note added: check deposits and share the wedding-day schedule before every final planning meeting."],
    ] as const) {
      await client.query(
        `INSERT INTO messages (conversation_id,role,content) VALUES ($1,$2,$3)`,
        [conversation.rows[0].id, role, content],
      );
    }

    await client.query("COMMIT");
    logger.info({ weddingCount: weddingIds.length }, "Apple Review demo data seeded successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Keeps the historic review workspace available without relying on it for the
 * dedicated Apple Review account, which is seeded after it authenticates. */
export async function seedAppleReview(): Promise<void> {
  await seedAppleReviewForOwner(HISTORICAL_REVIEW_OWNER_ID);
}
