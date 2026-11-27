// Single source of truth for business facts. Only put things here that are
// verified (prospect sheet, Google Business Profile, Wigan Council business
// directory, Companies House). Never invent prices, years in business,
// insurance, guarantees, accreditations or testimonials.
// Service descriptions are true of roofing in general; the owner confirms the
// details before anything goes live.
export const site = {
  name: 'B.Wilkinson Roofing Ltd',
  short: 'B.Wilkinson Roofing',
  tagline: 'Roofing · Aspull, Wigan',
  city: 'Aspull',
  town: 'Wigan',
  area: 'Aspull, Wigan and the surrounding area',
  phoneHref: '+441942909095',
  phoneDisplay: '01942 909095',
  rating: '5.0',
  reviews: 56,
  gbp: 'https://www.google.com/maps/place/?q=place_id:ChIJxxTlC1YPe0gROHDeJKJSR5s',
  designer: { name: 'Samuel Lim', url: 'https://samuelelim.com' },
};

export const services = [
  {
    slug: 'roof-repairs',
    surface: 'roof',
    job: 'Slipped or missing slates',
    name: 'Roof repairs',
    short: 'Slipped, cracked and missing slates put back in their course, so the rain runs off instead of in.',
    kicker: 'Slates & tiles',
    headline: 'One slipped slate is all the rain needs.',
    lede: 'A slate only keeps water out while it sits in its course, overlapping the two below. Once a nail rusts through or a gale lifts it, rain gets under the roof and finds its way to a ceiling. Caught early, it is usually a small job.',
    hint: ['Move over the slates to lift and check them', 'Tap the slates to lift and check them'],
    what: [
      ['Slipped and missing slates', 'Re-fixed or replaced to match, so the overlap that sheds the water is back where it should be.'],
      ['Cracked slates and tiles', 'Swapped out before the crack lets water through to the battens and felt underneath.'],
      ['Ridge and verge', 'Loose ridge tiles and crumbling verge bedding re-set, the parts of a roof that take the worst of the wind.'],
    ],
    steps: [
      ['Look first', 'The roof is checked and the problem explained in plain words, with photos if you want them.'],
      ['Fix what is wrong', 'Slates refitted to their course, matching what is already there as closely as possible.'],
      ['Check it is right', 'The surrounding slates, gutters and flashings get a once-over before the ladders come down.'],
    ],
    faqs: [
      ['Do I need a new roof?', 'Often not. Many leaks on older slate roofs come down to a handful of slipped slates, worn flashing or a tired chimney. A proper look tells you which.'],
      ['Can you match my slates?', 'Usually, yes. Reclaimed or new slates are chosen to sit in with the rest of the roof. Ask when you request a quote.'],
      ['Is it safe to wait?', 'A slipped slate tends to let in more water each time it rains, and wet battens and felt cost more to put right. Getting it looked at sooner is cheaper.'],
    ],
  },
  {
    slug: 'leadwork',
    surface: 'lead',
    job: 'Lead flashing',
    name: 'Leadwork',
    short: 'Lead flashings dressed tight where the roof meets the chimney, walls and dormers: the joints rain looks for first.',
    kicker: 'Flashings & valleys',
    headline: 'Where the roof meets the brick, lead does the work.',
    lede: 'Slates shed water across the roof, but wherever the roof meets a chimney, a wall or a dormer there is a joint. Lead is dressed over that joint so rain is carried past it. When lead lifts, splits or comes away from the brick, the leak usually starts right there.',
    hint: ['Move along the flashing to dress it down', 'Tap the flashing to dress it down'],
    what: [
      ['Chimney flashings', 'Front apron, side steps and the back gutter that together keep water out around a stack.'],
      ['Abutments and dormers', 'Where a roof runs into a wall, a bay or a dormer, lead carries water past the joint.'],
      ['Valleys and gutters', 'Lead-lined valleys and box gutters where two slopes meet and water collects.'],
    ],
    steps: [
      ['Find the lift', 'Old lead is checked for splits, slipped wedges and joints that have opened up.'],
      ['Cut, fit and dress', 'Lead is shaped to the roof and dressed down tight against the slates.'],
      ['Seal into the brick', 'The top edge is tucked into the mortar joint and pointed in, so water cannot get behind it.'],
    ],
    faqs: [
      ['Why does lead fail?', 'Age, movement and the occasional bad joint. Lead expands and contracts with the weather, so long runs need laying properly to last.'],
      ['Can lead be repaired, or must it be replaced?', 'Small lifts and open joints can often be dressed back and re-sealed. Split or thin lead is better replaced.'],
      ['Is there an alternative to lead?', 'There are, and they suit some jobs. Ask, and you will get an honest answer about which is right for your roof.'],
    ],
  },
  {
    slug: 'chimney-repairs',
    surface: 'chimney',
    job: 'Chimney repair',
    name: 'Chimney repairs',
    short: 'Repointing, flaunching and pots: the stack on top of every terrace, put back in good order.',
    kicker: 'Stacks & pots',
    headline: 'A chimney takes more weather than any other part of the house.',
    lede: 'A stack stands above the roof, open to wind and rain on all four sides. Over the years the mortar between the bricks washes out, the flaunching around the pots cracks and water soaks down into the chimney breast. Repointing and a sound top keep it dry.',
    hint: ['Move over the stack to repoint it', 'Tap the stack to repoint it'],
    what: [
      ['Repointing', 'Old, crumbling mortar raked out and the joints filled with fresh mortar, so the brickwork sheds water again.'],
      ['Flaunching and pots', 'The mortar cap that holds the pots and throws water off the top of the stack, renewed when it cracks.'],
      ['Flashings around the stack', 'Checked at the same time, because a chimney leak is often a lead leak.'],
    ],
    steps: [
      ['Get up safely', 'Proper access to the stack, so the work is done properly and not rushed.'],
      ['Rake out and repoint', 'Joints raked back to sound mortar and filled, course by course.'],
      ['Top and tidy', 'Flaunching and pots made good, flashings checked, everything cleaned off the roof.'],
    ],
    faqs: [
      ['How do I know my chimney needs repointing?', 'Look up from the street: if the lines between the bricks look dark and deep rather than full and flush, or there is moss in them, the mortar is going.'],
      ['I have a damp patch on the chimney breast. Is it the chimney?', 'It often is: worn pointing, cracked flaunching or failed flashing. A look at the stack usually tells you which.'],
      ['What if I do not use the fireplace?', 'Unused flues can be capped and vented to keep rain out while letting the chimney breathe. Ask about it with your quote.'],
    ],
  },
];
