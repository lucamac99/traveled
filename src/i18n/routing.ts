import { defineRouting } from "next-intl/routing";

// URLs carry no locale prefix: the proxy picks the locale from the NEXT_LOCALE cookie or the
// browser's Accept-Language header and rewrites internally to /[locale]/...
export const routing = defineRouting({
  locales: ["en", "it"],
  defaultLocale: "en",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
