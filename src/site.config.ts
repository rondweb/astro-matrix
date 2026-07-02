/**
 * Single user-facing config entry for Anglefeint.
 * Edit this file only. Other files under src/config/* and src/i18n/* are adapters.
 */
import { defineThemeConfig } from './site.config.defaults.ts';

export type {
  AboutConfig,
  LocaleCode,
  LocaleConfig,
  LocaleMetaConfig,
  LocaleSiteConfig,
  NormalizedLocaleConfig,
  NormalizedThemeI18nConfig,
  SocialLink,
  ThemeConfig,
  ThemeI18nConfig,
} from './site.config.schema.ts';
export { DEFAULT_ABOUT_CONFIG, defineThemeConfig } from './site.config.defaults.ts';
export { normalizeI18nConfig } from './site.config.runtime.ts';

/**
 * Edit this object only.
 * Omitted fields safely fall back to theme defaults.
 */
export const THEME_CONFIG = defineThemeConfig({
  site: {
    title: 'LNDS Framework - Live For Nothing or Die For Something',
    description:
      'LNDS is a modern framework for human meaning, identity, and purpose in the age of AI. A philosophical and practical system designed to help individuals remove their masks.',
    url: 'https://lnds.space',
    author: 'LNDS',
    tagline: 'Live for Nothing or Die for Something',
  },
  theme: {
    enableAboutPage: false,
  },
  i18n: {
    defaultLocale: 'en',
    locales: {
      en: {
        meta: {
          label: 'English',
          hreflang: 'en',
          ogLocale: 'en_US',
        },
        site: {
          hero: 'LNDS is a modern framework for human meaning, identity, and purpose in the age of AI. A philosophical and practical system designed to help individuals remove their masks.',
        },
      },
    },
    routing: {
      defaultLocalePrefix: 'always',
    },
  },
  social: {
    links: [
      {
        href: 'https://www.facebook.com/profile.php?id=61569271075332',
        label: 'Facebook',
      },
    ],
  },
});
