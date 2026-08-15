import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const out = "marketing/tnp-launch";
const plum = "#3C1A3C";
const plum2 = "#5D2D5D";
const rose = "#CC8C94";
const sage = "#649064";
const gold = "#C8A96E";
const cream = "#F8F3EE";
const dark = "#160A16";

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (x, y, value, size, fill = cream, weight = 400, anchor = "start", family = "Arial") =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`;
const multiText = (x, y, value, size, fill = cream, weight = 400, anchor = "start", family = "Arial", lineHeight = 1.12) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}">${value.split("\n").map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * lineHeight}">${esc(line)}</tspan>`).join("")}</text>`;
const wrap = (value, maxChars) => {
  const words = value.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
};
const rect = (x, y, w, h, fill, r = 0, stroke = "none", sw = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line = (x1, y1, x2, y2, stroke = gold, sw = 2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;

function shell(w, h, title, kicker, body, index, total) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${plum}"/><stop offset="1" stop-color="${plum2}"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="${rose}" stop-opacity=".45"/><stop offset="1" stop-color="${rose}" stop-opacity="0"/></radialGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#120612" flood-opacity=".35"/></filter>
  </defs>
  ${rect(0, 0, w, h, "url(#bg)")}
  <circle cx="${w - 60}" cy="120" r="240" fill="url(#glow)"/>
  <circle cx="20" cy="${h - 140}" r="170" fill="${sage}" opacity=".15"/>
  ${line(70, 92, 180, 92, gold, 4)}
  ${text(70, 155, "THE NUPTIAL PLAN", 26, gold, 700, "start", "Arial")}
  ${text(70, 250, kicker.toUpperCase(), 24, gold, 700, "start", "Arial")}
  ${multiText(70, 340, title, 66, cream, 700, "start", "Georgia")}
  ${body}
  ${text(w / 2, h - 80, `${String(index).padStart(2, "0")}  /  ${String(total).padStart(2, "0")}`, 22, gold, 700, "middle", "Arial")}
  </svg>`;
}

function dashboardMock(x, y, w, h) {
  return `${rect(x, y, w, h, "#FDF9FD", 32, "#E8DDE8", 2)}
  ${rect(x, y, w, 100, plum2, 32)}
  ${text(x + 36, y + 42, "Bonjour, Élodie", 24, "#F8EAF4", 600)}
  ${text(x + 36, y + 73, "LA CÉLÉBRATION", 14, gold, 700)}
  ${text(x + 36, y + 145, "Élodie & Thomas", 34, plum, 700, "start", "Georgia")}
  ${text(x + 36, y + 180, "12 septembre 2026 · Paris", 17, "#716471", 400)}
  ${text(x + 36, y + 245, "EN UN COUP D'ŒIL", 13, "#A8893E", 700)}
  ${rect(x + 30, y + 270, w - 60, 95, "#F2E6F2", 18)}
  ${text(x + 55, y + 310, "Jours restants", 16, plum, 600)}
  ${text(x + 55, y + 350, "214", 42, plum, 700, "start", "Georgia")}
  ${rect(x + 30, y + 390, (w - 75) / 2, 118, "#EBF3EB", 18)}
  ${text(x + 52, y + 430, "Invités confirmés", 14, "#4A6A4A", 600)}
  ${text(x + 52, y + 480, "86", 34, "#4A6A4A", 700, "start", "Georgia")}
  ${rect(x + 45 + (w - 75) / 2, y + 390, (w - 75) / 2, 118, "#FAF0F1", 18)}
  ${text(x + 67 + (w - 75) / 2, y + 430, "Budget engagé", 14, "#A0606A", 600)}
  ${text(x + 67 + (w - 75) / 2, y + 480, "42 %", 34, "#A0606A", 700, "start", "Georgia")}`;
}

function phone(screen, x, y, w = 690, h = 1280) {
  return `${rect(x, y, w, h, dark, 54, "#9A6A9A", 3)}
    ${rect(x + 18, y + 18, w - 36, h - 36, screen, 40)}`;
}

