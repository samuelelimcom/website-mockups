// Single source of truth for business facts. Only put things here that are
// verified (from the prospect sheet / Google Business Profile). Never invent
// prices, years in business, licences, guarantees or testimonials.
// Service descriptions are true of lawn care in general; the owner confirms
// which of them Greater A Lawncare offers before anything goes live.
export const site = {
  name: 'Greater A Lawncare',
  short: 'Greater A',
  tagline: 'Lawn care · Macon, GA',
  city: 'Macon',
  region: 'GA',
  area: 'Macon, Georgia',
  phoneHref: '+14782299127',
  phoneDisplay: '(478) 229-9127',
  rating: '5.0',
  reviews: 22,
  gbp: 'https://www.google.com/maps/place/?q=place_id:ChIJn8yZluwqJqMR1kxw9TRNud8',
  designer: { name: 'Samuel Lim', url: 'https://samuelelim.com' },
};

export const services = [
  {
    slug: 'lawn-mowing',
    surface: 'mow',
    job: 'Mowing & edging',
    name: 'Lawn mowing & edging',
    short: 'Cut at the right height, edged along every walk and drive, trimmed and blown clean before the crew leaves.',
    kicker: 'Every week or two',
    headline: 'A cut you notice from the street. An edge you notice from the porch.',
    lede: 'Middle Georgia grass grows fast from spring to fall. Regular mowing at the right height keeps it thick and even, and a crisp edge is what makes the whole yard look finished.',
    hint: ['Move across the lawn to mow it yourself', 'Swipe across the lawn to mow it'],
    what: [
      ['Mowing', 'Cut at a height that suits warm-season grasses like Bermuda, centipede and zoysia, so the lawn stays thick instead of scalped.'],
      ['Edging', 'Grass that creeps over sidewalks, driveways and kerbs is cut back to a clean vertical line.'],
      ['Trimming and blowing', 'Fence lines, mailboxes and tree rings get trimmed, then clippings are blown off every hard surface.'],
    ],
    steps: [
      ['Walk the yard', 'Toys, hoses, sprinkler heads and soft spots get noticed before a mower starts.'],
      ['Mow in clean passes', 'Straight, overlapping rows, with the direction changed from visit to visit so the grass grows upright.'],
      ['Edge, trim, blow', 'The details that make a yard look cared for: edges, corners, and a clean driveway.'],
    ],
    faqs: [
      ['How often should a Macon lawn be mown?', 'In the main growing season most warm-season lawns look their best with a cut every week or every other week. Growth slows right down in winter.'],
      ['Do I need to be home?', 'Usually not. Clear access to the yard (and a heads-up about gates or pets) is all that is needed.'],
      ['What happens to the clippings?', 'Clippings left on the lawn break down and feed it. Anything on walks, drives and beds is blown back onto the grass.'],
    ],
  },
  {
    slug: 'yard-cleanup',
    surface: 'leaves',
    job: 'Leaf / yard cleanup',
    name: 'Leaf & yard cleanup',
    short: 'Leaves, fallen limbs and an overgrown season cleared away so the yard can breathe again.',
    kicker: 'Fall and spring',
    headline: 'Under those leaves is a lawn that needs daylight.',
    lede: 'Oaks, sweetgums and pines drop a lot on a Georgia yard. Left in a wet mat, leaves block the light and smother the grass underneath. A cleanup gets it back in one visit.',
    hint: ['Move over the leaves to blow them away', 'Swipe across the leaves to clear them'],
    what: [
      ['Fallen leaves', 'Blown out of the lawn, beds and corners and gathered up, rather than left to rot in place.'],
      ['Sticks and limbs', 'Storm debris picked up so the mower can get back in safely.'],
      ['Overgrowth', 'A yard that got away over a busy season, brought back to a mowable shape.'],
    ],
    steps: [
      ['Blow it out', 'Leaves are moved off the lawn, out of the beds and away from the house.'],
      ['Gather it up', 'Piles are collected for haul-away or bagged at the curb, whichever you prefer.'],
      ['Finish the lawn', 'A final mow or pass of the blower so the yard looks done, not just cleared.'],
    ],
    faqs: [
      ['When is the best time for a leaf cleanup?', 'Late fall, once most of the trees have dropped, and again in early spring for what came down over winter.'],
      ['Can you just do one cleanup?', 'Yes. One-time cleanups are common before the holidays, a sale or a move.'],
      ['What about gutters?', 'Ask when you request a quote. It depends on the house and what the crew is set up to do safely.'],
    ],
  },
  {
    slug: 'pine-straw',
    surface: 'straw',
    job: 'Pine straw / beds',
    name: 'Pine straw & bed refresh',
    short: 'Fresh pine straw tucked around shrubs and trees, with a clean cut line where the bed meets the lawn.',
    kicker: 'Once or twice a year',
    headline: 'Nothing says a Georgia yard is cared for like fresh pine straw.',
    lede: 'Pine straw keeps moisture in, keeps weeds down and gives beds that warm, tidy look. It fades and thins over the year, so a fresh layer makes the whole property look new again.',
    hint: ['Move over the bed to spread pine straw', 'Tap the bed to spread pine straw'],
    what: [
      ['Pine straw', 'Spread evenly at a depth that holds moisture without smothering the plants.'],
      ['Bed edges', 'A clean line cut between bed and lawn so the straw stays put and the shape reads from the street.'],
      ['Weeds and debris', 'Pulled and cleared before the new layer goes down, not buried under it.'],
    ],
    steps: [
      ['Clear the beds', 'Weeds, leaves and old debris come out first.'],
      ['Cut the edge', 'A crisp line between lawn and bed.'],
      ['Spread and tuck', 'Straw is shaken out, spread evenly and tucked neatly at the edges.'],
    ],
    faqs: [
      ['How often should pine straw be refreshed?', 'Many homeowners refresh once or twice a year, often in spring and again in fall, because the colour fades and the layer settles.'],
      ['Pine straw or mulch?', 'Pine straw is light, stays on slopes well and has that classic Southern look. Mulch suits some beds better. Ask and you will get an honest answer.'],
      ['How much will my yard need?', 'It depends on the size and number of beds. A quick look (or a few photos) is enough for a quote.'],
    ],
  },
];
