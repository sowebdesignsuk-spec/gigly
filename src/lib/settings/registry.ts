/**
 * The settings an admin can change, and their defaults.
 *
 * Same pattern as the CMS: defaults live in code, the app_settings table holds
 * only overrides. An empty table therefore renders a fully working site, and
 * "reset" is a delete.
 *
 * Nothing secret appears here — see the migration for why. Verification tokens
 * and analytics ids are in the list because they are public by construction:
 * they are published in a meta tag or a script src the moment they are used.
 */

export type SettingKind = "text" | "textarea" | "url" | "email" | "toggle";

export type Setting = {
  key: string;
  label: string;
  help: string;
  kind: SettingKind;
  default: string;
  placeholder?: string;
};

export type SettingGroup = {
  id: string;
  title: string;
  blurb: string;
  settings: Setting[];
};

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "site",
    title: "Site",
    blurb: "The basics, used across the public pages and in emails once email is wired up.",
    settings: [
      {
        key: "site.name",
        label: "Site name",
        help: "Appears in the browser tab after each page title, and in structured data.",
        kind: "text",
        default: "GIGLY",
      },
      {
        key: "site.url",
        label: "Public URL",
        help: "Used to build absolute links in the sitemap and share previews. No trailing slash.",
        kind: "url",
        default: "https://gigly-gilt.vercel.app",
        placeholder: "https://gigly.co.uk",
      },
      {
        key: "site.contact_email",
        label: "Contact email",
        help: "Shown on the contact page and used as the reply-to once email is set up.",
        kind: "email",
        default: "hello@gigly.co.uk",
      },
    ],
  },
  {
    id: "seo",
    title: "SEO",
    blurb:
      "Defaults for pages that don't set their own. Individual gigs and profiles always write their own title and description from real data.",
    settings: [
      {
        key: "seo.default_title",
        label: "Default page title",
        help: "The homepage title, and the fallback anywhere a page has none.",
        kind: "text",
        default: "GIGLY — More gigs. More money. More freedom.",
      },
      {
        key: "seo.default_description",
        label: "Default meta description",
        help: "Around 150 characters. Google will often write its own anyway.",
        kind: "textarea",
        default:
          "GIGLY connects entertainers with venues. Find gigs, fill dates, get booked — without the phone tag, the agency cut, or the Facebook group.",
      },
      {
        key: "seo.og_image",
        label: "Share image",
        help: "Shown when a link is posted to social media. 1200×630 works best. Leave blank to use none.",
        kind: "url",
        default: "",
        placeholder: "https://…/og.png",
      },
      {
        key: "seo.google_site_verification",
        label: "Google Search Console token",
        help: "From Search Console → Settings → Ownership verification → HTML tag. Paste only the content value.",
        kind: "text",
        default: "",
        placeholder: "abc123…",
      },
      {
        key: "seo.bing_site_verification",
        label: "Bing Webmaster token",
        help: "Optional. Same idea as the Google one.",
        kind: "text",
        default: "",
      },
      {
        key: "seo.noindex",
        label: "Hide from search engines",
        help:
          "Turn on while the site is not ready for the public. This blocks every crawler site-wide — remember to turn it off at launch.",
        kind: "toggle",
        default: "false",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    blurb: "Both are public identifiers, not secrets. Leave blank to load nothing at all.",
    settings: [
      {
        key: "analytics.plausible_domain",
        label: "Plausible domain",
        help: "Privacy-friendly and cookie-free, so no consent banner. Set the domain you registered with Plausible.",
        kind: "text",
        default: "",
        placeholder: "gigly.co.uk",
      },
      {
        key: "analytics.ga_measurement_id",
        label: "Google Analytics ID",
        help:
          "Starts with G-. Note that GA sets cookies, so using it means you need a consent banner under UK GDPR.",
        kind: "text",
        default: "",
        placeholder: "G-XXXXXXXXXX",
      },
    ],
  },
  {
    id: "social",
    title: "Social links",
    blurb: "Shown in the footer. Blank ones are hidden rather than rendered dead.",
    settings: [
      { key: "social.instagram", label: "Instagram", help: "", kind: "url", default: "" },
      { key: "social.facebook", label: "Facebook", help: "", kind: "url", default: "" },
      { key: "social.tiktok", label: "TikTok", help: "", kind: "url", default: "" },
      { key: "social.x", label: "X / Twitter", help: "", kind: "url", default: "" },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace",
    blurb: "Rules that change how the product behaves.",
    settings: [
      {
        key: "marketplace.signups_open",
        label: "Allow new sign-ups",
        help: "Turn off to close registration without taking the site down.",
        kind: "toggle",
        default: "true",
      },
      {
        key: "marketplace.default_radius_miles",
        label: "Default travel radius",
        help: "Pre-filled on a new entertainer profile, in miles.",
        kind: "text",
        default: "30",
      },
    ],
  },
];

export const ALL_SETTINGS: Setting[] = SETTING_GROUPS.flatMap((g) => g.settings);

const BY_KEY = new Map(ALL_SETTINGS.map((s) => [s.key, s]));

export function settingDefault(key: string): string {
  return BY_KEY.get(key)?.default ?? "";
}

export function isKnownSetting(key: string): boolean {
  return BY_KEY.has(key);
}

/**
 * Secrets. NOT stored in the database — this is only the list used to report
 * which are configured, and what each one unlocks. `envVar` is read
 * server-side; the value itself is never sent to the browser.
 */
export type SecretSpec = {
  envVar: string;
  label: string;
  unlocks: string;
  where: string;
  required: boolean;
};

export const SECRETS: SecretSpec[] = [
  {
    envVar: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase URL",
    unlocks: "Everything. The app cannot start without it.",
    where: "Supabase → Settings → API",
    required: true,
  },
  {
    envVar: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase publishable key",
    unlocks: "Everything. Safe to expose — row-level security is what protects the data.",
    where: "Supabase → Settings → API",
    required: true,
  },
  {
    envVar: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase secret key",
    unlocks:
      "Server-side work that must bypass row-level security. Nothing needs it yet — leave it unset until something does.",
    where: "Supabase → Settings → API",
    required: false,
  },
  {
    envVar: "RESEND_API_KEY",
    label: "Resend",
    unlocks:
      "Email notifications, and turning Supabase's “Confirm email” back on. Free tier is 3,000 emails a month.",
    where: "resend.com → API Keys",
    required: false,
  },
  {
    envVar: "NEXT_PUBLIC_GOOGLE_MAPS_KEY",
    label: "Google Maps",
    unlocks:
      "A map on gig detail pages. Locations already work without it — postcodes.io handles the geocoding free.",
    where: "Google Cloud Console → APIs & Services → Credentials",
    required: false,
  },
  {
    envVar: "NEXT_PUBLIC_SENTRY_DSN",
    label: "Sentry",
    unlocks: "Error monitoring. Run npx @sentry/wizard@latest -i nextjs once you have an account.",
    where: "sentry.io → Project settings → Client Keys",
    required: false,
  },
  {
    envVar: "STRIPE_SECRET_KEY",
    label: "Stripe",
    unlocks: "Payments, deposits and invoicing — Phase 2 of the plan. Nothing uses it yet.",
    where: "Stripe → Developers → API keys",
    required: false,
  },
];