const appShots = [
  {
    file: "appstore-01-dashboard",
    title: "Pilotez chaque\nmariage avec\nune vue claire",
    kicker: "Votre activité en un coup d'œil",
    body: dashboardMock(170, 790, 950, 690),
  },
  {
    file: "appstore-02-budget",
    title: "Le budget de\nvos clients,\nmaîtrisé",
    kicker: "Gardez le cap",
    body: `${phone("#FDF9FD", 195, 760, 910, 1440)}${text(250, 880, "Budget", 32, plum, 700, "start", "Georgia")}${text(250, 935, "Votre équilibre, en un coup d'œil", 17, "#716471")}${rect(250, 1010, 800, 220, "#F2E6F2", 24)}${text(300, 1080, "Budget total", 19, plum, 600)}${text(300, 1160, "18 500 €", 52, plum, 700, "start", "Georgia")}${line(300, 1230, 1000, 1230, "#D7CDD7", 14)}${line(300, 1230, 760, 1230, gold, 14)}${text(250, 1340, "Catégories", 21, plum, 700)}${["Lieu & réception", "Traiteur", "Fleurs & décoration", "Photographie"].map((v, i) => `${text(270, 1415 + i * 92, v, 18, plum, 600)}${text(1000, 1415 + i * 92, ["7 200 €", "4 800 €", "1 850 €", "1 200 €"][i], 18, "#716471", 600, "end")}${line(270, 1435 + i * 92, 1000, 1435 + i * 92, "#E8DDE8", 2)}`).join("")}`,
  },
  {
    file: "appstore-03-guests",
    title: "Les invités,\nsuivis sans\nfriction",
    kicker: "Rassemblez les réponses",
    body: `${phone("#FDF9FD", 195, 760, 910, 1440)}${text(250, 880, "Invités", 32, plum, 700, "start", "Georgia")}${text(250, 935, "86 confirmés · 24 en attente", 17, "#716471")}${rect(250, 1010, 800, 130, "#EBF3EB", 22)}${text(292, 1065, "Taux de réponse", 18, "#4A6A4A", 600)}${text(1000, 1070, "78 %", 30, "#4A6A4A", 700, "end", "Georgia")}${["Camille & Hugo", "Sarah Martin", "Léa Dupont", "Nicolas Bernard"].map((v, i) => `${rect(250, 1220 + i * 120, 58, 58, [rose, sage, gold, plum2][i], 29)}${text(280, 1260 + i * 120, v.slice(0, 1), 22, "#FBF5FB", 700, "middle")}${text(335, 1250 + i * 120, v, 19, plum, 600)}${text(335, 1280 + i * 120, ["Confirmé", "Confirmée", "Confirmée", "En attente"][i], 15, "#716471")}`).join("")}`,
  },
  {
    file: "appstore-04-vendors",
    title: "Vos prestataires,\ncoordonnés\nsimplement",
    kicker: "Votre équipe, enfin réunie",
    body: `${phone("#FDF9FD", 195, 760, 910, 1440)}${text(250, 880, "Prestataires", 32, plum, 700, "start", "Georgia")}${text(250, 935, "Tous vos contacts et contrats", 17, "#716471")}${["Domaine des Lumières", "Maison Camille", "Atelier Floral", "Studio Louise"].map((v, i) => `${rect(250, 1020 + i * 180, 800, 140, i % 2 ? "#FAF0F1" : "#F2E6F2", 22)}${rect(280, 1055 + i * 180, 70, 70, [sage, rose, gold, plum2][i], 18)}${text(380, 1100 + i * 180, v, 20, plum, 700)}${text(380, 1132 + i * 180, ["Lieu · Confirmé", "Traiteur · Devis reçu", "Décoration · À contacter", "Photo · Confirmé"][i], 15, "#716471")}`).join("")}`,
  },
  {
    file: "appstore-05-calendar",
    title: "Chaque mariage,\nau bon rythme",
    kicker: "Votre rétroplanning",
    body: `${phone("#FDF9FD", 195, 760, 910, 1440)}${text(250, 880, "Agenda", 32, plum, 700, "start", "Georgia")}${text(250, 935, "Les prochains jalons en vue", 17, "#716471")}${["Choisir les fleurs", "Déguster le menu", "Envoyer les invitations", "Dernier essayage"].map((v, i) => `${text(270, 1050 + i * 180, ["12", "18", "02", "24"][i], 28, gold, 700, "middle", "Georgia")}${text(330, 1048 + i * 180, ["JUIN", "JUIN", "JUIL", "AOÛT"][i], 12, "#A8893E", 700)}${line(390, 1010 + i * 180, 390, 1120 + i * 180, "#D7CDD7", 3)}${rect(430, 1010 + i * 180, 570, 112, i === 1 ? "#EBF3EB" : "#F2E6F2", 18)}${text(460, 1055 + i * 180, v, 19, plum, 700)}${text(460, 1085 + i * 180, ["À faire", "Confirmé", "À préparer", "À venir"][i], 15, "#716471")}`).join("")}`,
  },
  {
    file: "appstore-06-jour-j",
    title: "Le Jour J,\nvous êtes\naux commandes",
    kicker: "Moins de charge mentale",
    body: `${phone("#FDF9FD", 195, 760, 910, 1440)}${text(250, 880, "Jour J", 32, plum, 700, "start", "Georgia")}${text(250, 935, "Tout est prêt. Respirez.", 17, "#716471")}${rect(250, 1010, 800, 210, plum2, 24)}${text(300, 1085, "14:00", 54, "#FBF5FB", 700, "start", "Georgia")}${text(300, 1145, "Cérémonie laïque", 21, "#F8EAF4", 600)}${text(300, 1180, "Jardin des Tuileries", 16, gold)}${["Accueil des invités", "Photos de couple", "Dîner & discours", "Ouverture du bal"].map((v, i) => `${rect(270, 1300 + i * 100, 28, 28, i < 2 ? sage : "#D7CDD7", 14)}${text(325, 1322 + i * 100, v, 19, plum, 600)}`).join("")}`,
  },
];

