// Single source of truth for business facts. Only verified facts from the
// prospect sheet / Google Business Profile: name, city, phone, rating, reviews.
// Never invent prices, years in business, licences, guarantees or testimonials.
export const site = {
  name: 'Patriotic Pressure Washing',
  legal: 'Patriotic Pressure Washing, LLC',
  short: 'Patriotic',
  tagline: 'Pressure washing · Cleveland, TN',
  city: 'Cleveland',
  region: 'TN',
  area: 'Cleveland, Tennessee and nearby',
  phoneHref: '+14235994141',
  phoneDisplay: '(423) 599-4141',
  rating: '4.6',
  reviews: 10,
  gbp: 'https://www.google.com/maps/place/?q=place_id:ChIJHwUfylzVX4gREagQLaOqlMU',
  designer: { name: 'Samuel Lim', url: 'https://samuelelim.com' },
};

// Service copy describes the trade in general, not claims about this business.
export const services = [
  {
    slug: 'deck-fence-cleaning',
    surface: 'deck',
    job: 'deck',
    name: 'Deck & fence cleaning',
    nav: 'Decks & fences',
    short: 'Gray, slick boards washed along the grain until the wood color comes back.',
    headline: 'That gray on your deck is the top of the wood, worn out. Underneath, it is still cedar.',
    lede: 'Sun turns the surface fibers silver and the shade lets mildew settle in the gaps. Washed with the grain at the right pressure, the color comes back without the fuzz and gouges of an over-eager wand.',
    what: [
      ['Silver-gray weathering', 'Sun breaks down the outer fibers of the wood. It looks old long before it is.'],
      ['Mildew between boards', 'Dark, slick patches where leaves sit and the shade never lifts.'],
      ['Green on fence pickets', 'The side that faces away from the sun goes first.'],
    ],
    steps: [
      ['Clear and check', 'Furniture and planters come off, loose nails and soft boards get pointed out to you.'],
      ['Wash with the grain', 'One board at a time, tip moving along its length, never across it.'],
      ['Let it dry, then decide', 'Clean wood is the right moment to stain or seal, if you want to.'],
    ],
    faqs: [
      ['Can pressure washing damage a deck?', 'Too much pressure or too close a tip will raise and gouge the grain. That is why wood is washed lower, wider and along the board.'],
      ['Should I seal it afterwards?', 'Many people do. Wood takes stain or sealer best when it is clean and fully dry.'],
      ['Do fences get the same treatment?', 'The same idea, picket by picket, with extra care around the posts and the bottom rail.'],
    ],
  },
  {
    slug: 'house-washing',
    surface: 'siding',
    job: 'house',
    name: 'House washing',
    nav: 'House washing',
    short: 'Vinyl, brick and painted trim cleaned gently, so nothing is forced behind the siding.',
    headline: 'The north side of the house is green again. It is not your imagination.',
    lede: 'Algae and mildew love the shady walls of a Tennessee home. A house is washed with cleaner and a low-pressure rinse, not a blast, so siding stays on and water stays out.',
    what: [
      ['Green algae', 'Starts on the shady side and behind shrubs where the wall stays damp.'],
      ['Gray film on vinyl', 'Dust and mildew that make white siding look beige from the road.'],
      ['Brick and mortar staining', 'Red clay splash and dark streaks low on the wall.'],
    ],
    steps: [
      ['Walk around first', 'Outlets, lights, windows and plants are noted before any water comes out.'],
      ['Clean, then wait', 'A siding-safe cleaner goes on and is given time to lift the growth.'],
      ['Rinse low and wide', 'A gentle fan from the top down. No lifted panels, no water behind them.'],
    ],
    faqs: [
      ['Is it safe for brick and vinyl?', 'Yes, when pressure is kept low. The cleaner does the work, the rinse just carries it away.'],
      ['Will it hurt my flower beds?', 'Plants are usually wet down before and rinsed after so cleaner does not sit on them.'],
      ['Do you need to come inside?', 'No. An outdoor spigot and access around the house are all that is needed.'],
    ],
  },
  {
    slug: 'driveways-walkways',
    surface: 'walk',
    job: 'driveway',
    name: 'Driveways & walkways',
    nav: 'Driveways',
    short: 'Clay, tire marks and black mold lifted from concrete in even, stripe-free passes.',
    headline: 'Your front walk is the handshake of the house.',
    lede: 'Concrete goes dark so slowly you stop seeing it, until the first clean pass shows the color it was poured. This is the surface that can take real pressure, so it gets it.',
    what: [
      ['Black mold and algae', 'The dark film that makes walks slick after a rain.'],
      ['Red clay and tire marks', 'Tracked in every day and ground into the surface.'],
      ['Leaf and rust stains', 'Left by a wet autumn or a chair that never moved.'],
    ],
    steps: [
      ['Blow off and pre-treat', 'Loose debris goes and stubborn stains get treated first.'],
      ['Overlapping passes', 'Even, steady passes so it dries one color, without stripes.'],
      ['Finish the edges', 'Joints, curbs and the garage lip are done by hand.'],
    ],
    faqs: [
      ['Will it damage my concrete?', 'Not with the right tip, distance and pace. Concrete is built to take pressure.'],
      ['What about pavers and patios?', 'Same idea, with pressure adjusted so the joint sand stays put.'],
      ['How soon can I drive on it?', 'Usually once it has dried, the same afternoon.'],
    ],
  },
];
