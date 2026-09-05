/**
 * Default copy for every public page.
 *
 * This is the source of truth. The site_content table holds only overrides
 * an admin has made, so deleting an override returns the block to what is
 * written here, and a brand-new deployment renders the full site with an
 * empty table.
 *
 * Keys are dotted: page.section.field. The admin editor groups by the first
 * segment. Adding a block is: add a key here, use it in the page.
 */
export const CONTENT_DEFAULTS = {
  // ------------------------------------------------------------- home ---
  "home.hero.eyebrow": "For entertainers and the venues that book them",
  "home.hero.title": "More gigs. More money. More freedom.",
  "home.hero.body":
    "GIGLY is where working entertainers find gigs and venues find acts — without the phone tag, the agency cut, or the Facebook group. Post a gig, apply in a minute, get booked.",
  "home.hero.cta_entertainer": "I'm an entertainer",
  "home.hero.cta_venue": "I'm a venue",

  "home.entertainers.title": "For entertainers",
  "home.entertainers.body":
    "Every gig within your travel radius, filtered to what you do. Apply with a quote. Keep your diary in one place. Get paid what you're worth, not what's left after an agent.",
  "home.entertainers.point_1": "Gigs matched to your act, your area and your dates",
  "home.entertainers.point_2": "Apply in a minute — your profile does the talking",
  "home.entertainers.point_3": "Free to join, free to apply. No commission.",

  "home.venues.title": "For venues",
  "home.venues.body":
    "Post what you need, when, and what it pays. Watch the applications come in with distance, price and reviews on every one. Shortlist, offer, done.",
  "home.venues.point_1": "Post a gig in two minutes",
  "home.venues.point_2": "See every applicant's rating, distance and quote at a glance",
  "home.venues.point_3": "Last-minute cancellation? Mark it urgent and it goes to the top",

  "home.how.title": "How it works",
  "home.how.step_1_title": "Post or browse",
  "home.how.step_1_body": "Venues post a gig with a date, a fee and what they need. Entertainers see every gig near them, filtered to what they do.",
  "home.how.step_2_title": "Apply and shortlist",
  "home.how.step_2_body": "Acts apply with a quote and a line or two. Venues compare applicants side by side and shortlist the ones that fit.",
  "home.how.step_3_title": "Offer, accept, play",
  "home.how.step_3_body": "The venue makes an offer. The act accepts. The booking is confirmed, the date is blocked, and both diaries update. After the gig, both sides leave a review.",

  "home.cta.title": "Ready?",
  "home.cta.body": "It takes about a minute to sign up and a few more to fill in your profile.",
  "home.cta.button": "Get started",

  // ------------------------------------------------------------ about ---
  "about.title": "About GIGLY",
  "about.body":
    "GIGLY was built by people who've stood on both sides of the bar — booking acts for a room that needed filling, and chasing gigs to fill a diary.\n\nThe live entertainment circuit runs on word of mouth, group chats and agents who take a cut for forwarding an email. It works, mostly, but it's slow, it's opaque, and the people doing the actual work see the least of the money.\n\nGIGLY is a straight line between the venue that needs an act and the act that wants the gig. No commission on bookings. No exclusivity. Your profile, your fees, your diary.",
  "about.pilot.title": "We're starting small on purpose",
  "about.pilot.body":
    "GIGLY is launching in a handful of UK cities with a small group of entertainers and venues who are helping shape it. If you'd like to be one of them, sign up — we read every profile that comes in.",

  // ---------------------------------------------------------- pricing ---
  "pricing.title": "Pricing",
  "pricing.body": "Free while we're in pilot. Here's what that means, and what's coming.",
  "pricing.free.title": "Free",
  "pricing.free.body": "Everything. Post gigs, apply to gigs, message, book, review. No commission on any booking, ever.",
  "pricing.later.title": "Later",
  "pricing.later.body":
    "When GIGLY leaves pilot, venues will be able to feature a listing so it sits at the top, and entertainers will be able to upgrade for tools like invoicing, contracts and an earnings dashboard. The core — finding and booking — stays free.",

  // ---------------------------------------------------------- contact ---
  "contact.title": "Get in touch",
  "contact.body":
    "Questions, a venue that should be on here, an act we should know about — email us and a person will reply.",
  "contact.email": "hello@gigly.co.uk",

  // ----------------------------------------------------------- footer ---
  "footer.tagline": "More gigs. More money. More freedom.",
} as const;

export type ContentKey = keyof typeof CONTENT_DEFAULTS;

/** The page groups the admin editor shows, in display order. */
export const CONTENT_GROUPS: { prefix: string; label: string }[] = [
  { prefix: "home", label: "Homepage" },
  { prefix: "about", label: "About" },
  { prefix: "pricing", label: "Pricing" },
  { prefix: "contact", label: "Contact" },
  { prefix: "footer", label: "Footer" },
];