const carousel = [
  ["Votre agence mérite mieux qu'une feuille Excel.", "Pilotez plusieurs mariages avec une vision claire, élégante et professionnelle.", rose],
  ["1. Chaque mariage au même endroit.", "Budget, invités, prestataires, documents et agenda réunis dans une seule application.", gold],
  ["2. Le budget de vos clients reste lisible.", "Suivez les dépenses, paiements, contrats et arbitrages sans perdre le fil.", sage],
  ["3. Des invités bien suivis.", "Centralisez les réponses et retrouvez rapidement les informations utiles à votre équipe.", rose],
  ["4. Un planning qui sécurise votre production.", "Chaque étape est visible, datée et prête à être partagée avec vos clients.", gold],
  ["Le Jour J, vous êtes aux commandes.", "The Nuptial Plan transforme votre organisation en expérience client sereine.", sage],
];

await mkdir(out, { recursive: true });
await mkdir(`${out}/app-store`, { recursive: true });
await mkdir(`${out}/instagram-carousel`, { recursive: true });
await mkdir(`${out}/sources`, { recursive: true });

const files = [];
for (const [i, item] of appShots.entries()) {
  const svg = shell(1290, 2796, item.title, item.kicker, item.body, i + 1, appShots.length);
  const svgPath = `${out}/sources/${item.file}.svg`;
  const pngPath = `${out}/app-store/${item.file}.png`;
  await writeFile(svgPath, svg);
  await exec("convert", ["-background", "none", svgPath, "-resize", "1290x2796!", pngPath]);
  files.push(pngPath);
}

for (const [i, [title, subtitle, accent]] of carousel.entries()) {
  const body = `${rect(90, 700, 900, 7, accent, 3)}${multiText(90, 900, wrap(title, 22), 62, cream, 700, "start", "Georgia")}${multiText(90, 1160, wrap(subtitle, 42), 30, "#F8EAF4", 400)}${rect(90, 1700, 900, 350, "#FDF9FD", 30)}${text(140, 1790, "The Nuptial Plan", 27, plum, 700)}${multiText(140, 1870, wrap(["Votre tableau de bord", "Budget maîtrisé", "Invités suivis", "Prestataires coordonnés", "Planning en vue", "Votre journée, enfin"][i], 24), 43, plum, 700, "start", "Georgia")}${line(140, 1980, 760, 1980, accent, 5)}${text(140, 2050, "Jardin Parisien · application mobile", 20, "#716471", 600)}`;
  const svg = shell(1080, 1080, wrap(title, 22), "CARROUSEL INSTAGRAM", body, i + 1, carousel.length);
  const svgPath = `${out}/sources/carousel-${String(i + 1).padStart(2, "0")}.svg`;
  const pngPath = `${out}/instagram-carousel/carousel-${String(i + 1).padStart(2, "0")}.png`;
  await writeFile(svgPath, svg);
  await exec("convert", ["-background", "none", svgPath, "-resize", "1080x1080!", pngPath]);
  files.push(pngPath);
}

await writeFile(`${out}/README.md`, `# The Nuptial Plan — kit de communication\n\nCe dossier contient les éléments prêts pour une campagne de lancement francophone.\n\n## Vidéos\n\nLa série verticale est dans l'artefact \`artifacts/nuptial-plan-video\` et documentée dans \`CAMPAIGN.md\`. Elle est conçue pour Reels, Stories et TikTok en 9:16, avec trois angles : plan central, budget, puis jour J.\n\n## Carrousel Instagram\n\nSix visuels PNG en 1080×1080 dans \`instagram-carousel/\`. Ordre recommandé : couverture, centralisation, budget, invités, planning, conclusion. Publier avec le texte fourni dans \`aso-copy-fr.md\` ou en légende courte : « Votre mariage mérite mieux qu'une feuille Excel. Enregistrez ce carrousel et commencez à organiser votre journée avec sérénité. »\n\n## App Store\n\nSix visuels PNG en 1290×2796 dans \`app-store/\`, conçus pour l'aperçu 6,7 pouces. Ils présentent les bénéfices réels de l'application : aperçu, budget, invités, prestataires, agenda et Jour J. Les sources SVG sont dans \`sources/\` pour les ajustements.\n\nImportant : ces visuels marketing sont des compositions fidèles aux fonctionnalités et à la charte, pas des captures natives brutes. Après le build iOS final, remplacer les panneaux d'interface par des captures prises sur appareil si Apple exige des captures strictement natives.\n\n## Contenu éditorial\n\nVoir \`aso-copy-fr.md\` pour le nom, sous-titre, description longue, mots-clés, textes de carrousel, hooks vidéo et plan de publication.\n`);

