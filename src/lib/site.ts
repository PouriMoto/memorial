import { z } from 'astro/zod';
import settingsRaw from '../content/site/settings.json';
import authorRaw from '../content/site/author.json';

const localized = z.object({ fa: z.string(), en: z.string().optional() });
const link = z.object({ label: z.string(), url: z.string().default(''), note: z.string().optional() });
const channel = z.object({
  type: z.enum(['telegram', 'bale', 'rubika', 'whatsapp', 'email', 'other']),
  label: z.string(),
  url: z.string().default(''),
  note: z.string().optional(),
});

/** Site-wide master switches. Off = the page is not generated and no link points to it. */
const featuresSchema = z.object({
  biography: z.boolean().default(true),
  timeline: z.boolean().default(true),
  gallery: z.boolean().default(true),
  videos: z.boolean().default(true),
  memories: z.boolean().default(true),
  keepsakes: z.boolean().default(true),
  sources: z.boolean().default(true),
  /** Lightweight grave-side page at /g/<slug>/ (the QR / NFC target). */
  grave: z.boolean().default(true),
  /** Printable QR page at /<slug>/qr/ (creator and family tool, not linked from the public site). */
  qr: z.boolean().default(true),
  /** Creator intro, order page, order CTA and the creator credit line. Turn off for client sites. */
  studio: z.boolean().default(true),
});

const settingsSchema = z.object({
  title: localized,
  description: localized,
  /** Production URL; the SITE_URL environment variable takes priority. */
  productionUrl: z.string().default(''),
  defaultCalendar: z.enum(['gregory', 'persian']).default('gregory'),
  features: featuresSchema.prefault({}),
  /** Google Forms URL (the /viewform form). Empty = no embedded form. */
  googleFormsUrl: z.string().default(''),
  /** Chat channels where visitors can send memories. Only channels with a url are shown. */
  memoryChannels: z.array(channel).default([]),
  /**
   * Optional visitor counter (off by default). Use a cookie-free service you control or trust, e.g. a self-hosted
   * Umami/Plausible. `scriptUrl` is the service's script; `pixelUrl` (optional) is an image beacon used on the
   * grave-side page, which has no JavaScript. `{path}` in pixelUrl is replaced by the page path.
   */
  analytics: z
    .object({
      enabled: z.boolean().default(false),
      scriptUrl: z.string().default(''),
      websiteId: z.string().default(''),
      domain: z.string().default(''),
      pixelUrl: z.string().default(''),
    })
    .prefault({}),
  orderCta: z.object({
    heading: localized,
    text: localized,
    /** Primary contact destination (e.g. a Telegram link). Empty = hidden. */
    primaryContactUrl: z.string().default(''),
    primaryContactLabel: localized.optional(),
  }),
  contactLinks: z.array(link).default([]),
  socialProfiles: z.array(link).default([]),
  externalMedia: z.array(link).default([]),
});

const authorSchema = z.object({
  displayName: localized,
  introduction: localized,
  handle: z.string().default(''),
});

/** Host used in astro.config.mjs until a real production URL is configured. */
export const PLACEHOLDER_HOST = 'username.github.io';

export const settings = settingsSchema.parse(settingsRaw);
export const author = authorSchema.parse(authorRaw);
export const features = settings.features;

/** Contact links that actually have a destination configured. */
export const activeContacts = settings.contactLinks.filter((l) => l.url.trim() !== '');
export const activeSocial = settings.socialProfiles.filter((l) => l.url.trim() !== '');
export const activeChannels = settings.memoryChannels.filter((c) => c.url.trim() !== '');

export const formsUrl = settings.googleFormsUrl.trim();
export const primaryContactUrl = settings.orderCta.primaryContactUrl.trim() || activeContacts[0]?.url || '';
