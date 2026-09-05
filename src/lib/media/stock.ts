/**
 * Stock imagery for the public pages and demo data.
 *
 * Unsplash, whose licence permits commercial use and hotlinking without
 * attribution (attribution is appreciated, and each photographer is credited
 * in the `credit` field below so a credits page is a small job if wanted).
 *
 * Every id here was fetched and looked at before being used. That is not
 * pedantry: three of the first batch of candidates turned out to be a gym
 * workout, an empty bedroom and a surfer. An image is content, and content
 * that contradicts its label is a bug.
 *
 * These are scene photographs — a stage, a bar, a mic — never a portrait
 * presented as a specific act. A face that isn't theirs misrepresents the act
 * to the venue booking them.
 */

const UNSPLASH = "https://images.unsplash.com";

/** Sized, cropped and compressed at the CDN rather than shipped full-resolution. */
export function stockUrl(id: string, width: number, height?: number): string {
  const crop = height ? `&h=${height}&fit=crop` : "";
  return `${UNSPLASH}/${id}?w=${width}${crop}&q=70&auto=format`;
}

type Shot = { id: string; alt: string; credit: string };

/** One image per act category. Keyed to ENTERTAINER_CATEGORIES. */
export const CATEGORY_SHOTS: Record<string, Shot> = {
  singer: {
    id: "photo-1511671782779-c97d3d27a1d4",
    alt: "A vintage microphone lit against warm bokeh",
    credit: "Israel Palacio",
  },
  band: {
    id: "photo-1549213783-8284d0336c4f",
    alt: "A band playing live, bassist in the foreground",
    credit: "Austin Neill",
  },
  dj: {
    id: "photo-1470225620780-dba8ba36b745",
    alt: "A DJ's hand on a mixer under pink and purple light",
    credit: "Marcela Laskoski",
  },
  comedian: {
    id: "photo-1485579149621-3123dd979885",
    alt: "A retro microphone against a purple backdrop",
    credit: "Matt Botsford",
  },
  tribute: {
    id: "photo-1516450360452-9312f5e86fc7",
    alt: "A band on a lit stage in front of a full room",
    credit: "Aditya Chinchure",
  },
  drag: {
    id: "photo-1493225457124-a3eb161ffa5f",
    alt: "A performer with arms raised amid smoke and confetti",
    credit: "Hanny Naibaho",
  },
  dancer: {
    id: "photo-1547153760-18fc86324498",
    alt: "A dancer mid-movement against a blue backdrop",
    credit: "Ahmad Odeh",
  },
  acoustic: {
    id: "photo-1543007630-9710e4a00a20",
    alt: "An intimate bar interior with warm hanging lights",
    credit: "Adam Jaime",
  },
  other: {
    id: "photo-1506157786151-b8491531f063",
    alt: "A festival stage washed in purple light above a crowd",
    credit: "Danny Howe",
  },
};

/** One image per venue type. Keyed to VENUE_TYPES. */
export const VENUE_SHOTS: Record<string, Shot> = {
  pub: {
    id: "photo-1572116469696-31de0f17cc34",
    alt: "A pub bar lined with warm hanging lights",
    credit: "Patrick Tomasso",
  },
  club: {
    id: "photo-1574391884720-bbc3740c59d1",
    alt: "A dark club dancefloor under coloured light",
    credit: "Antoine J.",
  },
  hotel: {
    id: "photo-1543007630-9710e4a00a20",
    alt: "A hotel bar with warm lighting",
    credit: "Adam Jaime",
  },
  restaurant: {
    id: "photo-1414235077428-338989a2e8c0",
    alt: "A restaurant table being served",
    credit: "Jay Wennington",
  },
  holiday_park: {
    id: "photo-1524368535928-5b5e00ddc76b",
    alt: "A crowd in front of a warmly lit stage",
    credit: "Vishnu R Nair",
  },
  event_company: {
    id: "photo-1560439514-4e9645039924",
    alt: "An outdoor event with a large crowd",
    credit: "Kyle Head",
  },
  festival: {
    id: "photo-1506157786151-b8491531f063",
    alt: "A festival stage washed in purple light above a crowd",
    credit: "Danny Howe",
  },
  other: {
    id: "photo-1519671482749-fd09be7ccebf",
    alt: "People raising glasses together",
    credit: "Kelsey Chance",
  },
};

/** The homepage hero. Chosen because its own lighting is GIGLY's palette. */
export const HERO_SHOT: Shot = {
  id: "photo-1516450360452-9312f5e86fc7",
  alt: "",
  credit: "Aditya Chinchure",
};

export function categoryShot(category: string): Shot {
  return CATEGORY_SHOTS[category] ?? CATEGORY_SHOTS.other!;
}

export function venueShot(venueType: string): Shot {
  return VENUE_SHOTS[venueType] ?? VENUE_SHOTS.other!;
}

/**
 * Photos assigned to the demo accounts, so a freshly seeded database looks
 * like a working marketplace rather than a wireframe. Removed along with
 * everything else by "Remove demo data".
 */
export const DEMO_ACT_SHOTS: Record<string, string> = {
  "ruby@demo.gigly.invalid": "photo-1511671782779-c97d3d27a1d4",
  "neon@demo.gigly.invalid": "photo-1549213783-8284d0336c4f",
  "kyle@demo.gigly.invalid": "photo-1485579149621-3123dd979885",
  "soul@demo.gigly.invalid": "photo-1516450360452-9312f5e86fc7",
  "maria@demo.gigly.invalid": "photo-1543007630-9710e4a00a20",
  "deck@demo.gigly.invalid": "photo-1470225620780-dba8ba36b745",
  "stan@demo.gigly.invalid": "photo-1493225457124-a3eb161ffa5f",
  "lila@demo.gigly.invalid": "photo-1547153760-18fc86324498",
};
