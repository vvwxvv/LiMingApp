// lib/typography.js
// ════════════════════════════════════════════════════════════════════════
//  FONT FAMILY — the single source of truth for the site's typefaces.
//
//  The site uses exactly TWO font families:
//    zh → HuaWenFangSong
//    en → AndaleMono
//
//  Every layout role resolves to the family for the current language.
//  Role names are kept so existing useFont(role) calls keep working.
//
//  Read through  useFont(role)        → hooks/useFont.js  (React, language-aware)
//          or    resolveFontFamily()  → this file         (pure, no React)
//
//  Font files are set here too (`src`). FONT_FACE_CSS turns them into
//  @font-face rules — inject it once in the root layout (see bottom).
// ════════════════════════════════════════════════════════════════════════

// ── 1. FONT FAMILIES ────────────────────────────────────────────────────
//   name     the @font-face family name
//   src      font file path (served from /public)
//   generic  CSS generic keyword used only if the font file fails to load
export const FONT_FAMILIES = {
  huaWenFangSong: {
    name: 'HuaWenFangSong',
    src: '/fonts/HuaWenFangSong/HuaWenFangSong.ttf',
    generic: 'serif',
  },
  andaleMono: {
    name: 'AndaleMono',
    src: '/fonts/AndaleMono/AndaleMono.ttf',
    generic: 'monospace',
  },
};

// The family each language uses.
export const DEFAULT_FAMILY = {
  zh: 'huaWenFangSong',
  en: 'andaleMono',
};

// ── 2. ROLES ────────────────────────────────────────────────────────────
// Every role uses the language family. Sizes / line-heights / tracking live
// with the component that renders the role — never here.
const ROLES = [
  // Index / section headings
  'sectionTitle', 'artistListItem', 'artistName', 'archiveDisplay',
  // Navigation
  'navLink', 'managerNavLink',
  // Language switcher
  'languageSwitcher',
  // Exhibitions list page
  'exhibitionCaption', 'exhibitionSectionHeading', 'yearDropdownLabel',
  'exhibitionCardLabel',
  // Artworks page
  'artworkSectionTitle', 'artworkCardArtist', 'artworkCardCaption',
  'artworkCardMeta', 'artworkCardEnquire', 'artworkCardFallback',
  // Artist pages
  'artistListMeta', 'artistBio', 'artistWorksHeading',
  // About page
  'aboutBody',
  // Exhibition & Fair detail pages (shared)
  'detailTitle', 'detailSubtitle', 'detailDate', 'detailCaption', 'detailBody',
  'detailSectionHeading', 'detailLink', 'detailMetaLabel', 'detailMetaValue',
  // Generic / shared
  'bodyText', 'body', 'input', 'button', 'label',
];

export const TYPE_SCALE = Object.fromEntries(
  ROLES.map((role) => [role, { zh: DEFAULT_FAMILY.zh, en: DEFAULT_FAMILY.en }])
);

// ── 3. RESOLVER ─────────────────────────────────────────────────────────
// Pure functions — no React, no context. Safe to call anywhere.

const quote = (name) => `'${name}'`;

function familyStack(key, lang) {
  const family = FONT_FAMILIES[key] || FONT_FAMILIES[DEFAULT_FAMILY[lang]];
  return `${quote(family.name)}, ${family.generic}`;
}

/**
 * resolveFontFamily(role, lang) → CSS font-family stack
 *
 * @param {string} role  a key in TYPE_SCALE (unknown → 'body')
 * @param {'zh'|'en'} lang
 * @returns {string} "'HuaWenFangSong', serif" (zh) or "'AndaleMono', monospace" (en)
 *
 * Total function: never throws, never returns an empty string.
 */
export function resolveFontFamily(role, lang = 'en') {
  const l = lang === 'zh' ? 'zh' : 'en';
  const spec = TYPE_SCALE[role] || TYPE_SCALE.body;
  return familyStack(spec[l], l);
}

// ── 4. @FONT-FACE ───────────────────────────────────────────────────────
// @font-face rules for every family above. Inject once, e.g. in the root
// layout:  <style dangerouslySetInnerHTML={{ __html: FONT_FACE_CSS }} />
export const FONT_FACE_CSS = Object.values(FONT_FAMILIES)
  .map(
    ({ name, src }) => `@font-face {
  font-family: '${name}';
  src: url('${src}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`
  )
  .join('\n');