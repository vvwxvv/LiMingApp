"use client";

import React, {
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  memo,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import { ManagerContext } from "@/components/contexts/ManagerContext";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import { DEFAULT_MENUS } from "@/utils/siteMetaDefaults";
import useSiteMeta from "@/hooks/useSiteMeta";
import useFont from '@/hooks/useFont';
import { getBrandName } from "@/utils/artistUtils";
import LanguageSwitcherInMenu from "@/components/switchers/LanguageSwitcherInMenu";
import ActionButton from "@/components/buttons/ActionButton";
import { useAsyncAction } from "@/hooks/useAsyncAction";

// ═════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION — single source of truth for ALL visuals
// ═════════════════════════════════════════════════════════════════════
//
// Everything the nav renders — font, spacing, color, timing, shadows —
// is set here. Nothing visual should be hardcoded further down; if you
// need to tweak how the nav looks, this is the only block to touch.
//
// FONT FAMILY specifically: this component never hardcodes a font.
// It reads `FONT.ROLE` below and hands it to useFont(), which looks the
// role up in lib/typography.js (see TYPE_SCALE → FONT_FAMILIES there).
// To change which typography role this nav uses, edit FONT.ROLE. To change
// what family that role resolves to, edit lib/typography.js — not this file.
//
// Current resolution for ROLE "bodyText": zh → pingFangRegular;
// en → avenirRegular (TYPE_SCALE.bodyText in lib/typography.js).
//
const NAV_CONFIG = {
  // ── Font ─────────────────────────────────────────────────────────
  FONT: {
    // Lighter face for the nav. (Was "navLink" → Jost-Medium, a MEDIUM face
    // that read bold at any weight.) "bodyText" = pingFangRegular (zh) /
    // avenirRegular (en) — thin at rest.
    ROLE: "bodyText", // must match a key in TYPE_SCALE (lib/typography.js)
    FALLBACK_FAMILY: "sans-serif", // used only if the role/hook ever fails to resolve
  },

  // ── Top bar ──────────────────────────────────────────────────────
  BAR: {
    HEIGHT: 70,
    PADDING_HORIZONTAL_DESKTOP: 50,
    PADDING_HORIZONTAL_MOBILE: 16,
    Z_INDEX: 1300,
    SHOW_BORDER: false,
    BORDER_WIDTH: "1px",
    BORDER_COLOR: null, // null → falls back to theme border color
    BACKGROUND_TRANSITION: "background-color 0.3s ease, border-color 0.3s ease",
    // Slide animation when the bar hides / reappears on scroll.
    HIDE_TRANSITION: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, border-color 0.3s ease",
  },

  // ── Smart show / hide on scroll ──────────────────────────────────
  // The bar slides away while you scroll DOWN, and slides back the moment
  // you (a) scroll UP, (b) return near the top, or (c) reach a NEW section
  // (any element marked [data-nav-section] whose top hits the bar line).
  SCROLL: {
    SHOW_AT_TOP: 80,        // always visible within this many px of the top
    BOUNDARY_HOLD: 140,     // stay visible for this many px after a new section is reached
    SECTION_SELECTOR: "[data-nav-section]",
    SCROLLED_AT: 20,        // past this y, the bar gets its solid background (readable over content)
  },

  // ── Brand wordmark (text — replaces the old logo image) ───────
  // Text = the person/artist name from env (see utils/artistUtils.js
  // → getBrandName). Font family resolves via useFont(FONT_ROLE) →
  // lib/typography.js; the "artistName" role maps to bigCaslon (both langs).
  BRAND: {
    FONT_ROLE: "artistName", // must match a key in TYPE_SCALE (lib/typography.js)
    FONT_SIZE_DESKTOP: "30px",
    FONT_SIZE_MOBILE: "24px",
    FONT_WEIGHT: 400,
    LETTER_SPACING: "0.04em",
    LINE_HEIGHT: "1",
    COLOR: null, // null → LINK.COLOR (black)
    TEXT_TRANSFORM: "none",
  },

  // ── Menu links ───────────────────────────────────────────────────
  // Still the typographic source of truth for the (now drawer-only)
  // menu: same font size / weight / family / spacing as before.
  LINK: {
    FONT_SIZE: "17px",
    FONT_WEIGHT: 300, // idle → thin (all nav is thin until hover)
    // Hover / active page → bold.
    FONT_WEIGHT_HOVER: 700,
    HOVER_TEXT_STROKE: "0px",
    LINE_HEIGHT: "15px",
    LETTER_SPACING: "0.03em",
    TEXT_TRANSFORM: "none",
    COLOR: null, // null → theme text colour (black in light / white in dark)
    COLOR_ACTIVE: null, // null → theme text colour (hover / active page)
    OPACITY_DEFAULT: 1,
    OPACITY_ACTIVE: 1,
    HOVER_TRANSITION: "opacity 0.2s ease, color 0.2s ease, font-weight 0.15s ease, -webkit-text-stroke 0.15s ease",
  },

  // ── Right-side action cluster (e-flux-style) ─────────────────────
  // The bar's right side is now a fixed cluster, left → right:
  //     [ Archive button ] [ search ] [ menu ]
  // It shows at EVERY breakpoint — the text menu moved into the drawer,
  // opened by the menu (hamburger) icon. See DRAWER below.
  ACTIONS: {
    // Solid, square black button that inverts with the theme
    // (light → black box / white label, dark → white box / black label).
    ARCHIVE: {
      LABEL_EN: "Archive",
      LABEL_CN: "档案",
      HREF: "/artworks/archive", // the public artwork archive page
      FONT_SIZE: "15px",
      FONT_WEIGHT: 500,
      LETTER_SPACING: "0.01em",
      TEXT_TRANSFORM: "none",
      PADDING: "9px 20px",
      PADDING_MOBILE: "9px 16px",
      FONT_SIZE_MOBILE: "14px",
      MIN_HEIGHT_MOBILE: 40, // comfortable touch target
      BORDER_RADIUS: 0, // square corners (e-flux)
      BACKGROUND: null, // null → theme TEXT colour (black in light)
      COLOR: null, // null → theme BACKGROUND (white in light)
      BORDER: "none",
      HOVER_OPACITY: 0.78,
      TRANSITION: "opacity 0.2s ease",
    },

    // Icon buttons (search + menu) — thin-line SVGs drawn in currentColor.
    ICON: {
      SIZE: 21, // svg box, px
      STROKE: 1.6, // line weight — keep thin like e-flux
      GAP: "16px", // gap inside the cluster (button ↔ button)
      GAP_MOBILE: "12px",
      HIT_PADDING: "4px", // clickable padding around the glyph
      HIT_PADDING_MOBILE: "9px", // bigger tap targets on touch screens
      COLOR: null, // null → LINK colour (theme text)
      HOVER_OPACITY: 0.55,
      TRANSITION: "opacity 0.2s ease",
    },
  },

  // ── Search overlay ───────────────────────────────────────────────
  // Clicking the magnifier opens a minimal overlay that searches the
  // artwork list client-side (same endpoint the archive page uses) and
  // navigates to /artworks/<slug> on pick.
  SEARCH: {
    API: "/api/artwork", // list endpoint searched client-side
    BASE_HREF: "/artworks", // result → `${BASE_HREF}/${slug(title)}`
    PLACEHOLDER_EN: "Search",
    PLACEHOLDER_CN: "搜索",
    NO_RESULTS_EN: "No results",
    NO_RESULTS_CN: "无结果",
    LOADING_EN: "Loading…",
    LOADING_CN: "加载中…",
    INPUT_FONT_SIZE: "20px",
    INPUT_LETTER_SPACING: "0.02em",
    MAX_RESULTS: 8,
    PANEL_PADDING: "22px 24px 24px",
    PANEL_MAX_WIDTH: 720,
    PANEL_SHADOW: "0 6px 18px rgba(0,0,0,0.10)",
    // Bauhaus touch: a solid vertical rule leads the field, and the whole
    // row sits on a thin baseline rule. Colour null → theme text colour.
    ACCENT: { WIDTH: 2, HEIGHT: 28, GAP: 12, COLOR: null },
    RULE_WIDTH: "1px",
    RULE_COLOR: null, // null → theme border colour
    ICON_SIZE: 20,
    ICON_GAP: 14,
    RESULT_PADDING: "11px 0",
    RESULT_FONT_SIZE: "15px",
    ANIM_DURATION: 0.2,
  },

  // ── Mobile drawer ────────────────────────────────────────────────
  DRAWER: {
    WIDTH: "280px",
    MAX_WIDTH: "85vw",
    Z_INDEX: 1500,
    PADDING: "24px 24px 24px",
    PADDING_TOP: 24, // + safe-area inset applied in style

    // Header row inside the drawer: app title (left) + close (right).
    HEADER: {
      TITLE_SIZE: "22px",
      TITLE_WEIGHT: 500,
      TITLE_LETTER_SPACING: "0.01em",
      MARGIN_BOTTOM: 22,
      CLOSE_SIZE: 24,      // svg box px
      CLOSE_STROKE: 1.8,
      CLOSE_PADDING: 6,
      HOVER_ROTATE: 90,    // degrees the  turns on hover
      ROTATE_DURATION: 0.3,
      HOVER_OPACITY: 0.6,
    },
    CONTENT_GAP: "4px",
    BOX_SHADOW: "2px 0 12px rgba(0,0,0,0.15)",
    ANIM_DURATION: 0.25,
    ANIM_EASING: "tween",

    BACKDROP_COLOR: "rgba(0,0,0,0.5)",
    BACKDROP_Z_OFFSET: 100, // backdrop z-index = DRAWER.Z_INDEX - this
    BACKDROP_FADE_DURATION: 0.2,

    // Typography is inherited from LINK.* so the drawer matches exactly —
    // same font size, weight and family.
    LINK_COLOR: null,        // null → LINK.COLOR (black)
    LINK_COLOR_ACTIVE: null, // null → LINK active colour (black)
    LINK_PADDING: "14px 0",
    // Mobile drawer links get +0.5px letter-spacing beyond the LINK value.
    LETTER_SPACING_EXTRA_PX: 0.5,
    SHOW_ITEM_DIVIDER: true,
    DIVIDER_COLOR: null, // null → falls back to theme border color
  },
};

// ----------------------------------------------------------------------------
// Pure helpers — read from NAV_CONFIG, never hardcode a visual value here
// ----------------------------------------------------------------------------

function buildBaseLinkStyle(navFontFamily) {
  return {
    textDecoration: "none",
    fontFamily: navFontFamily,
    whiteSpace: "nowrap",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: NAV_CONFIG.LINK.HOVER_TRANSITION,
  };
}

function buildDrawerLinkStyle({ baseLinkStyle, drawerDividerColor }) {
  // Typography copied from the LINK config (single source of truth) so the
  // drawer is identical in size / weight / family.
  // Colour is applied per-item by DrawerLink (grey idle → black on hover/active).
  return {
    ...baseLinkStyle,
    opacity: 1,
    fontSize: NAV_CONFIG.LINK.FONT_SIZE,
    fontWeight: NAV_CONFIG.LINK.FONT_WEIGHT,
    lineHeight: NAV_CONFIG.LINK.LINE_HEIGHT,
    letterSpacing: `calc(${NAV_CONFIG.LINK.LETTER_SPACING} + ${NAV_CONFIG.DRAWER.LETTER_SPACING_EXTRA_PX}px)`,
    textTransform: NAV_CONFIG.LINK.TEXT_TRANSFORM,
    padding: NAV_CONFIG.DRAWER.LINK_PADDING,
    borderBottom: NAV_CONFIG.DRAWER.SHOW_ITEM_DIVIDER
      ? `1px solid ${drawerDividerColor}`
      : "none",
  };
}

// Title → URL slug. Unicode-aware (keeps CJK) so it matches the artwork
// detail route (see components/pages/artworks/hooks/useArtworkSlugData.js).
function slugifyTitle(text) {
  if (!text) return "";
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

// ----------------------------------------------------------------------------
// Icons — thin-line SVGs drawn in currentColor so the theme drives them
// ----------------------------------------------------------------------------

function ThinSearchIcon({ size, stroke }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="15.8" y1="15.8" x2="21" y2="21" />
    </svg>
  );
}

function ThinMenuIcon({ size, stroke }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}

function ThinCloseIcon({ size, stroke }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

// Drawer close button — a thin that rotates on hover, closes on click.
const DrawerCloseButton = memo(function DrawerCloseButton({ onClick, color }) {
  const { HEADER } = NAV_CONFIG.DRAWER;
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label="Close menu"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        margin: 0,
        padding: HEADER.CLOSE_PADDING,
        cursor: "pointer",
        color,
        lineHeight: 0,
        transform: hover ? `rotate(${HEADER.HOVER_ROTATE}deg)` : "rotate(0deg)",
        transition: `transform ${HEADER.ROTATE_DURATION}s ease, opacity 0.2s ease`,
        opacity: hover ? HEADER.HOVER_OPACITY : 1,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <ThinCloseIcon size={HEADER.CLOSE_SIZE} stroke={HEADER.CLOSE_STROKE} />
    </button>
  );
});

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------

// Brand wordmark — plain text (person name), never an image.
// The name comes from env via getBrandName(isCn) (utils/artistUtils.js).
const Brand = memo(function Brand({ isMobile, name, fontFamily, color }) {
  const { BRAND } = NAV_CONFIG;
  return (
    <Link
      href="/"
      style={{
        display: "flex",
        alignItems: "center",
        textDecoration: "none",
        flexShrink: 0,
        fontFamily,
        fontSize: isMobile ? BRAND.FONT_SIZE_MOBILE : BRAND.FONT_SIZE_DESKTOP,
        fontWeight: BRAND.FONT_WEIGHT,
        letterSpacing: BRAND.LETTER_SPACING,
        lineHeight: BRAND.LINE_HEIGHT,
        textTransform: BRAND.TEXT_TRANSFORM,
        whiteSpace: "nowrap",
        color,
        // Larger hit area without shifting the wordmark.
        padding: "6px 0",
        margin: "-6px 0",
      }}
    >
      {name}
    </Link>
  );
});



const DrawerLink = memo(function DrawerLink({ item, onClick, linkStyle, color, colorActive, isActive }) {
  const [hover, setHover] = useState(false);
  const active = hover || isActive;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={isActive ? "page" : undefined}
      style={{
        ...linkStyle,
        position: "relative",
        color: active ? colorActive : color,
        fontWeight: active
          ? NAV_CONFIG.LINK.FONT_WEIGHT_HOVER
          : NAV_CONFIG.LINK.FONT_WEIGHT,
        WebkitTextStroke: active
          ? `${NAV_CONFIG.LINK.HOVER_TEXT_STROKE} currentColor`
          : "0px currentColor",
      }}
    >
      {/* Underline sweep — colour = theme text so it shows in light AND dark. */}
      <span style={{ position: "relative", display: "inline-block" }}>
        {item.label}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -3,
            height: "1px",
            backgroundColor: colorActive,
            transformOrigin: "left",
            pointerEvents: "none",
          }}
        />
      </span>
    </Link>
  );
});

