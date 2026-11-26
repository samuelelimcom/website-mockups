# Mockup kit

Reference implementation (the Spotless pressure-washing mockup). Copy this folder to
`sites/<slug>/`, then follow `AGENT.md` step 3: keep the infrastructure, redesign the rest.

Keep: `src/lib/stage.js`, `src/lib/textures.js`, `src/components/Stage.astro`,
`src/components/QuoteForm.astro` (behaviour), head tags in `src/layouts/Base.astro`,
`public/robots.txt`, `public/vercel.json`.

Replace: `src/data/site.js`, `src/styles/global.css`, all pages and copy,
`src/scenes/wash.js` (write a scene for the new trade), `tour.mjs`.
