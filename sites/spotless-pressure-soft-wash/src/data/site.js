// Single source of truth for business facts. Only put things here that are
// verified (from the prospect sheet / Google Business Profile). Never invent
// prices, years in business, licences, guarantees or testimonials.
export const site = {
  name: 'Spotless Pressure and Soft Wash',
  short: 'Spotless',
  tagline: 'Pressure & soft washing',
  city: 'Chattanooga',
  region: 'TN',
  area: 'Chattanooga and the Tennessee Valley',
  phoneHref: '+14233148770',
  phoneDisplay: '(423) 314-8770',
  rating: '5.0',
  reviews: 35,
  gbp: 'https://www.google.com/maps/place/?q=place_id:ChIJP4oyUwMfemIRgBMKdohVlj0',
  designer: { name: 'Samuel Lim', url: 'https://samuelelim.com' },
};

export const services = [
  {
    slug: 'house-soft-wash',
    surface: 'siding',
    name: 'House & siding soft wash',
    short: 'Low pressure, the right cleaner, and a rinse that leaves siding bright without forcing water behind it.',
    kicker: 'Soft wash',
    headline: 'The green on your siding is alive. Blasting it only moves it around.',
    lede: 'Algae and mildew love the shaded side of a Tennessee home. Soft washing treats the growth itself, then rinses it away at a pressure your garden hose would recognise.',
    what: [
      ['Green algae', 'Shows up first on the north side and anywhere shrubs keep the wall damp.'],
      ['Mildew and dust', 'A grey film that makes white siding look tired from the street.'],
      ['Spider webs and wasp nests', 'Tucked under eaves and around light fittings.'],
    ],
    steps: [
      ['Walk the house', 'Windows, outlets, plants and anything delicate get noted before any water comes out.'],
      ['Apply the cleaner', 'A siding-safe solution goes on from the bottom up and is given time to work.'],
      ['Rinse low and slow', 'A wide, gentle fan carries the growth away. No etching, no lifted panels.'],
    ],
    faqs: [
      ['Will it hurt my plants?', 'Plants near the house are rinsed before and after so the cleaner never sits on them.'],
      ['Is soft washing safe for vinyl, brick and painted wood?', 'Yes. The pressure is low on purpose, which is exactly why it suits surfaces a pressure washer can scar.'],
      ['How long does a house wash take?', 'Most single-family homes are done in a single visit. You will get a time window with your quote.'],
    ],
  },
  {
    slug: 'driveways-concrete',
    surface: 'concrete',
    name: 'Driveways & concrete',
    short: 'Years of tyre marks, red clay and black algae lifted in even passes, edge to edge.',
    kicker: 'Pressure wash',
    headline: 'Your driveway is the first thing every visitor walks on.',
    lede: 'Concrete darkens so slowly you stop noticing. Then one clean pass shows the colour it was poured in. This is the job pressure washing was made for.',
    what: [
      ['Black algae and mould', 'The dark film that also makes walkways slick after rain.'],
      ['Tyre marks and clay', 'Tracked in a little every day and ground into the surface.'],
      ['Leaf and rust stains', 'Left behind by a wet autumn or a forgotten patio chair.'],
    ],
    steps: [
      ['Clear and pre-treat', 'Loose debris is blown off and stubborn stains are treated before washing.'],
      ['Surface-clean in passes', 'Overlapping, even passes so the concrete dries without stripes.'],
      ['Rinse the edges', 'Kerbs, joints and the garage threshold are finished by hand.'],
    ],
    faqs: [
      ['Can pressure washing damage concrete?', 'Used correctly, no. The right tip, distance and pace clean the surface without cutting into it.'],
      ['Do I need to be home?', 'Usually not. An outdoor tap and clear access to the driveway are all that is needed.'],
      ['What about patios, pavers and pool decks?', 'The same approach works, with the pressure adjusted for the material.'],
    ],
  },
  {
    slug: 'roof-soft-wash',
    surface: 'roof',
    name: 'Roof soft wash',
    short: 'Those black streaks are algae feeding on your shingles. Soft washing clears them without lifting a single granule.',
    kicker: 'Soft wash',
    headline: 'Black streaks on the roof are not dirt. They are a colony.',
    lede: 'The streaks running down shingles are a roof algae that spreads a little further every humid summer. A roof should never be pressure washed, so this is done with solution and a gentle rinse.',
    what: [
      ['Black algae streaks', 'They start near the ridge and run downhill with every rain.'],
      ['Moss and lichen', 'They hold moisture against the shingle and lift its edges over time.'],
      ['Leaf litter in valleys', 'It keeps the roof wet and gives growth somewhere to start.'],
    ],
    steps: [
      ['Protect the ground', 'Gutters, downpipes and planting are managed so runoff goes where it should.'],
      ['Treat the shingles', 'The solution is applied evenly from the ridge down and left to do its work.'],
      ['Let the roof finish the job', 'A light rinse now, and rainfall carries away what is left over the following weeks.'],
    ],
    faqs: [
      ['Why not pressure wash a roof?', 'High pressure strips the protective granules from shingles. Soft washing removes the growth and leaves the shingle alone.'],
      ['Will the streaks come back?', 'Eventually, in a humid climate. Treating the algae rather than just rinsing it slows the return.'],
      ['Is it safe for my gutters and landscaping?', 'Yes. Runoff is diluted and plants below are rinsed throughout.'],
    ],
  },
];