await writeFile(`${out}/aso-copy-fr.md`, `# The Nuptial Plan — texte App Store et ASO\n\n## Positionnement\n\nApplication mobile de planification de mariage pour réunir le budget, les invités, les prestataires, les documents, l'agenda et le Jour J dans un espace simple et élégant.\n\n## App Store Connect — français (France)\n\n### Nom de l'app (30 caractères max)\n\nThe Nuptial Plan\n\n### Sous-titre (30 caractères max)\n\nOrganisez votre mariage sereinement\n\n### Texte promotionnel (170 caractères max)\n\nTout votre mariage au même endroit : budget, invités, prestataires, agenda et Jour J. Moins de charge mentale, plus de moments à vivre.\n\n### Description\n\nVotre mariage mérite un espace aussi soigné que la journée que vous imaginez.\n\nThe Nuptial Plan vous accompagne de la première idée au dernier moment du Jour J. Réunissez vos informations essentielles dans une seule application et avancez avec une vision claire, sans multiplier les tableaux, les messages et les notes éparpillées.\n\nORGANISEZ TOUT AU MÊME ENDROIT\n• Votre tableau de bord pour garder le cap.\n• Vos mariages et informations clés accessibles rapidement.\n• Votre agenda, vos échéances et votre rétroplanning.\n\nGARDEZ LA MAÎTRISE DU BUDGET\n• Suivez le budget prévu et les dépenses engagées.\n• Organisez vos catégories, paiements et contrats.\n• Visualisez ce qui est déjà prévu et ce qu'il reste à décider.\n\nSUIVEZ VOS INVITÉS\n• Centralisez les coordonnées et les réponses.\n• Gardez une vision claire des confirmations.\n• Retrouvez les informations utiles au même endroit.\n\nCOORDONNEZ VOS PRESTATAIRES\n• Réunissez vos contacts, devis, contrats et documents.\n• Suivez les étapes importantes avec chaque prestataire.\n• Retrouvez les détails importants quand vous en avez besoin.\n\nPRÉPAREZ LE JOUR J\n• Faites avancer chaque étape au bon moment.\n• Gardez votre planning sous la main.\n• Arrivez au Jour J avec moins de charge mentale et plus de sérénité.\n\nThe Nuptial Plan est conçu pour vous aider à organiser une célébration qui vous ressemble, avec une expérience élégante, claire et profondément humaine.\n\n### Mots-clés ASO (100 caractères max, sans espaces après virgules)\n\nmariage,planning,budget,mariée,invités,prestataires,rétroplanning,organisation,agenda,jourJ\n\n### Catégorie recommandée\n\nPrincipale : Productivité\nSecondaire : Style de vie\n\n### URL de support\n\nÀ compléter avec l'URL publique de support de The Nuptial Plan avant soumission.\n\n### Notes de conformité\n\nNe pas promettre d'économies garanties, de coordination professionnelle ou de résultats financiers. La promesse porte sur l'organisation, la visibilité et la réduction de la charge mentale.\n\n## Hooks vidéos\n\n1. « Votre mariage mérite mieux qu'une feuille Excel. »\n2. « Tout au même endroit. Enfin. »\n3. « Chaque euro. Chaque invité. Chaque échéance. »\n4. « Le jour J, le plan prend le relais. »\n5. « Moins de messages à retrouver. Plus de moments à vivre. »\n\n## Légendes Instagram\n\n### Lancement\nVotre mariage mérite mieux qu'une feuille Excel. The Nuptial Plan rassemble votre budget, vos invités, vos prestataires et votre planning dans une seule application. Enregistrez ce post pour garder votre organisation sous contrôle.\n\n### Budget\nUn budget lisible, ce n'est pas seulement une question de chiffres : c'est une question de sérénité. Suivez ce qui est prévu, engagé et encore à décider, au même endroit.\n\n### Jour J\nLe Jour J n'est pas une liste de tâches. C'est votre journée. Préparez chaque étape en amont pour pouvoir vivre pleinement les moments qui comptent.\n\n## Hashtags de lancement\n\n#TheNuptialPlan #OrganisationMariage #PlanningMariage #Mariage2026 #FutureMariée #BudgetMariage #PrestatairesMariage #JourJ #WeddingPlanning #MairieEtMariage\n`);

console.log(`Generated ${files.length} PNG assets in ${out}`);