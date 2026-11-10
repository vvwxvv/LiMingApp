"use client";

import React, { useContext, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import useFont from "@/hooks/useFont";
import useSiteMeta from "@/hooks/useSiteMeta";
import { getConfiguredManagerSections } from "@/lib/managerMenu";
import ThemeToggleButton from "@/components/buttons/ThemeToggleButton";

// ─────────────────────────────────────────────────────────────────────────────
//  MANAGER FOOTER
//  Same skeleton as the public <Footer> (max width, padding, typography,
//  bottom rule) but filled with manager content:
//    · every manager section listed straight in the footer — the whole menu
//      is visible without opening the drawer
//    · a live iframe of the public page the current section feeds
//    · copyright, "view site" and the light/dark switch on the bottom rule
// ─────────────────────────────────────────────────────────────────────────────

const CFG = Object.freeze({
  MAX_WIDTH: 1200,
  PADDING_DESKTOP: "44px 50px 26px",
  PADDING_MOBILE: "32px 20px 22px",
  COLUMN_GAP: "clamp(24px, 4vw, 56px)",
  LINK_SIZE: "14px",
  LINK_LINE_HEIGHT: 1.9,
  HEAD_SCALE: "11px",
  META_SIZE: "12px",
  COPY_OPACITY: 0.6,
});

const TEXT = {
  section: { en: "Manager", cn: "管理后台" },
  preview: { en: "Site preview", cn: "网页预览" },
  viewSite: { en: "View site", cn: "查看网站" },
  reload: { en: "Reload", cn: "刷新" },
  open: { en: "Open page", cn: "打开页面" },
};

// Manager section (first segment after /manager) → the public route it feeds.
const PUBLIC_ROUTE_BY_SECTION = {
  about: "/about",
  artwork: "/artworks",
  image: "/artworks",
  series: "/artworks",
  video: "/artworks",
  web: "/artworks",
  exhibition: "/exhibitions",
  event: "/news",
  writing: "/news",
  bibliography: "/about",
  resume: "/resume",
  "artist-contact": "/contact",
  meta: "/",
  "form-settings": "/",
};

// The preview is a 1280×800 viewport shrunk into a card.
const VIEW_W = 1280;
const VIEW_H = 800;
const CARD_W = 360;
const CARD_H = Math.round((CARD_W * VIEW_H) / VIEW_W);
const SCALE = CARD_W / VIEW_W;

export default function ManagerFooter() {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { colors, isDark } = useReverseTheme();
  const { contentFontFamily } = useFont();
  const { meta } = useSiteMeta();
  const pathname = usePathname() || "";

  const [reloadKey, setReloadKey] = useState(0);

  const l = (key) => (isCn ? TEXT[key].cn : TEXT[key].en);

  // Only the manager menu the owner actually saved in Site Meta — never the
  // default menu and never auto-injected system entries.
  const sections = useMemo(
    () => getConfiguredManagerSections(isCn, meta?.menu),
    [isCn, meta]
  );

  const thisYear = new Date().getFullYear();
  const startYear = Number(meta?.app_footer_start_year);
  const yearLabel =
    Number.isFinite(startYear) && startYear > 1900 && startYear < thisYear
      ? `${startYear}–${thisYear}`
      : `${thisYear}`;

  const siteName =
    meta?.seo?.title || (isCn ? meta?.app_footer_cn : meta?.app_footer_en) || "";

  const section = pathname.split("/").filter(Boolean)[1] || "";
  const publicPath = PUBLIC_ROUTE_BY_SECTION[section] || "/";

  const border = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)";
  const textColor = colors?.text || "#000000";

  const linkStyle = {
    display: "block",
    color: textColor,
    textDecoration: "none",
    fontFamily: contentFontFamily,
    fontSize: CFG.LINK_SIZE,
    lineHeight: CFG.LINK_LINE_HEIGHT,
  };

  const headStyle = {
    fontFamily: contentFontFamily,
    fontSize: CFG.HEAD_SCALE,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.45,
    marginBottom: 8,
  };

  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: colors?.background || "#ffffff",
        color: textColor,
        borderTop: `1px solid ${border}`,
      }}
    >
      <div
        style={{
          maxWidth: CFG.MAX_WIDTH,
          margin: "0 auto",
          padding: isMobile ? CFG.PADDING_MOBILE : CFG.PADDING_DESKTOP,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: CFG.COLUMN_GAP,
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {/* ── Manager menu, listed directly ─────────────────────────── */}
          <div
            style={{
              flex: "1 1 420px",
              minWidth: 260,
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 120 : 150}px, 1fr))`,
              gap: "22px 28px",
            }}
          >
            {sections.map((sec) => (
              <nav key={sec.key} aria-label={sec.label}>
                <div style={headStyle}>{sec.label}</div>
                {sec.items.map((item) => (
                  <Link key={item.href} href={item.href} style={linkStyle}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>

          {/* ── Live preview of the matching public page ───────────────── */}
          <div style={{ flex: isMobile ? "1 1 100%" : "0 0 360px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <span style={headStyle}>
                {`${l("preview")} · ${publicPath}`}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  title={l("reload")}
                  aria-label={l("reload")}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    fontFamily: contentFontFamily,
                    fontSize: 13,
                    lineHeight: 1,
                    opacity: 0.5,
                  }}
                >
                  ↻
                </button>
                <Link
                  href={publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={l("open")}
                  aria-label={l("open")}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    fontSize: 13,
                    lineHeight: 1,
                    opacity: 0.5,
                  }}
                >
                  ↗
                </Link>
              </span>
            </div>

            <div
              style={{
                width: CARD_W,
                maxWidth: "100%",
                height: CARD_H,
                overflow: "hidden",
                position: "relative",
                border: `1px solid ${border}`,
                borderRadius: 6,
                backgroundColor: colors?.background || "#ffffff",
              }}
            >
              <iframe
                key={`${publicPath}-${reloadKey}`}
                src={publicPath}
                title={`${l("preview")} ${publicPath}`}
                loading="lazy"
                style={{
                  width: VIEW_W,
                  height: VIEW_H,
                  border: 0,
                  display: "block",
                  transform: `scale(${SCALE})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Bottom rule: copyright · view site · theme ──────────────── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 32,
            paddingTop: 16,
            borderTop: `1px solid ${border}`,
          }}
        >
          <span
            style={{
              fontFamily: contentFontFamily,
              fontSize: CFG.META_SIZE,
              opacity: CFG.COPY_OPACITY,
            }}
          >
            {`© ${yearLabel}${siteName ? ` ${siteName}` : ""} · ${l("section")}`}
          </span>

          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/"
              style={{
                color: "inherit",
                textDecoration: "none",
                fontFamily: contentFontFamily,
                fontSize: CFG.META_SIZE,
                opacity: CFG.COPY_OPACITY,
              }}
            >
              {`${l("viewSite")} ↗`}
            </Link>
            <ThemeToggleButton size={isMobile ? 15 : 16} style={{ flexShrink: 0 }} />
          </span>
        </div>
      </div>
    </footer>
  );
}
