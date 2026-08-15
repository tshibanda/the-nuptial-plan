/**
 * Idempotent seed for the Apple App Review demo account.
 * Runs once on server startup; the DEMO_MARKER prevents duplicate inserts.
 */
import { pool } from "@workspace/db";
import { logger } from "./logger";

const OWNER_ID = "user_3HyOEsScTvQuzvLFDB5bbaGbDoq";
const DEMO_MARKER = "[APPLE_REVIEW_DEMO]";

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
    names: "Camille & Thomas",
    partner1: "Camille",
    partner2: "Thomas",
    date: "2026-06-20",
    venue: "Domaine de la Vallée, Chantilly",
    budget: 42000,
    guests: 118,
    notes: `${DEMO_MARKER} Dossier premium — réception champêtre chic, suivi depuis mai 2025.`,
  },
  {
    names: "Inès & Julien",
    partner1: "Inès",
    partner2: "Julien",
    date: "2026-08-29",
    venue: "Château de Vaux-le-Vicomte",
    budget: 68000,
    guests: 156,
    notes: `${DEMO_MARKER} Dossier en production — mariage élégant, cérémonie civile à Paris.`,
  },
  {
    names: "Sarah & Mehdi",
    partner1: "Sarah",
    partner2: "Mehdi",
    date: "2025-09-13",
    venue: "Maison des Oliviers, Aix-en-Provence",
    budget: 31500,
    guests: 92,
    notes: `${DEMO_MARKER} Dossier archivé — mariage livré, bilan client terminé en octobre 2025.`,
  },
  {
    names: "Louise & Adrien",
    partner1: "Louise",
    partner2: "Adrien",
    date: "2027-05-15",
    venue: "La Ferme du Petit Moulin, Normandie",
    budget: 27000,
    guests: 84,
    notes: `${DEMO_MARKER} Dossier signé — phase conception et recherche de prestataires.`,
  },
];

const guestNames = [
  ["Élodie Martin", "Marc Martin", "Nina Robert", "Paul Robert", "Claire Dubois", "Antoine Bernard", "Maya Lefèvre", "Hugo Petit", "Sophie Laurent", "Émilie Moreau", "Lucas Garnier", "Anaïs Roux"],
  ["Charlotte Morel", "Baptiste Morel", "Nora Haddad", "Yanis Haddad", "Amandine Girard", "Louis Fontaine", "Mélanie Chevalier", "Romain Perret", "Zoé Marchand", "Thomas Rey", "Lina Benali", "Arthur Colin"],
  ["Emma Rossi", "Léon Rossi", "Manon Blanc", "Théo Blanc", "Jade Fabre", "Maxime Vidal", "Alice Faure", "Nathan Giraud", "Chloé Reynaud", "Pauline André", "Sacha Michel", "Lola Masson"],
  ["Agathe Simon", "Gaspard Simon", "Victoire Henry", "Martin Henry", "Jeanne Noël", "Basile Noël", "Rose Fontaine", "Oscar Leroy", "Iris Legrand", "Valentin Roy", "Alix David", "Félix Gautier"],
];

const vendorTemplates: Array<[string, string, string, number, string]> = [
  ["Maison Lune", "Traiteur", "confirmed", 12800, "Clara Meunier"],
  ["Atelier Floréal", "Fleurs & décoration", "confirmed", 4600, "Morgane Petit"],
  ["Studio Alba", "Photographe", "confirmed", 2800, "Alba Rossi"],
  ["Les Voix de June", "Musique", "awaiting_contract", 2200, "June Bernard"],
  ["Papier de Saison", "Papeterie", "confirmed", 980, "Élodie Garnier"],
];

const categories = ["Lieu & réception", "Traiteur", "Fleurs & décoration", "Photo & vidéo", "Musique & animation", "Papeterie & cadeaux"];

