# The Nuptial Plan — campagne verticale

## Direction

Une mini-série éditoriale **Jardin Parisien** pensée pour Reels, Stories et TikTok :
plum profond (`#3C1A3C`), rose poudré (`#CC8C94`), sauge (`#649064`), crème
patinée (`#F8F3EE`) et filets or (`#C8A96E`). La typographie associe
**Cormorant Garamond** pour l’émotion et **DM Sans** pour les informations.

Le mouvement suit une logique de carnet qui s’ouvre : zooms lents sur les
textures botaniques, cartes vitrées qui se construisent, lignes de planning qui
se relient. Aucun écran ne dépend du son pour être compris.

## Livrables / ordre de lecture

| Concept | Durée | Format | Hook | CTA-safe end card |
| --- | ---: | --- | --- | --- |
| 01 — **Le plan central** | 5,2 s | 9:16 · 1080×1920 | « Tout au même endroit. » | « Vos idées, vos équipes, vos échéances — enfin réunies. » |
| 02 — **Les chiffres qui rassurent** | 6,4 s | 9:16 · 1080×1920 | « Chaque euro. Chaque invité. » | « Une information fiable au moment où vous en avez besoin. » |
| 03 — **Le jour J** | 6,2 s | 9:16 · 1080×1920 | « Le plan prend le relais. » | « Moins de messages à retrouver. Plus de moments à vivre. » |
| **Séquence complète** | **26,8 s** | **9:16 · 1080×1920** | « Votre mariage commence ici. » | « Respirez. Le reste est orchestré. » |

Les cinq scènes du fichier sont volontairement enchaînées comme une seule
séquence : ouverture de marque (4,2 s), concept 01 (5,2 s), concept 02
(6,4 s), concept 03 (6,2 s), end card (4,8 s). Le bouton de contrôle
**Boucle scène** de la prévisualisation permet aussi de revoir chaque concept
isolément pour validation créative.

## Prévisualisation et export

```bash
pnpm --filter @workspace/nuptial-plan-video run dev
```

Ouvrir `/nuptial-plan-video/`. La vidéo se lit automatiquement et boucle ; les
contrôles de prévisualisation sont masqués pendant l’export.

Pour produire le build exportable :

```bash
pnpm --filter @workspace/nuptial-plan-video run build
```

La composition et les exports cibles sont **9:16**. Le metadata d’export de
l’artifact doit conserver `videoAspectRatio = "9:16"` dans
`.replit-artifact/artifact.toml`. Les visuels source utilisés sont
`public/tnp-gold-logo.png`, `public/images/planner-notebook.png`,
`public/images/bokeh-flowers.jpg` et `public/images/botanical-texture.png`.