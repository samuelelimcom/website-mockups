// Single source of truth for business facts. Only put things here that are
// verified (from the prospect sheet / Google Business Profile). Never invent
// prices, years in business, licences, guarantees or testimonials.
export const site = {
  name: 'Pole Clean Ltd',
  short: 'Pole Clean',
  tagline: 'Window cleaning',
  city: 'Stoke-on-Trent',
  area: 'Stoke-on-Trent and the Potteries',
  phoneHref: '+447342379043',
  phoneDisplay: '07342 379043',
  rating: '5.0',
  reviews: 159,
  gbp: 'https://www.google.com/maps/place/?q=place_id:ChIJhRtkZ8vov0gRhlNQvqUNyJs',
  designer: { name: 'Samuel Lim', url: 'https://samuelelim.com' },
};

// Service copy describes how this work is generally done in the trade. It is
// an example for the owner to confirm, not a claim about Pole Clean's methods.
export const services = [
  {
    slug: 'window-cleaning',
    surface: 'glass',
    job: 'Windows',
    name: 'Window cleaning',
    short: 'Glass scrubbed and rinsed from the ground with a water-fed pole, so it dries clear without a ladder against the house.',
    kicker: 'Regular or one-off',
    headline: 'Clear glass, and nobody up a ladder outside your bedroom.',
    lede: 'A water-fed pole lets a cleaner reach first and second floor windows from the pavement or the garden. The brush scrubs, pure water rinses, and the glass dries without the spots tap water leaves.',
    hint: ['Move across the glass to scrub it yourself', 'Swipe across the glass to scrub it'],
    what: [
      ['Every pane, inside the frame', 'Front, back and side windows, including the small top lights people forget.'],
      ['Frames and sills wiped as you go', 'The brush passes over the frames too, so they are rinsed with the glass.'],
      ['Doors and porch glass', 'Glazed front doors, side panels and porches, on request.'],
    ],
    steps: [
      ['Scrub from the top', 'The brush works the dirt loose, starting high so nothing runs onto clean glass.'],
      ['Rinse with pure water', 'Filtered water with the minerals taken out carries the dirt down and away.'],
      ['Leave it to dry', 'With nothing in the water to leave behind, the glass dries clear on its own.'],
    ],
    faqs: [
      ['Do you need to come inside?', 'No. Outside windows are cleaned from the ground. Inside cleaning, if offered, is arranged separately.'],
      ['Why is the glass wet when you leave?', 'That is pure water drying off. Because it has nothing dissolved in it, it dries without spots or streaks.'],
      ['Can you clean in the rain?', 'Usually, yes. Rain is not what leaves windows dirty; the dust it lands on is. Very high winds are a different matter.'],
    ],
  },
  {
    slug: 'upvc-frames-sills',
    surface: 'frames',
    job: 'Frames and sills',
    name: 'Frames, sills & doors',
    short: 'Yellowed, green-streaked uPVC frames, sills and door panels brought back to white.',
    kicker: 'uPVC clean',
    headline: 'White uPVC goes grey so slowly you stop seeing it.',
    lede: 'Traffic film, algae and spider webs build up in the corners and on the sills. A proper frame clean lifts it with soft brushes and plenty of water, without scratching the plastic.',
    hint: ['Move across the frame to clean it yourself', 'Swipe across the frame to clean it'],
    what: [
      ['Frames and sashes', 'Every face that shows from outside, including the corners where grime collects.'],
      ['Sills', 'Window sills and door thresholds, which catch everything that runs off the glass.'],
      ['Door panels', 'uPVC front and back doors and the panels around them.'],
    ],
    steps: [
      ['Brush out the corners', 'Webs and loose dirt come out of the beading first.'],
      ['Scrub the faces', 'Soft bristles work across the frame without marking the finish.'],
      ['Rinse it all down', 'Glass and frames are rinsed together so nothing is left to drip later.'],
    ],
    faqs: [
      ['Will it remove yellowing?', 'Surface dirt and algae come off. Plastic that has yellowed right through from sunlight is a different problem, and you will be told honestly.'],
      ['Is this part of a normal window clean?', 'Frames get rinsed during a window clean. A full frame and sill clean is a more thorough job, often done once or twice a year.'],
      ['Do you use harsh chemicals?', 'Frame cleaning is mostly brushes and water. Anything stronger is only used where it is needed.'],
    ],
  },
  {
    slug: 'fascias-gutters',
    surface: 'fascia',
    job: 'Fascias and gutters',
    name: 'Fascias, soffits & gutters',
    short: 'The black streaks on fascia boards and the outside of gutters, cleaned from the ground.',
    kicker: 'Roofline',
    headline: 'The roofline is the first thing people see from the street.',
    lede: 'Fascia boards and the outside of gutters collect black streaks from water running over the edge. A long pole and a soft brush reach them from the ground and bring them back to white.',
    hint: ['Move along the roofline to clean it yourself', 'Swipe along the roofline to clean it'],
    what: [
      ['Fascia boards', 'The long white boards along the eaves that the gutter is fixed to.'],
      ['Gutter outsides', 'The black or white faces of the gutter, where the tiger stripes form.'],
      ['Soffits', 'The boards underneath the eaves, where webs and dust collect.'],
    ],
    steps: [
      ['Work along the run', 'One section at a time, so streaks are lifted before they can dry back on.'],
      ['Scrub and rinse', 'Soft brush and plenty of water, from the top down.'],
      ['Check from the street', 'The roofline is looked at from across the road, where your neighbours see it.'],
    ],
    faqs: [
      ['Is this the same as clearing gutters out?', 'No. This cleans the outside faces. Clearing moss and leaves from inside the gutter is a separate job.'],
      ['Do you need ladders or scaffolding?', 'For most houses a water-fed pole reaches the roofline from the ground.'],
      ['How long does it stay clean?', 'It depends on trees and how the water runs off your roof. Many people have it done once a year.'],
    ],
  },
];