function isoDate(offsetDays: number): string {
  const date = new Date(Date.UTC(2025, 0, 15));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function seedAppleReview(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM weddings WHERE owner_id = $1 AND notes LIKE $2 LIMIT 1",
      [OWNER_ID, `%${DEMO_MARKER}%`],
    );
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      logger.info("Apple Review demo data already exists; skipping seed.");
      return;
    }

    const weddingIds: number[] = [];
    for (const wedding of weddings) {
      const result = await client.query(
        `INSERT INTO weddings
          (owner_id, couple_name, partner1, partner2, currency, wedding_date, venue, budget_total, guest_count_target, notes)
         VALUES ($1,$2,$3,$4,'EUR',$5,$6,$7,$8,$9)
         RETURNING id`,
        [OWNER_ID, wedding.names, wedding.partner1, wedding.partner2, wedding.date, wedding.venue, wedding.budget * 100, wedding.guests, wedding.notes],
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
          [weddingId, name, `${name.toLowerCase().replaceAll(" ", ".")}@example.test`, String((index % 6) + 1), index % 4 === 0 ? "Végétarien" : "Aucune", status, index % 4 === 0, index % 6 === 0 ? "Famille proche" : null],
        );
      }

      const multiplier = weddingIndex === 1 ? 1.55 : weddingIndex === 2 ? 0.82 : weddingIndex === 3 ? 0.7 : 1;
      for (const [index, template] of vendorTemplates.entries()) {
        const [name, category, status, amount, contactName] = template;
        const vendor = await client.query(
          `INSERT INTO vendors (wedding_id,name,category,status,total_amount,deposit_amount,contact_name,contact_email,contact_phone,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [weddingId, name, category, status, Math.round(amount * multiplier) * 100, Math.round(amount * multiplier * 0.3) * 100, contactName, `${contactName!.toLowerCase().replaceAll(" ", ".")}@example.test`, "06 12 34 56 78", index === 0 ? "Contrat et dégustation suivis" : "Contact principal du dossier"],
        );
        const vendorId: number = vendor.rows[0].id as number;
        await client.query(
          `INSERT INTO contracts (wedding_id,vendor_id,vendor_name,status,total_amount,deposit_amount,signed_at,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [weddingId, vendorId, name, status === "confirmed" ? "signed" : "pending", Math.round(amount * multiplier) * 100, Math.round(amount * multiplier * 0.3) * 100, status === "confirmed" ? isoDate(-120 + weddingIndex * 20) : null, "Version relue avec les mariés et archivée dans le dossier."],
        );
        await client.query(
          `INSERT INTO payments (wedding_id,vendor_id,vendor_name,description,amount,due_date,status,paid_at,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [weddingId, vendorId, name, "Acompte contractuel", Math.round(amount * multiplier * 0.3) * 100, isoDate(30 + index * 18), index % 2 === 0 ? "paid" : "pending", index % 2 === 0 ? isoDate(-40 + index * 4) : null, "Échéance suivie par la planner."],
        );
      }

      for (const [index, category] of categories.entries()) {
        const allocated = Math.round(weddings[weddingIndex]!.budget * 100 * (0.12 + (index % 3) * 0.04));
        await client.query(
          `INSERT INTO budget_categories (wedding_id,name,allocated_cents,spent_cents,notes)
           VALUES ($1,$2,$3,$4,$5)`,
          [weddingId, category, allocated, Math.round(allocated * (index < 2 ? 0.72 : 0.38)), index === 0 ? "À vérifier avec le budget global" : "Suivi mensuel"],
        );
      }

      const events: Array<[string, string, number, string, string, string, boolean]> = [
        ["Point d'avancement client", "Revue des décisions et arbitrages", 10, "10:00", "Visioconférence", "Planner + couple", false],
        ["Visite technique du lieu", "Repérage accès, plan B et implantation", 35, "14:30", weddingIndex === 1 ? "Château de Vaux-le-Vicomte" : weddings[weddingIndex]!.venue, "Planner + lieu", weddingIndex === 2],
        ["Dégustation traiteur", "Validation du menu et des accords", 65, "12:00", "Maison Lune", "Couple + traiteur", weddingIndex === 2],
        ["Brief équipe Jour J", "Répartition des rôles et déroulé minute par minute", 95, "18:00", "Bureau de la planner", "Équipe production", false],
      ];
      for (const [title, detail, offset, time, location, actors, completed] of events) {
        await client.query(
          `INSERT INTO calendar_events (wedding_id,title,detail,event_date,event_time,location,actors,tone,completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'gold',$8)`,
          [weddingId, title, detail, isoDate(offset + weddingIndex * 12), time, location, actors, completed],
        );
      }

      for (const [index, title] of ["Brief initial et cahier des charges", "Sélection du lieu", "Validation du budget", "Choix des prestataires", "Envoi des invitations", "Coordination finale"].entries()) {
        await client.query(
          `INSERT INTO milestones (wedding_id,title,detail,due_date,completed)
           VALUES ($1,$2,$3,$4,$5)`,
          [weddingId, title, "Jalon de production suivi dans le rétroplanning de l'agence.", isoDate(-180 + index * 45 + weddingIndex * 15), weddingIndex === 2 || index < 2],
        );
      }

      for (const [index, description] of ["Dossier créé et brief client enregistré", "Budget initial structuré", "Prestataires ajoutés au dossier", "Point de suivi réalisé", "Document contractuel archivé"].entries()) {
        await client.query(
          `INSERT INTO activity (wedding_id,description,entity_type,initials,created_at)
           VALUES ($1,$2,'wedding','NP',NOW() - ($3 || ' days')::interval)`,
          [weddingId, description, String(220 - weddingIndex * 30 - index * 18)],
        );
      }

      await client.query(
        `INSERT INTO notifications (wedding_id,kind,title,body,route,read,dedupe_key)
         VALUES ($1,'deadline','Échéances à surveiller','Deux actions de production arrivent cette semaine.','/retroplanning',false,$2)`,
        [weddingId, `apple-review-${weddingId}-deadline`],
      );

      await client.query(
        `INSERT INTO documents (wedding_id,entity_type,name,object_path,content_type,size)
         VALUES ($1,'wedding',$2,$3,'application/pdf',248000)`,
        [weddingId, `Brief client — ${weddingIndex + 1}.pdf`, `/objects/apple-review-demo/brief-${weddingIndex + 1}.pdf`],
      );
    }

    const addressBook = [
      ["Maison Lune", "Traiteur", "Clara Meunier", "clara@maison-lune.example", "06 20 11 42 88", "https://maison-lune.example"],
      ["Atelier Floréal", "Fleurs & décoration", "Morgane Petit", "morgane@atelier-floreal.example", "06 32 54 18 90", "https://atelier-floreal.example"],
      ["Studio Alba", "Photographe", "Alba Rossi", "bonjour@studio-alba.example", "06 41 28 63 17", "https://studio-alba.example"],
      ["Les Voix de June", "Musique", "June Bernard", "hello@lesvoixdejune.example", "06 19 87 54 21", "https://lesvoixdejune.example"],
      ["Papier de Saison", "Papeterie", "Élodie Garnier", "bonjour@papierdesaison.example", "06 73 44 12 66", "https://papierdesaison.example"],
      ["Domaine & Sens", "Lieu", "Hélène Martin", "contact@domaine-sens.example", "06 15 39 80 22", "https://domaine-sens.example"],
      ["La Brigade Nomade", "Traiteur", "Karim Daoud", "karim@brigade-nomade.example", "06 28 70 11 45", "https://brigade-nomade.example"],
      ["Ligne Claire", "Wedding designer", "Maud Lefort", "maud@ligne-claire.example", "06 52 61 04 33", "https://ligne-claire.example"],
      ["Transport Belle Époque", "Transport", "Nicolas Perrin", "nicolas@belle-epoque.example", "06 44 09 72 13", "https://belle-epoque.example"],
      ["Maison Sillage", "Beauté", "Louise Caron", "louise@maison-sillage.example", "06 31 45 08 77", "https://maison-sillage.example"],
    ];
    for (const [name, category, contactName, email, phone, website] of addressBook) {
      await client.query(
        `INSERT INTO address_book_entries (owner_id,name,category,contact_name,contact_email,contact_phone,website,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'Contact favori de l''agence — recommandé pour les mariages élégants.')`,
        [OWNER_ID, name, category, contactName, email, phone, website],
      );
    }

    const conversation = await client.query(
      `INSERT INTO conversations (owner_id,title) VALUES ($1,'Préparation de la saison 2026') RETURNING id`,
      [OWNER_ID],
    );
    for (const [role, content] of [
      ["user", "Préparer le brief de la saison et prioriser les dossiers actifs."],
      ["assistant", "Les dossiers Camille & Thomas et Inès & Julien sont prioritaires. Le prochain point de production concerne les prestataires et les échéances budget."],
      ["user", "Ajouter une note de suivi pour l'équipe."],
      ["assistant", "Note ajoutée au suivi de l'agence : vérifier les acomptes et partager le déroulé Jour J avant chaque réunion finale."],
    ] as const) {
      await client.query(
        `INSERT INTO messages (conversation_id,role,content) VALUES ($1,$2,$3)`,
        [conversation.rows[0].id, role, content],
      );
    }

    await client.query("COMMIT");
    logger.info({ weddingCount: weddingIds.length, ownerId: OWNER_ID }, "Apple Review demo data seeded successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