function MobileDrawer({ menuList, isOpen, onClose, colors, drawerLinkStyle, linkColor, linkColorActive, pathname, navFontFamily, onLinkClick, title, titleFontFamily }) {
  const { DRAWER } = NAV_CONFIG;
  const panelTransition = useMemo(
    () => ({ type: DRAWER.ANIM_EASING, duration: DRAWER.ANIM_DURATION }),
    [DRAWER.ANIM_EASING, DRAWER.ANIM_DURATION]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DRAWER.BACKDROP_FADE_DURATION }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: DRAWER.Z_INDEX - DRAWER.BACKDROP_Z_OFFSET,
              backgroundColor: DRAWER.BACKDROP_COLOR,
            }}
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={panelTransition}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: DRAWER.WIDTH,
              maxWidth: DRAWER.MAX_WIDTH,
              zIndex: DRAWER.Z_INDEX,
              backgroundColor: colors.background,
              padding: DRAWER.PADDING,
              paddingTop: `calc(${DRAWER.PADDING_TOP}px + env(safe-area-inset-top, 0px))`,
              display: "flex",
              flexDirection: "column",
              gap: DRAWER.CONTENT_GAP,
              boxShadow: DRAWER.BOX_SHADOW,
            }}
          >
            {/* Drawer header — app title (left) + rotating close (right). */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: DRAWER.HEADER.MARGIN_BOTTOM,
              }}
            >
              <span
                style={{
                  fontFamily: titleFontFamily || navFontFamily,
                  fontSize: DRAWER.HEADER.TITLE_SIZE,
                  fontWeight: DRAWER.HEADER.TITLE_WEIGHT,
                  letterSpacing: DRAWER.HEADER.TITLE_LETTER_SPACING,
                  lineHeight: 1.1,
                  color: colors.text,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </span>
              <DrawerCloseButton onClick={onClose} color={colors.text} />
            </div>

            {menuList.map((item) => (
              <DrawerLink
                key={item.href}
                item={item}
                isActive={pathname === item.href}
                color={linkColor}
                colorActive={linkColorActive}
                onClick={() => {
                  onClose();
                  onLinkClick();
                }}
                linkStyle={drawerLinkStyle}
              />
            ))}

            {/* Language switcher — sits INSIDE the menu, right after the last
                item, with the same font/size/gap as the links. */}
            <LanguageSwitcherInMenu
              fontWeightActive={NAV_CONFIG.LINK.FONT_WEIGHT}
              fontWeightInactive={NAV_CONFIG.LINK.FONT_WEIGHT}
              hoverFontWeight={NAV_CONFIG.LINK.FONT_WEIGHT_HOVER}
              hoverTextStroke={NAV_CONFIG.LINK.HOVER_TEXT_STROKE}
              sx={{
                position: "static",
                top: "auto",
                right: "auto",
                zIndex: "auto",
                padding: NAV_CONFIG.DRAWER.LINK_PADDING,
                fontFamily: navFontFamily,
                fontSize: NAV_CONFIG.LINK.FONT_SIZE,
                fontWeight: NAV_CONFIG.LINK.FONT_WEIGHT,
                lineHeight: NAV_CONFIG.LINK.LINE_HEIGHT,
                letterSpacing: NAV_CONFIG.LINK.LETTER_SPACING,
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Minimal top-anchored search overlay. Loads the artwork list once on first
// open, filters client-side, and routes to the artwork detail page on pick.
function NavSearch({ open, onClose, isCn, colors, isDark, fontFamily }) {
  const { SEARCH, DRAWER } = NAV_CONFIG;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(null); // null → not fetched yet
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const fetchedRef = useRef(false);

  // Focus + Esc-to-close + reset whenever the overlay opens.
  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Lazy-load the searchable list the first time it opens.
  useEffect(() => {
    if (!open || fetchedRef.current) return undefined;
    fetchedRef.current = true;
    let cancelled = false;
    setLoading(true);
    fetch(SEARCH.API, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !items) return [];
    const targetLang = isCn ? "CN" : "EN";
    return items
      .filter((it) => {
        if (!it) return false;
        const lang = (it.language || "").toUpperCase();
        if (lang && lang !== targetLang) return false;
        return (it.title || "").toLowerCase().includes(q);
      })
      .slice(0, SEARCH.MAX_RESULTS);
  }, [query, items, isCn]);

  const goTo = useCallback(
    (it) => {
      if (!it) return;
      onClose();
      router.push(`${SEARCH.BASE_HREF}/${slugifyTitle(it.title)}`);
    },
    [onClose, router]
  );

  const onInputKeyDown = (e) => {
    if (e.key === "Enter") goTo(results[0]);
  };

  const text = colors.text;
  const bg = colors.background;
  const line = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const accentColor = SEARCH.ACCENT.COLOR ?? text;
  const ruleColor = SEARCH.RULE_COLOR ?? colors.border;
  const showHint = !!query.trim();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: SEARCH.ANIM_DURATION }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: DRAWER.Z_INDEX - DRAWER.BACKDROP_Z_OFFSET,
              backgroundColor: DRAWER.BACKDROP_COLOR,
            }}
          />

          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ type: "tween", duration: SEARCH.ANIM_DURATION, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: DRAWER.Z_INDEX,
              backgroundColor: bg,
              borderBottom: `1px solid ${line}`,
              padding: SEARCH.PANEL_PADDING,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: SEARCH.PANEL_SHADOW,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: SEARCH.ICON_GAP,
                width: "100%",
                maxWidth: SEARCH.PANEL_MAX_WIDTH,
                margin: "0 auto",
                borderBottom: `${SEARCH.RULE_WIDTH} solid ${ruleColor}`,
              }}
            >
              {/* Field: leading vertical rule + input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: SEARCH.ACCENT.GAP,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: SEARCH.ACCENT.WIDTH,
                    height: SEARCH.ACCENT.HEIGHT,
                    background: accentColor,
                    flexShrink: 0,
                  }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder={isCn ? SEARCH.PLACEHOLDER_CN : SEARCH.PLACEHOLDER_EN}
                  aria-label={isCn ? SEARCH.PLACEHOLDER_CN : SEARCH.PLACEHOLDER_EN}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: text,
                    fontFamily,
                    fontSize: SEARCH.INPUT_FONT_SIZE,
                    letterSpacing: SEARCH.INPUT_LETTER_SPACING,
                    padding: "10px 0",
                  }}
                />
              </div>

              {/* Search + close, grouped on the right */}
              <button
                type="button"
                onClick={() => goTo(results[0])}
                aria-label={isCn ? SEARCH.PLACEHOLDER_CN : SEARCH.PLACEHOLDER_EN}
                style={{
                  background: "none",
                  border: "none",
                  padding: 4,
                  margin: 0,
                  cursor: "pointer",
                  color: text,
                  lineHeight: 0,
                  flexShrink: 0,
                }}
              >
                <ThinSearchIcon size={SEARCH.ICON_SIZE} stroke={NAV_CONFIG.ACTIONS.ICON.STROKE} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={isCn ? "关闭" : "Close"}
                style={{
                  background: "none",
                  border: "none",
                  padding: 4,
                  margin: 0,
                  cursor: "pointer",
                  color: muted,
                  fontFamily,
                  fontSize: 22,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Results / states */}
            <div
              style={{
                width: "100%",
                maxWidth: SEARCH.PANEL_MAX_WIDTH,
                margin: "0 auto",
              }}
            >
              {showHint && loading && (
                <div style={{ color: muted, fontFamily, fontSize: SEARCH.RESULT_FONT_SIZE, padding: SEARCH.RESULT_PADDING }}>
                  {isCn ? SEARCH.LOADING_CN : SEARCH.LOADING_EN}
                </div>
              )}

              {showHint && !loading && results.length === 0 && (
                <div style={{ color: muted, fontFamily, fontSize: SEARCH.RESULT_FONT_SIZE, padding: SEARCH.RESULT_PADDING }}>
                  {isCn ? SEARCH.NO_RESULTS_CN : SEARCH.NO_RESULTS_EN}
                </div>
              )}

              {results.map((it, i) => (
                <Link
                  key={it._id || it.id || `${it.title}-${i}`}
                  href={`${SEARCH.BASE_HREF}/${slugifyTitle(it.title)}`}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 16,
                    textDecoration: "none",
                    color: text,
                    fontFamily,
                    fontSize: SEARCH.RESULT_FONT_SIZE,
                    padding: SEARCH.RESULT_PADDING,
                    borderTop: i === 0 ? "none" : `1px solid ${line}`,
                  }}
                >
                  <span style={{ minWidth: 0 }}>{it.title}</span>
                  <span style={{ color: muted, flexShrink: 0 }}>{it.year || ""}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export default function MainNav() {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { isManager } = useContext(ManagerContext);
  const { colors, isDark } = useReverseTheme();
  const { fontFamily: resolvedFontFamily } = useFont(NAV_CONFIG.FONT.ROLE);
  const navFontFamily = resolvedFontFamily || NAV_CONFIG.FONT.FALLBACK_FAMILY;
  const { fontFamily: brandFontFamily } = useFont(NAV_CONFIG.BRAND.FONT_ROLE);
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Fires on every link click; kept lightweight (throttleMs: 0) since the
  // page may navigate away immediately after. Wire up analytics/prefetch
  // logic inside this function.
  const { execute: onLinkClick } = useAsyncAction(
    async () => {
      console.log("Link clicked – async action triggered");
    },
    { throttleMs: 0, onSuccess: () => {}, onError: (err) => console.log(err) }
  );

  const isHome = pathname === "/";
  const languageKey = isCn ? "cn" : "en";

  // Menus come from the Meta document (manager-editable) with the JSON as fallback.
  const { meta: siteMeta } = useSiteMeta();
  const menuSource = siteMeta?.menu || DEFAULT_MENUS;
  const menuList = useMemo(() => {
    const source = isManager ? menuSource.managerMenu : menuSource.mainMenu;
    return source?.[languageKey] || [];
  }, [menuSource, isManager, languageKey]);

  // Resolve configured colors against the theme fallback once per render.
  // Nav text follows the theme (black in light, white in dark) so the whole
  // layout switches with the light/dark control.
  const linkColor = NAV_CONFIG.LINK.COLOR ?? colors.text;
  const linkColorActive = NAV_CONFIG.LINK.COLOR_ACTIVE ?? colors.text;
  const barBorderColor = NAV_CONFIG.BAR.BORDER_COLOR ?? colors.border;
  // Drawer links mirror the desktop colours: black idle → black hover/active.
  const drawerLinkColor = NAV_CONFIG.DRAWER.LINK_COLOR ?? linkColor;
  const drawerLinkColorActive =
    NAV_CONFIG.DRAWER.LINK_COLOR_ACTIVE ?? linkColorActive;
  const drawerDividerColor = NAV_CONFIG.DRAWER.DIVIDER_COLOR ?? colors.border;

  // Action cluster colours — the archive button inverts against the theme.
  const archiveBg = NAV_CONFIG.ACTIONS.ARCHIVE.BACKGROUND ?? colors.text;
  const archiveColor = NAV_CONFIG.ACTIONS.ARCHIVE.COLOR ?? colors.background;
  const iconColor = NAV_CONFIG.ACTIONS.ICON.COLOR ?? linkColor;

  // Brand wordmark text — env-driven (see utils/artistUtils.js → getBrandName).
  const brandName = getBrandName(isCn);
  const brandColor = NAV_CONFIG.BRAND.COLOR ?? linkColor;

  const baseLinkStyle = useMemo(() => buildBaseLinkStyle(navFontFamily), [navFontFamily]);

  const drawerLinkStyle = useMemo(
    () => buildDrawerLinkStyle({ baseLinkStyle, drawerDividerColor }),
    [baseLinkStyle, drawerDividerColor]
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const archiveLabel = isCn
    ? NAV_CONFIG.ACTIONS.ARCHIVE.LABEL_CN
    : NAV_CONFIG.ACTIONS.ARCHIVE.LABEL_EN;

  // ── Action cluster (config-driven) ───────────────────────────────
  // Each entry is a self-contained button (icon + label + action) rendered
  // by the reusable <ActionButton>. To add / reorder / remove a button just
  // edit this array — nothing else. The search button was removed from the
  // bar on request; to bring it back, add:
  //   { id: "search", variant: "icon",
  //     icon: ({ size, stroke }) => <ThinSearchIcon size={size} stroke={stroke} />,
  //     ariaLabel: isCn ? "搜索" : "Search", onClick: openSearch },
  const navActions = [
    {
      id: "archive",
      variant: "solid",
      label: archiveLabel,
      href: NAV_CONFIG.ACTIONS.ARCHIVE.HREF,
      background: archiveBg,
      color: archiveColor,
    },
    {
      id: "menu",
      variant: "icon",
      icon: ({ size, stroke }) => <ThinMenuIcon size={size} stroke={stroke} />,
      ariaLabel: isCn ? "菜单" : "Menu",
      onClick: toggleDrawer,
    },
  ];

  // ── Smart show / hide on scroll ──────────────────────────────────
  // Hides while scrolling down; reappears on scroll-up, near the very top,
  // or the moment a NEW section boundary is crossed ("each new area... the
  // nav reappears on top"). rAF-throttled so it stays smooth on mobile.
  useEffect(() => {
    const { HEIGHT } = NAV_CONFIG.BAR;
    const { SHOW_AT_TOP, BOUNDARY_HOLD, SECTION_SELECTOR, SCROLLED_AT } = NAV_CONFIG.SCROLL;
    let prevY = window.scrollY;
    let lastBoundaryY = -1e9;
    let activeIdx = -1;
    let raf = 0;
    const getSections = () => Array.from(document.querySelectorAll(SECTION_SELECTOR));
    const activeIndex = () => {
      const secs = getSections();
      let idx = -1;
      for (let i = 0; i < secs.length; i += 1) {
        if (secs[i].getBoundingClientRect().top <= HEIGHT + 8) idx = i;
      }
      return idx;
    };
    const run = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - prevY;
      prevY = y;
      setScrolled(y > SCROLLED_AT);
      if (y <= SHOW_AT_TOP) {
        setHidden(false);
        activeIdx = activeIndex();
        return;
      }
      const secs = getSections();
      if (secs.length) {
        const idx = activeIndex();
        if (idx !== activeIdx) { // reached a new area → pop the bar back in
          activeIdx = idx;
          lastBoundaryY = y;
          setHidden(false);
          return;
        }
        if (Math.abs(y - lastBoundaryY) < BOUNDARY_HOLD) {
          setHidden(false);
          return;
        }
      }
      if (dy > 0) setHidden(true);
      else if (dy < 0) setHidden(false);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(run); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    run();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Never hide the bar while an overlay (drawer / search) is open.
  useEffect(() => {
    if (drawerOpen || searchOpen) setHidden(false);
  }, [drawerOpen, searchOpen]);

  // Reset to visible on every route change.
  useEffect(() => { setHidden(false); }, [pathname]);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: NAV_CONFIG.BAR.Z_INDEX,
          height: isMobile
            ? `calc(${NAV_CONFIG.BAR.HEIGHT}px + env(safe-area-inset-top, 0px))`
            : NAV_CONFIG.BAR.HEIGHT,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${
            isMobile ? NAV_CONFIG.BAR.PADDING_HORIZONTAL_MOBILE : NAV_CONFIG.BAR.PADDING_HORIZONTAL_DESKTOP
          }px`,
          paddingTop: isMobile ? "env(safe-area-inset-top, 0px)" : 0,
          // Transparent over the home hero only while at the very top; once
          // scrolled (or on any other page) it gets the solid theme bg so the
          // wordmark + buttons stay readable over content.
          backgroundColor: isHome && !scrolled ? "transparent" : colors.background,
          borderBottom:
            NAV_CONFIG.BAR.SHOW_BORDER && (!isHome || scrolled)
              ? `${NAV_CONFIG.BAR.BORDER_WIDTH} solid ${barBorderColor}`
              : "none",
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: NAV_CONFIG.BAR.HIDE_TRANSITION,
          willChange: "transform",
          pointerEvents: hidden ? "none" : "auto",
        }}
      >
        <Brand
          isMobile={isMobile}
          name={brandName}
          fontFamily={brandFontFamily || navFontFamily}
          color={brandColor}
        />

        {/* Right cluster — Archive button + search + menu. Same on every
            breakpoint; the text menu lives in the drawer (menu icon). */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? NAV_CONFIG.ACTIONS.ICON.GAP_MOBILE : NAV_CONFIG.ACTIONS.ICON.GAP,
            flexShrink: 0,
            color: iconColor,
          }}
        >
          {navActions.map((action) => (
            <ActionButton
              key={action.id}
              variant={action.variant}
              icon={action.icon}
              label={action.label}
              ariaLabel={action.ariaLabel}
              href={action.href}
              onClick={action.onClick}
              isMobile={isMobile}
              fontFamily={navFontFamily}
              background={action.background}
              color={action.color}
            />
          ))}
        </div>
      </nav>

      {/* Spacer: reserves the fixed bar height so content is not hidden behind it. */}
      <div
        aria-hidden="true"
        style={{
          height: isMobile
            ? `calc(${NAV_CONFIG.BAR.HEIGHT}px + env(safe-area-inset-top, 0px))`
            : NAV_CONFIG.BAR.HEIGHT,
          flexShrink: 0,
        }}
      />

      <MobileDrawer
        menuList={menuList}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        colors={colors}
        drawerLinkStyle={drawerLinkStyle}
        linkColor={drawerLinkColor}
        linkColorActive={drawerLinkColorActive}
        pathname={pathname}
        navFontFamily={navFontFamily}
        onLinkClick={onLinkClick}
        title={brandName}
        titleFontFamily={brandFontFamily || navFontFamily}
      />

      <NavSearch
        open={searchOpen}
        onClose={closeSearch}
        isCn={isCn}
        colors={colors}
        isDark={isDark}
        fontFamily={navFontFamily}
      />
    </>
  );
}
