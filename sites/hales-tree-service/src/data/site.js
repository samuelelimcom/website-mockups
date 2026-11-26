// Single source of truth for business facts. Only put things here that are
// verified (from the prospect sheet / Google Business Profile). Never invent
// prices, years in business, licences, guarantees or testimonials.
// Service descriptions below are general to the trade, to be confirmed with the owner.
export const site = {
  name: "Hale's Tree Service, LLC",
  short: "Hale's",
  tagline: 'Tree service',
  city: 'Bowling Green',
  region: 'KY',
  area: 'Bowling Green and Warren County',
  phoneHref: '+12707829252',
  phoneDisplay: '(270) 782-9252',
  rating: '4.5',
  reviews: 11,
  gbp: 'https://www.google.com/maps/place/?q=place_id:ChIJN_-G94noZYgRpaLHxW1O338',
  designer: { name: 'Samuel Lim', url: 'https://samuelelim.com' },
};

export const services = [
  {
    slug: 'tree-removal',
    scene: 'removal',
    job: 'removal',
    name: 'Tree removal',
    short: 'Dead, leaning or simply in the wrong place. Taken down in sections, lowered, and hauled away.',
    kicker: 'Removal',
    headline: 'A big tree next to the house comes down in pieces, not in one go.',
    lede: 'Felling a whole tree only works when there is nothing around it. In a Bowling Green yard there is a roof, a fence, a drive and the neighbour. So the crown comes down first, a section at a time, and the trunk follows in rounds.',
    includes: ['Look at the tree and everything around it', 'Crown taken down in sections', 'Trunk cut into rounds', 'Brush and wood hauled away'],
    what: [
      ['Dead or dying trees', 'Bare limbs in summer, peeling bark or fungus at the base are signs a tree is losing its grip.'],
      ['Leaning over the house', 'A lean that is new, or soil heaving on one side, is a tree that is already moving.'],
      ['Wrong tree, wrong place', 'Roots lifting the drive, limbs in the power drop, or simply no light left for the lawn.'],
    ],
    steps: [
      ['Read the tree', 'Where it leans, what is under it, and where every piece will land.'],
      ['Top down, piece by piece', 'Limbs are cut and lowered on rope so nothing drops onto the roof or fence.'],
      ['Rounds and clean-up', 'The trunk comes down in rounds, and the brush and wood are cleared from the yard.'],
    ],
    faqs: [
      ['Do I need to be home?', 'Usually not for the work itself, as long as the crew can reach the tree. It helps to walk the yard together first.'],
      ['What happens to the stump?', 'Removal normally leaves a stump at ground level. Grinding it out is a separate step you can add.'],
      ['Can you keep the wood for firewood?', 'Ask when you get your quote. Many people like to keep the rounds and have the brush hauled.'],
    ],
  },
  {
    slug: 'tree-trimming',
    scene: 'trim',
    job: 'trim',
    name: 'Trimming & pruning',
    short: 'The limb over the roof, the branches on the power drop, the dead wood that falls in every storm.',
    kicker: 'Trimming',
    headline: 'Take the heavy limb off now, before the next storm takes it off for you.',
    lede: 'Most storm damage starts with one limb that everyone knew about. Trimming takes weight off the side that leans, clears the roof and lines, and removes dead wood, while leaving the tree healthy and balanced.',
    includes: ['Limbs over the roof cut back', 'Dead and broken wood removed', 'Clearance from house and drive', 'Clippings hauled away'],
    what: [
      ['Limbs over the roof', 'They scrape shingles in the wind, drop leaves in the gutters and are the first thing to fall in ice.'],
      ['Dead wood in the crown', 'Grey, bark-less branches that come down a piece at a time in every storm.'],
      ['Low and crowding limbs', 'Branches over the drive, the mailbox or the neighbour’s side of the fence.'],
    ],
    steps: [
      ['Choose the cuts', 'Which limbs come off, and how much, so the tree stays balanced.'],
      ['Cut and lower', 'Heavy limbs are tied off and lowered instead of dropped on the roof.'],
      ['Clean finish', 'Cuts are made just outside the branch collar so the tree can seal the wound.'],
    ],
    faqs: [
      ['When is the best time to trim?', 'Late winter is ideal for most hardwoods because the tree is dormant. Dead or dangerous limbs can come off any time.'],
      ['Will trimming hurt my tree?', 'Good pruning does not. Taking too much at once does, which is why only the right limbs come off.'],
      ['Can you trim near power lines?', 'Lines to the street belong to the utility. Ask what can be done around the service drop to your house.'],
    ],
  },
  {
    slug: 'stump-grinding',
    scene: 'stump',
    job: 'stump',
    name: 'Stump grinding',
    short: 'The stump that the mower keeps hitting, ground below the grass and turned into a pile of chips.',
    kicker: 'Stumps',
    headline: 'The tree is gone. The stump is still tripping everyone up.',
    lede: 'A stump can take years to rot on its own, sending up suckers and getting in the way of the mower. A grinder chews it down below the surface, so the spot can be filled and seeded or used for a bed.',
    includes: ['Stump ground below grade', 'Surface roots near it taken down', 'Chips raked into the hole or hauled', 'Ready for soil and seed'],
    what: [
      ['Old stumps', 'From a tree that came down years ago, now a trip hazard and a mower blade breaker.'],
      ['Fresh stumps', 'Left after a removal, often still sending up green shoots.'],
      ['Surface roots', 'The ridges that radiate out from the stump and lift the lawn.'],
    ],
    steps: [
      ['Mark the utilities', 'Underground lines are located before any grinding starts.'],
      ['Grind it down', 'The cutting wheel sweeps across the stump until it is below the grass line.'],
      ['Chips and finish', 'Chips go back in the hole or are hauled, ready for soil and seed.'],
    ],
    faqs: [
      ['How deep does grinding go?', 'Deep enough to lay soil and seed over the spot. Ask for more if you are planning to plant or build there.'],
      ['Can the grinder get into a fenced back yard?', 'Many grinders fit through a standard gate. Mention gate width in your quote request.'],
      ['Do the roots die?', 'Without the stump, most roots stop growing and slowly rot away.'],
    ],
  },
];

// Extra choices offered in the quote form only (not separate pages).
export const extraJobs = [['storm', 'Storm damage'], ['other', 'Something else']];
