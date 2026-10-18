import { pool } from "@workspace/db";

export type DemoLanguage = "fr" | "en";

export interface SeedOnboardingDemoResult {
  created: boolean;
  weddingId: number | null;
}

function dateFromToday(offsetDays: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function seedOnboardingDemo(
  ownerId: string,
  language: DemoLanguage,
): Promise<SeedOnboardingDemoResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`tnp-onboarding-demo:${ownerId}`],
    );

    const existing = await client.query<{ id: number }>(
      "SELECT id FROM weddings WHERE owner_id = $1 ORDER BY id LIMIT 1",
      [ownerId],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { created: false, weddingId: existing.rows[0].id };
    }

    const isFrench = language === "fr";
    const weddingDate = dateFromToday(180);
    const venue = isFrench ? "Domaine des Ormes" : "Willow Hall";
    const demoNote = isFrench
      ? "Dossier de démonstration : ces informations sont fictives. Vous pouvez les modifier ou supprimer ce dossier."
      : "Sample wedding file: all details are fictional. You can edit them or delete this file.";

    const weddingResult = await client.query<{ id: number }>(
      `INSERT INTO weddings
        (owner_id, couple_name, partner1, partner2, currency, wedding_date, venue, budget_total, guest_count_target, notes)
       VALUES ($1, $2, $3, $4, 'EUR', $5, $6, $7, $8, $9)
       RETURNING id`,
      [ownerId, "Camille & Louis", "Camille", "Louis", weddingDate, venue, 2_400_000, 80, demoNote],
    );
    const weddingId = weddingResult.rows[0]?.id;
    if (!weddingId) throw new Error("Sample wedding insert did not return an ID");

    const guestNames = ["Léa Martin", "Hugo Bernard", "Inès Petit", "Noah Robert", "Sarah Richard", "Adam Dubois"];
    const guestStatus = ["confirmed", "confirmed", "pending", "declined", "pending", "confirmed"];
    for (const [index, name] of guestNames.entries()) {
      await client.query(
        `INSERT INTO guests
          (wedding_id, name, email, table_number, dietary, rsvp_status, plus_one, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          weddingId,
          isFrench ? name : ["Lena Martin", "Hugo Bernard", "Ines Petit", "Noah Robert", "Sarah Richard", "Adam Dubois"][index],
          `invite${String(index + 1).padStart(2, "0")}@example.test`,
          index < 4 ? String(index + 1) : null,
          index === 2 ? (isFrench ? "Végétarien" : "Vegetarian") : null,
          guestStatus[index],
          index === 0 || index === 4,
          isFrench ? "Donnée fictive de démonstration" : "Fictional sample data",
        ],
      );
    }

    const vendors = [
      {
        name: venue,
        category: isFrench ? "Lieu de réception" : "Venue",
        status: "confirmed",
        amount: 6_500,
        contact: "Émilie Laurent",
      },
      {
        name: isFrench ? "Les Tables de Jeanne" : "Gather & Grain",
        category: isFrench ? "Traiteur" : "Catering",
        status: "confirmed",
        amount: 7_200,
        contact: "Jeanne Moreau",
      },
      {
        name: isFrench ? "Atelier Lumière" : "Northlight Studio",
        category: isFrench ? "Photographie" : "Photography",
        status: "awaiting_contract",
        amount: 2_200,
        contact: "Alex Morgan",
      },
      {
        name: isFrench ? "Fleurs de Saison" : "Wildflower Atelier",
        category: isFrench ? "Fleurs" : "Flowers",
        status: "pending",
        amount: 1_650,
        contact: "Mina Laurent",
      },
    ];

    const vendorIds: number[] = [];
    for (const [index, vendor] of vendors.entries()) {
      const deposit = Math.round(vendor.amount * 0.3);
      const vendorResult = await client.query<{ id: number }>(
        `INSERT INTO vendors
          (wedding_id, name, category, status, total_amount, deposit_amount, contact_name, contact_email, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          weddingId,
          vendor.name,
          vendor.category,
          vendor.status,
          vendor.amount * 100,
          deposit * 100,
          vendor.contact,
          `prestataire${index + 1}@example.test`,
          isFrench ? "Coordonnées fictives — prestataire d’exemple." : "Fictional contact details — sample vendor.",
        ],
      );
      const vendorId = vendorResult.rows[0]?.id;
      if (!vendorId) throw new Error("Sample vendor insert did not return an ID");
      vendorIds.push(vendorId);

      const contractStatus = index < 2 ? "signed" : "pending";
      await client.query(
        `INSERT INTO contracts
          (wedding_id, vendor_id, vendor_name, status, total_amount, deposit_amount, signed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          weddingId,
          vendorId,
          vendor.name,
          contractStatus,
          vendor.amount * 100,
          deposit * 100,
          index < 2 ? dateFromToday(-12 + index * 4) : null,
          isFrench ? "Contrat fictif de démonstration." : "Fictional sample contract.",
        ],
      );

      await client.query(
        `INSERT INTO payments
          (wedding_id, vendor_id, vendor_name, description, amount, due_date, status, paid_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          weddingId,
          vendorId,
          vendor.name,
          isFrench ? "Acompte de réservation" : "Booking deposit",
          deposit * 100,
          dateFromToday(14 + index * 8),
          index === 0 ? "paid" : "pending",
          index === 0 ? dateFromToday(-7) : null,
          isFrench ? "Paiement fictif de démonstration." : "Fictional sample payment.",
        ],
      );
    }

    const budgetCategories = isFrench
      ? [
          ["Lieu & réception", 6_000, 6_000],
          ["Traiteur", 7_000, 2_800],
          ["Photographie", 2_200, 660],
          ["Fleurs & décoration", 1_800, 450],
          ["Musique", 1_300, 0],
          ["Tenues", 2_900, 300],
          ["Papeterie", 600, 0],
          ["Imprévus", 2_200, 0],
        ]
      : [
          ["Venue & reception", 6_000, 6_000],
          ["Catering", 7_000, 2_800],
          ["Photography", 2_200, 660],
          ["Flowers & styling", 1_800, 450],
          ["Music", 1_300, 0],
          ["Attire", 2_900, 300],
          ["Stationery", 600, 0],
          ["Contingency", 2_200, 0],
        ];
    for (const [index, [name, allocated, spent]] of budgetCategories.entries()) {
      await client.query(
        `INSERT INTO budget_categories (wedding_id, name, allocated_cents, spent_cents, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          weddingId,
          name,
          Number(allocated) * 100,
          Number(spent) * 100,
          index === 0 ? demoNote : null,
        ],
      );
    }

    const events = isFrench
      ? [
          ["Rendez-vous de suivi", "Valider les décisions et les prochaines étapes", 5, "10:00", "En visioconférence"],
          ["Dégustation du menu", "Choisir le menu et les boissons", 24, "12:30", venue],
          ["Visite technique", "Vérifier le plan de salle et les accès", 60, "14:00", venue],
          ["Cérémonie & réception", "Le grand jour", 180, "15:00", venue],
        ]
      : [
          ["Planning check-in", "Review decisions and upcoming actions", 5, "10:00", "Video call"],
          ["Menu tasting", "Choose the menu and drinks", 24, "12:30", venue],
          ["Venue walkthrough", "Check the floor plan and access", 60, "14:00", venue],
          ["Ceremony & reception", "The wedding day", 180, "15:00", venue],
        ];
    for (const [title, detail, dateOffset, time, location] of events) {
      await client.query(
        `INSERT INTO calendar_events
          (wedding_id, title, detail, event_date, event_time, location, actors, tone, completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'gold', false)`,
        [
          weddingId,
          title,
          detail,
          dateFromToday(Number(dateOffset)),
          time,
          location,
          isFrench ? "Couple et organisatrice" : "Couple and planner",
        ],
      );
    }

    const milestones = isFrench
      ? ["Valider le budget", "Réserver le lieu", "Choisir les prestataires", "Envoyer les invitations", "Confirmer le menu", "Finaliser le déroulé"]
      : ["Approve the budget", "Book the venue", "Choose the vendors", "Send invitations", "Confirm the menu", "Finalize the schedule"];
    for (const [index, title] of milestones.entries()) {
      await client.query(
        `INSERT INTO milestones (wedding_id, title, detail, due_date, completed)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          weddingId,
          title,
          isFrench ? "Étape fictive à adapter à votre organisation." : "Fictional milestone to adapt to your plans.",
          dateFromToday(30 + index * 20),
          index === 0,
        ],
      );
    }

    await client.query(
      `INSERT INTO activity (wedding_id, description, entity_type, initials)
       VALUES ($1, $2, 'wedding', 'CL')`,
      [weddingId, isFrench ? "Dossier de démonstration créé" : "Sample wedding file created"],
    );

    await client.query("COMMIT");
    return { created: true, weddingId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
