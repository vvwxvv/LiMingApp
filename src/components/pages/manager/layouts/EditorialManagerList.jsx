"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   EditorialManagerList — the shared manager list layout.

   One layout, many collections. The UI is the bibliography page's editorial
   language: hairline rows, body copy on the left, cover + right-aligned
   caption block on the right, an archive-style Type / Year filter bar, and a
   Delete control that sits on the row's bottom rule.

   A collection is described entirely by a config object (see
   `config/collections/*ManagerConfig.js`): fields, filters, links, export and
   routes. Nothing here knows about a specific collection.

   Long lists: when the filtered list has more than `accordionOver` rows
   (default 10) every row collapses into a one-line accordion header
   (title · meta · chevron) that expands into the full editorial row. Short
   lists render the full rows directly — no accordion chrome where it would
   only add noise.

   Two modes (optional): a config may also ship a `cardView` block. The page
   then gets an editorial-styled Cards / List switch in the header. `list` is
   this editorial row layout; `grid` keeps the existing manager card
   (ManagerCard). Both modes share one grouping selector (`config.groupBy`:
   none / year / A–Z / type), rendered as 25px section headings. Collections without `cardView`
   (bibliography, event, …) are untouched and render list-only.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Maximize2, Grid, List, Pencil, Trash2 } from "lucide-react";
import useData from "@/hooks/useData";
import useFont from "@/hooks/useFont";
import useDeleteItem from "@/hooks/useDeleteItem";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import { exportToCSV } from "@/components/pages/manager/utils/batchEditCommonUtils";
import { resolveLocalizedLabel } from "@/utils/bilingualUtils";
import { getArtistName, shouldHideArtistField } from "@/utils/artistUtils";
import ManagerCard from "@/components/pages/manager/components/ManagerCard";
import GridViewLayout from "@/components/layouts/GridViewLayout";
import DeleteDialog from "@/components/popups/DeleteDialog";
import ImageZoomModal from "@/components/images/ImageZoomModal";
import ManagerUserGuide from "@/components/docs/ManagerUserGuide";

// ───────────────────────────────────────────────────────────────────────────
// LAYOUT TOKENS — mirrors the bibliography page
// ───────────────────────────────────────────────────────────────────────────
const PAGE = {
  MAX_WIDTH: 1240,
  PADDING_X_DESKTOP: 48,
  PADDING_X_MOBILE: 20,
  PADDING_TOP: 28,
  PADDING_BOTTOM: 140,

  TITLE_SIZE: 26,
  TITLE_LETTER_SPACING: "0.02em",
  // Section heading for a group (year / A–Z / type).
  GROUP_TITLE_SIZE: 25,

  ROW: {
    PADDING_Y: 34,
    COLUMN_GAP_DESKTOP: 64,
    COLUMN_GAP_MOBILE: 20,
    IMAGE_WIDTH: 340,
    IMAGE_ASPECT: "4 / 3",
  },

  TEXT_COL: {
    TITLE_SIZE: 17,
    TITLE_LINE_HEIGHT: 1.35,
    SUBTITLE_SIZE: 13,
    META_SIZE: 12,
    BODY_SIZE: 13,
    BODY_LINE_HEIGHT: 1.75,
    LINK_SIZE: 12,
    MAX_WIDTH: 640,
  },

  CAPTION: {
    SIZE: 11,
    LINE_HEIGHT: 1.7,
    MAX_WIDTH: 340,
  },

  CONTROL: {
    FONT_SIZE: 10.5,
    LETTER_SPACING: "0.08em",
    HEIGHT: 30,
  },

  ACCORDION_HEADER_PADDING_Y: 20,
};

const DEFAULT_ACCORDION_OVER = 10;

const DEFAULT_CARD_WIDTH = 340;
const MIN_CARD_WIDTH = 160;
const MAX_CARD_WIDTH = 520;
const UNGROUPED_KEY = "__ungrouped__";

const HAIRLINE = (isDark) => (isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)");

// ───────────────────────────────────────────────────────────────────────────
// helpers
// ───────────────────────────────────────────────────────────────────────────
const pick = (entry, isCn) => (entry ? (isCn ? entry.cn : entry.en) : "");

const toList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

/** Raw scalar-or-array values, used by filters that may point at arrays
 *  (tags, related titles, …). Booleans/numbers stay as-is. */
const rawValues = (value) => {
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry) => entry !== null && entry !== undefined && entry !== "");
};

/** Resolve a config field, which may be a key or a `{ en, cn }` key pair. */
const readField = (item, field, isCn) => {
  if (!item || !field) return "";
  const key = typeof field === "object" ? (isCn ? field.cn : field.en) : field;
  return item[key] ?? "";
};

const asText = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") return value.en ?? value.cn ?? "";
  return String(value);
};

/** "journal_article" → "Journal Article"; keeps CJK values untouched. */
const formatType = (value) => {
  const str = asText(value).trim();
  if (!str) return "";
  if (/[\u4e00-\u9fa5]/.test(str)) return str;
  return str.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const readNested = (item, path) =>
  String(path || "")
    .split(".")
    .reduce((value, key) => (value == null ? value : value[key]), item);

/**
 * Order position. Supports both the plain `order` string (about / series / …)
 * and the JSON object shape artwork/images use (`order.artist_page_order`).
 * Missing positions sort last.
 */
const orderValue = (item, orderKey) => {
  const raw = readNested(item, orderKey || "order");
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return Number.MAX_SAFE_INTEGER;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

/** One value from a relation array. Legacy rows can hold objects
 *  (`[{ title, order, mark }]`); newer rows hold plain titles. */
const relatedText = (value, rel) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const keys = rel?.keys || ["title", "name", "label", "en", "cn"];
    for (const key of keys) {
      const text = asText(value[key]);
      if (text) return text;
    }
    return asText(value);
  }
  return String(value);
};

/**
 * Compare two rows by a (possibly nested) field. Numbers compare numerically,
 * everything else alphabetically; empty values sort last in ascending order.
 */
const compareByField = (a, b, field, direction = "asc", isCn = false) => {
  const av = readNested(a, field);
  const bv = readNested(b, field);
  const aText = String(av ?? "").trim();
  const bText = String(bv ?? "").trim();
  if (!aText && !bText) return 0;
  if (!aText) return 1;
  if (!bText) return -1;

  const aNum = Number(aText);
  const bNum = Number(bText);
  const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);
  const cmp = bothNumeric
    ? aNum - bNum
    : aText.localeCompare(bText, isCn ? "zh" : "en", { numeric: true });
  return direction === "desc" ? -cmp : cmp;
};

const safeUrl = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (/^(https?:)?\/\//i.test(str) || str.startsWith("/")) return str;
  return `https://${str}`;
};

const hostOf = (value) =>
  String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

const itemId = (item) => item?.id ?? item?._id;

const isNumericKey = (value) => /^-?\d+(\.\d+)?$/.test(String(value).trim());

// ───────────────────────────────────────────────────────────────────────────
// primitives
// ───────────────────────────────────────────────────────────────────────────
function ToolbarButton({ children, onClick, href, solid, colors, font, isDark }) {
  const base = {
    height: PAGE.CONTROL.HEIGHT,
    padding: "0 14px",
    fontFamily: font,
    fontSize: PAGE.CONTROL.FONT_SIZE,
    letterSpacing: PAGE.CONTROL.LETTER_SPACING,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderRadius: 0,
    // `solid` only strengthens the frame — the fill is hover-only.
    border: `1px solid ${solid ? colors.text : HAIRLINE(isDark)}`,
    color: colors.text,
  };
  const label = <span className="mgr-btn-label">{children}</span>;
  if (href) {
    return (
      <Link href={href} className="mgr-btn" style={base}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="mgr-btn" style={base}>
      {label}
    </button>
  );
}

// ── Archive-style filter dropdown ───────────────────────────────────────────
const ACCENT_W = 3;
const PANEL_MIN_WIDTH = 150;

const panelVariants = {
  hidden: { opacity: 0, y: -6, scaleY: 0.93, transition: { duration: 0.1, ease: [0.4, 0, 1, 1] } },
  visible: { opacity: 1, y: 0, scaleY: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -4, scaleY: 0.96, transition: { duration: 0.1, ease: [0.4, 0, 1, 1] } },
};

function DropdownOption({ option, selected, onSelect, fontFamily, fg, hoverBg }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(option.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(option.value);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: hovered ? hoverBg : "transparent",
        padding: "9px 14px",
        cursor: "pointer",
        fontFamily,
        fontSize: 12,
        letterSpacing: "0.02em",
        color: fg,
        fontWeight: selected ? 600 : 400,
        transition: "background-color 0.12s ease",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {option.label}
    </div>
  );
}

function FilterDropdown({
  value,
  options,
  onChange,
  allLabel,
  fontFamily,
  colors,
  width,
  align = "left",
  ariaLabel,
  labelColor,
  includeAll = true,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const text = colors.text;
  const hoverBg = `${colors.text}0D`;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = includeAll
    ? [{ value: "", label: allLabel }, ...options]
    : options;
  const selectedItem = items.find((i) => i.value === value) || items[0];
  const selectedLabel = selectedItem?.label || allLabel || "";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || allLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          minHeight: 30,
          padding: "4px 2px",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          fontFamily,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: labelColor || text,
          opacity: 1,
        }}
      >
        <span
          style={{
            minWidth: width,
            maxWidth: width,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left",
            paddingBottom: 3,
            borderBottom: "1px solid currentColor",
          }}
        >
          {selectedLabel}
        </span>
        <span
          aria-hidden
          style={{
            fontSize: 10,
            opacity: 1,
            display: "inline-block",
            transition: "transform 0.15s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: "absolute",
              top: "100%",
              ...(align === "right" ? { right: 0, left: "auto" } : { left: 0 }),
              marginTop: 8,
              zIndex: 1000,
              minWidth: PANEL_MIN_WIDTH,
              transformOrigin: align === "right" ? "top right" : "top left",
            }}
          >
            <div
              role="listbox"
              style={{
                padding: "4px 0",
                backgroundColor: colors.background,
                color: text,
                borderLeft: `${ACCENT_W}px solid ${text}`,
                borderTop: `1px solid ${text}26`,
                borderRight: `1px solid ${text}26`,
                borderBottom: `1px solid ${text}26`,
                boxShadow: `3px 3px 0px ${text}14, 0 10px 28px ${text}0D`,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {items.map((option) => (
                <DropdownOption
                  key={option.value || "__all__"}
                  option={option}
                  selected={option.value === value}
                  fontFamily={fontFamily}
                  fg={labelColor || text}
                  hoverBg={hoverBg}
                  onSelect={(v) => {
                    onChange(v);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RowAction({ children, onClick, href, colors, font }) {
  const [hover, setHover] = useState(false);
  const style = {
    background: "none",
    border: "none",
    padding: "8px 2px",
    margin: "-8px -2px",
    minHeight: 30,
    boxSizing: "border-box",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    fontFamily: font,
    fontSize: PAGE.TEXT_COL.LINK_SIZE,
    color: colors.text,
    opacity: hover ? 1 : 0.55,
    fontWeight: hover ? 700 : 400,
    textDecoration: hover ? "underline" : "none",
    textUnderlineOffset: 3,
    textDecorationThickness: 1,
    transition: "opacity 0.15s ease, font-weight 0.15s ease",
  };
  const hoverProps = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };
  if (href) {
    return (
      <Link href={href} style={style} {...hoverProps}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} style={style} {...hoverProps}>
      {children}
    </button>
  );
}

function Chevron({ open, color, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        display: "block",
        transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        opacity: 0.55,
        flex: "0 0 auto",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// View mode switch — icon toggle (Cards / List), same pattern as LianPu:
// one hairline pill, active = full opacity + underline, inactive = 40% opacity.
// Deliberately NO filled/black active state: the pill stays on the theme
// background in every state.
// ───────────────────────────────────────────────────────────────────────────
function ViewModeButton({ active, onSelect, label, Icon, colors, isDark, first }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={active}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 42,
        height: PAGE.CONTROL.HEIGHT,
        padding: 0,
        border: "none",
        borderLeft: first ? "none" : `1px solid ${colors.text}`,
        borderBottom: `2px solid ${active ? colors.text : "transparent"}`,
        background: colors.background, // always the page background — never a black fill
        color: colors.text,
        opacity: active ? 1 : hover ? 0.7 : 0.4,
        cursor: "pointer",
        transition: "opacity 0.18s ease, border-color 0.18s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}

function ViewModeSwitch({ value, onChange, isCn, colors, isDark }) {
  const options = [
    { value: "grid", Icon: Grid, label: isCn ? "卡片" : "Cards" },
    { value: "list", Icon: List, label: isCn ? "列表" : "List" },
  ];

  return (
    <div
      role="group"
      aria-label={isCn ? "切换视图" : "Switch view"}
      style={{
        display: "inline-flex",
        flex: "0 0 auto",
        border: `1px solid ${colors.text}`,
        borderRadius: 10,
        overflow: "hidden",
        background: colors.background,
      }}
    >
      {options.map((option, index) => (
        <ViewModeButton
          key={option.value}
          active={value === option.value}
          onSelect={() => onChange(option.value)}
          label={option.label}
          Icon={option.Icon}
          colors={colors}
          isDark={isDark}
          first={index === 0}
        />
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Text
// ───────────────────────────────────────────────────────────────────────────
const UI = {
  entries: { en: "entries", cn: "条" },
  entrySingular: { en: "entry", cn: "条" },
  newEntry: { en: "New", cn: "新建" },
  batchEdit: { en: "Batch edit", cn: "批量编辑" },
  export: { en: "Export CSV", cn: "导出 CSV" },
  clear: { en: "Clear", cn: "清除" },
  retry: { en: "Retry", cn: "重试" },
  edit: { en: "Edit", cn: "编辑" },
  delete: { en: "Delete", cn: "删除" },
  confirmDelete: { en: "Delete this entry?", cn: "删除这条记录？" },
  cancel: { en: "Cancel", cn: "取消" },
  loading: { en: "Loading…", cn: "加载中…" },
  loadError: { en: "Failed to load. Retry?", cn: "加载失败，重试？" },
  noMatch: { en: "Nothing matches those filters.", cn: "没有匹配的条目。" },
  untitled: { en: "Untitled", cn: "未命名" },
};

// ───────────────────────────────────────────────────────────────────────────
// One row — the editorial body (shared by plain rows and expanded accordions)
// ───────────────────────────────────────────────────────────────────────────
function EditorialRowBody({
  item,
  config,
  isCn,
  colors,
  isDark,
  isMobile,
  fonts,
  confirmingId,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  deleting,
  hideHeading = false,
  onImageClick,
}) {
  const id = itemId(item);
  const isConfirming = confirmingId === id;

  const title = asText(readField(item, config.primaryField, isCn)) || pick(UI.untitled, isCn);
  const subtitle = asText(readField(item, config.subtitleField, isCn));
  const cover = config.coverField ? item?.[config.coverField] : "";
  const hasCover = Boolean(cover);

  const metaParts = (config.metaFields || [])
    .map((field) => formatType(readField(item, field, isCn)))
    .filter(Boolean);

  // Artist websites: every manager row should identify the artist, even for
  // collections whose records don't store an `artist` column.
  const artistMetaField = (config.metaFields || []).some(
    (field) => field === "artist" || field === "artist_name"
  );
  const artistInSubtitle =
    config.subtitleField === "artist" || config.subtitleField === "artist_name";
  const artistInPrimary =
    config.primaryField === "artist" || config.primaryField === "artist_name";
  const explicitArtist = asText(item?.artist || item?.artist_name);
  const fallbackArtist = getArtistName(isCn ? "CN" : "EN");
  if (
    config.showArtistMeta !== false &&
    !artistMetaField &&
    !artistInSubtitle &&
    !artistInPrimary &&
    (explicitArtist || fallbackArtist)
  ) {
    metaParts.unshift(explicitArtist || fallbackArtist);
  }
  const meta = metaParts.join(" · ");

  const extraMeta = config.metaResolver ? config.metaResolver(item, isCn) : "";
  const body =
    asText(readField(item, config.bodyField, isCn)) ||
    (config.bodyFields
      ? config.bodyFields.map((f) => asText(readField(item, f, isCn))).filter(Boolean).join(" — ")
      : "");

  const links = (config.links || [])
    .map((link) => {
      const raw = item?.[link.field];
      if (!raw) return null;
      return {
        raw,
        href: safeUrl(raw),
        label: link.showHost ? hostOf(raw) : pick(link.label, isCn),
      };
    })
    .filter(Boolean);

  const relatedLine = (config.related || [])
    .map((rel) => {
      const values = toList(item?.[rel.field])
        .map((value) => relatedText(value, rel))
        .filter(Boolean);
      if (!values.length) return null;
      const max = rel.max || 3;
      const shown = values.slice(0, max).join(", ");
      const more = values.length > max ? ` +${values.length - max}` : "";
      return `${pick(rel.label, isCn)}: ${shown}${more}`;
    })
    .filter(Boolean)
    .join("  ·  ");

  const captionValues = (config.captionFields || [])
    .map((field) => ({ field, value: asText(readField(item, field, isCn)) }))
    .filter((entry) => entry.value);

  const editHref = config.editHref ? config.editHref(id) : "";

  return (
    <>
      <div
        style={{
          position: "relative",
          display: "grid",
          // No cover → single full-width text column (no empty image cell).
          gridTemplateColumns:
            isMobile || !hasCover
              ? "minmax(0, 1fr)"
              : `minmax(0, 1fr) ${PAGE.ROW.IMAGE_WIDTH}px`,
          columnGap: isMobile ? PAGE.ROW.COLUMN_GAP_MOBILE : PAGE.ROW.COLUMN_GAP_DESKTOP,
          rowGap: isMobile ? 20 : 0,
          alignItems: "start",
        }}
      >
        {/* ── Text column ─────────────────────────────────────────── */}
        <div style={{ maxWidth: PAGE.TEXT_COL.MAX_WIDTH }}>
          {!hideHeading && (
            <>
              <h2
                className="mgr-row-title"
                style={{
                  fontFamily: fonts.title,
                  fontSize: PAGE.TEXT_COL.TITLE_SIZE,
                  lineHeight: PAGE.TEXT_COL.TITLE_LINE_HEIGHT,
                  fontWeight: 700,
                  fontStyle: config.primaryItalic === false || isCn ? "normal" : "italic",
                  letterSpacing: "0.01em",
                  color: colors.text,
                  margin: 0,
                }}
              >
                {title}
              </h2>

              {subtitle && (
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: PAGE.TEXT_COL.SUBTITLE_SIZE,
                    lineHeight: 1.6,
                    color: colors.text,
                    opacity: 0.75,
                    margin: "6px 0 0",
                  }}
                >
                  {subtitle}
                </p>
              )}

              {(meta || extraMeta) && (
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: PAGE.TEXT_COL.META_SIZE,
                    color: colors.text,
                    opacity: 0.55,
                    margin: "8px 0 0",
                    letterSpacing: "0.04em",
                  }}
                >
                  {[meta, extraMeta].filter(Boolean).join(" · ")}
                </p>
              )}
            </>
          )}

          {relatedLine && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: PAGE.TEXT_COL.META_SIZE,
                color: colors.text,
                opacity: 0.55,
                margin: "8px 0 0",
                letterSpacing: "0.04em",
              }}
            >
              {relatedLine}
            </p>
          )}

          {body && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: PAGE.TEXT_COL.BODY_SIZE,
                lineHeight: PAGE.TEXT_COL.BODY_LINE_HEIGHT,
                color: colors.text,
                opacity: 0.7,
                margin: "12px 0 0",
                maxWidth: 600,
                // `bodyLines: 0` lets a page show the full body (e.g. About).
                ...((config.bodyLines ?? 4) > 0
                  ? {
                      display: "-webkit-box",
                      WebkitLineClamp: config.bodyLines ?? 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }
                  : null),
              }}
            >
              {body}
            </p>
          )}

          {links.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 16 }}>
              {links.map((link) => (
                <a
                  key={link.raw}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: fonts.body,
                    fontSize: PAGE.TEXT_COL.LINK_SIZE,
                    color: colors.text,
                    opacity: 0.6,
                    textDecoration: "none",
                    borderBottom: `1px solid ${HAIRLINE(isDark)}`,
                    paddingBottom: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

        </div>

        {/* ── Cover + caption block (only when there is a cover) ───── */}
        {hasCover && (
          <div style={{ width: "100%", maxWidth: PAGE.ROW.IMAGE_WIDTH }}>
            {/* Click = zoom. Navigation to the edit form lives on the pencil. */}
            <img
              src={cover}
              alt={title}
              role="button"
              tabIndex={0}
              title={isCn ? "点击放大" : "Click to zoom"}
              onClick={(event) => {
                event.stopPropagation();
                onImageClick?.(cover, title);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onImageClick?.(cover, title);
                }
              }}
              style={{
                display: "block",
                width: "100%",
                aspectRatio: PAGE.ROW.IMAGE_ASPECT,
                objectFit: "cover",
                cursor: "zoom-in",
                backgroundColor: "transparent",
              }}
            />

            {captionValues.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  maxWidth: PAGE.CAPTION.MAX_WIDTH,
                  marginLeft: "auto",
                  textAlign: "right",
                  fontFamily: fonts.body,
                  fontSize: PAGE.CAPTION.SIZE,
                  lineHeight: PAGE.CAPTION.LINE_HEIGHT,
                  color: colors.text,
                }}
              >
                {captionValues.map((entry, index) => (
                  <div
                    key={entry.field}
                    style={{ fontStyle: index === 0 ? "italic" : "normal", opacity: index === 0 ? 1 : 0.6 }}
                  >
                    {entry.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit / delete actions — one row at the bottom of the entry: pencil on
          the left, trash on the far right (same as the LianPu list). */}
      {(editHref || !config?.readOnly) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${colors.text}`,
          }}
        >
          {editHref && (
            <Link
              href={editHref}
              aria-label={pick(UI.edit, isCn)}
              title={pick(UI.edit, isCn)}
              className="manager-row-action"
              style={{ color: colors.text }}
            >
              <Pencil size={14} strokeWidth={1.6} />
            </Link>
          )}

          <span style={{ flex: 1 }} />

          {!config?.readOnly &&
            (isConfirming ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: fonts.body,
                  fontSize: 11,
                  color: colors.text,
                }}
              >
                <span style={{ letterSpacing: "0.04em", opacity: 1 }}>
                  {pick(UI.confirmDelete, isCn)}
                </span>
                <RowAction onClick={onCancelDelete} colors={colors} font={fonts.body}>
                  {pick(UI.cancel, isCn)}
                </RowAction>
                <RowAction onClick={() => onConfirmDelete(id)} colors={colors} font={fonts.body}>
                  {deleting ? "…" : pick(UI.delete, isCn)}
                </RowAction>
              </div>
            ) : (
              <span
                role="button"
                tabIndex={0}
                onClick={() => onAskDelete(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAskDelete(id);
                  }
                }}
                aria-label={pick(UI.delete, isCn)}
                title={pick(UI.delete, isCn)}
                className="manager-row-action"
                style={{ color: colors.text, cursor: "pointer" }}
              >
                <Trash2 size={14} strokeWidth={1.6} />
              </span>
            ))}
        </div>
      )}

    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Accordion item — one-line header + the editorial body on expand
// ───────────────────────────────────────────────────────────────────────────
function AccordionItem({ item, open, onToggle, ...rowProps }) {
  const { config, isCn, colors, isDark, isMobile, fonts } = rowProps;
  const title = asText(readField(item, config.primaryField, isCn)) || pick(UI.untitled, isCn);
  const subtitle = asText(readField(item, config.subtitleField, isCn));
  const metaParts = (config.metaFields || [])
    .map((field) => formatType(readField(item, field, isCn)))
    .filter(Boolean);
  if (config.metaResolver) {
    const extra = config.metaResolver(item, isCn);
    if (extra) metaParts.push(extra);
  }
  const meta = metaParts.join(" · ");
  const secondary = [subtitle, meta].filter(Boolean).join(" · ");
  const [hover, setHover] = useState(false);

  return (
    <div style={{ borderTop: `1px solid ${HAIRLINE(isDark)}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-accordion-summary
        className="mgr-row-link"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 12 : 24,
          width: "100%",
          background: "none",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          padding: `${PAGE.ACCORDION_HEADER_PADDING_Y}px 0`,
          fontFamily: fonts.body,
          color: colors.text,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span
            className="mgr-row-title"
            style={{
              fontFamily: fonts.title,
              fontSize: PAGE.TEXT_COL.TITLE_SIZE,
              fontWeight: 700,
              fontStyle: config.primaryItalic === false || isCn ? "normal" : "italic",
              lineHeight: 1.3,
              opacity: hover || open ? 1 : 0.88,
              transition: "opacity 0.18s ease",
            }}
          >
            {title}
          </span>
          {secondary && (
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.04em",
                opacity: 0.5,
                whiteSpace: isMobile ? "normal" : "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {secondary}
            </span>
          )}
        </span>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flex: "0 0 auto",
          }}
        >
          <Chevron open={open} color={colors.text} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.2, ease: "easeOut" },
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                position: "relative",
                padding: `18px 0 ${PAGE.ROW.PADDING_Y + 10}px`,
              }}
            >
              <EditorialRowBody
                item={item}
                {...rowProps}
                hideHeading={!config.accordionShowHeading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PAGE
// ───────────────────────────────────────────────────────────────────────────
export default function EditorialManagerList({ config }) {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { colors, isDark } = useReverseTheme();
  const router = useRouter();

  const { fontFamily: titleFont } = useFont("artistName");
  const { fontFamily: headingFont } = useFont("sectionTitle");
  const { fontFamily: bodyFont } = useFont("bodyText");

  const fonts = useMemo(
    () => ({ title: headingFont || titleFont, body: bodyFont }),
    [headingFont, titleFont, bodyFont]
  );

  const { data: rawData = [], isLoading, error, refetch } = useData(config.api);

  const [deletedRows, setDeletedRows] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [openId, setOpenId] = useState(null);

  // ── Optional two-mode view (cards + editorial list) ──────────────────────
  const cardView = config.cardView || null;
  const hasCardView = Boolean(cardView);
  // All manager card pages share one layout. Masonry is the default so cards
  // keep their natural height; a config can opt back into a strict grid.
  const cardLayout = cardView?.layout === "grid" ? "grid" : "masonry";
  const [viewMode, setViewMode] = useState(
    cardView?.defaultMode === "grid" ? "grid" : "list"
  );
  const [cardWidth, setCardWidth] = useState(
    cardView?.cardWidth || DEFAULT_CARD_WIDTH
  );
  const [cardDeleteItem, setCardDeleteItem] = useState(null);
  // Covers open in the same zoom viewer the public pages use; clicking an
  // image never navigates to the edit form (the pencil does that).
  const [zoomImage, setZoomImage] = useState(null);

  // Grouping / ordering dimension — shared by the editorial list and the cards
  // (year / A–Z / type / none). Each group becomes a 25px section heading.
  const groupConfig = config.groupBy || null;
  const groupOptions = groupConfig?.options || [];
  // Artist websites are single-artist, so grouping by artist is noise. If the
  // collection has a year dimension, that is the default everywhere.
  const artistSite = shouldHideArtistField();
  const preferredGroupMode =
    artistSite && groupOptions.some((option) => option.value === "year")
      ? "year"
      : groupConfig?.default ?? cardView?.groupBy ?? "none";
  const [groupMode, setGroupMode] = useState(preferredGroupMode);
  // Dev hot-reload keeps useState values. If a page changes its default group
  // (e.g. artist → year), follow the new default instead of showing the old
  // selection until a hard refresh.
  const preferredGroupRef = useRef(preferredGroupMode);
  useEffect(() => {
    if (preferredGroupRef.current === preferredGroupMode) return;
    preferredGroupRef.current = preferredGroupMode;
    setGroupMode(preferredGroupMode);
  }, [preferredGroupMode]);
  const groupOption = groupOptions.find((o) => o.value === groupMode) || null;

  // Sort-dimension selector. Options are normal fields (`year`, `title`, …).
  // One option is a fixed default (no nav); two or more expose “Order by”.
  const sortOptions = config.sortOptions || [];
  const preferredSortMode =
    config.defaultSortOption || sortOptions[0]?.value || "";
  const [sortMode, setSortMode] = useState(preferredSortMode);
  const preferredSortRef = useRef(preferredSortMode);
  useEffect(() => {
    if (preferredSortRef.current === preferredSortMode) return;
    preferredSortRef.current = preferredSortMode;
    setSortMode(preferredSortMode);
  }, [preferredSortMode]);
  const activeSortOption =
    sortOptions.find((o) => o.value === sortMode) || null;
  const showSortBy = sortOptions.length > 1;

  // Language is not a UI control — the list follows the site language
  // (EN site → EN records), exactly like the other manager pages.
  const langFilter = isCn ? "CN" : "EN";

  // Artist filters disappear on single-artist sites (same rule as the
  // structure layout) — pages can list them without special-casing.
  const hideArtist = shouldHideArtistField();
  const ARTIST_FILTER_FIELDS = new Set([
    "artist",
    "artist_name",
    "related_artist",
    "related_artists",
    "participating_artists",
  ]);
  const activeFilters = useMemo(() => {
    const declared = config.filters || [];
    const fields = config.filterFields;

    // `filterFields` is the page-level “Filter by …” setting (nextjsapp
    // shape). Entries reference an existing `filters` definition for labels,
    // or fall back to a plain `<field>: All` label.
    const base =
      Array.isArray(fields)
        ? fields.map((entry) => {
            const field = typeof entry === "string" ? entry : entry.field;
            const existing = declared.find((filter) => filter.field === field);
            const override = typeof entry === "object" ? entry : {};
            if (existing) return { ...existing, ...override };
            const label = override.label || { en: field, cn: field };
            return {
              field,
              allLabel: { en: `${label.en}: All`, cn: `${label.cn}：全部` },
              ariaLabel: { en: `Filter by ${label.en}`, cn: `按${label.cn}筛选` },
              width: 100,
              ...override,
            };
          })
        : declared;

    return base.filter(
      (filter) => !(hideArtist && ARTIST_FILTER_FIELDS.has(filter.field))
    );
  }, [config.filters, config.filterFields, hideArtist]);

  const rows = useMemo(() => {
    const base = Array.isArray(rawData) ? rawData : [];
    return deletedRows ? deletedRows : base;
  }, [rawData, deletedRows]);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const { deleteItem, loadingId } = useDeleteItem(
    setDeletedRows,
    setDeleteError,
    config.api,
    {
      itemUrl: config.api,
      customFilter: (id) => rowsRef.current.filter((row) => String(itemId(row)) !== String(id)),
    }
  );

  // Language-scoped rows — filter options are built from this set so a filter
  // never offers a value that has no records in the current language.
  // `languageMode: "lenient"` keeps rows that carry no language value at all
  // (artwork records are not all tagged), while still hiding the other
  // language's records.
  const languageRows = useMemo(() => {
    if (!config.languageField) return rows;
    const lenient = config.languageMode === "lenient";
    return rows.filter((item) => {
      const value = String(item?.[config.languageField] || "")
        .toUpperCase()
        .trim();
      if (!value) return lenient;
      return value === langFilter;
    });
  }, [rows, config.languageField, config.languageMode, langFilter]);

  const filterOptions = useMemo(() => {
    const result = {};
    activeFilters.forEach((filter) => {
      const seen = new Map();
      languageRows.forEach((item) => {
        rawValues(item?.[filter.field]).forEach((entry) => {
          const raw = String(entry ?? "").trim();
          if (!raw) return;
          const key = raw.toLowerCase();
          if (!seen.has(key)) seen.set(key, filter.format ? filter.format(raw) : formatType(raw));
        });
      });
      const entries = [...seen.entries()];
      if (filter.sort === "numericDesc" || entries.every(([value]) => isNumericKey(value))) {
        entries.sort((a, b) => Number(b[0]) - Number(a[0]) || b[1].localeCompare(a[1]));
      } else {
        entries.sort((a, b) => a[1].localeCompare(b[1]));
      }
      result[filter.field] = entries.map(([value, label]) => ({ value, label }));
    });
    return result;
  }, [activeFilters, languageRows]);

  // Only render filters that actually have values in the current language.
  // Empty fields (e.g. medium / sold on a sparse library) would otherwise
  // stretch the bar and push the card-size slider off the row.
  const visibleFilters = useMemo(
    () =>
      activeFilters.filter(
        (filter) => (filterOptions[filter.field] || []).length > 0
      ),
    [activeFilters, filterOptions]
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return languageRows
      .filter((item) => {
        for (const filter of activeFilters) {
          const selected = filters[filter.field];
          if (!selected) continue;
          // Array fields (tags / related titles) match when any value matches.
          const values = rawValues(item?.[filter.field]).map((value) =>
            String(value ?? "").toLowerCase()
          );
          if (!values.includes(selected)) return false;
        }
        if (!term) return true;
        const haystack = (config.searchFields || [])
          .flatMap((field) => [item?.[field]])
          .filter(Boolean)
          .map(asText)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        // 1) Selected sort dimension (Year / A–Z / Type / …).
        if (activeSortOption) {
          const bySelectedSort = compareByField(
            a,
            b,
            activeSortOption.field || activeSortOption.value,
            activeSortOption.direction || "asc",
            isCn
          );
          if (bySelectedSort !== 0) return bySelectedSort;
        }

        // 2) Page-level default sort (nextjsapp `defaultSort` shape).
        if (config.defaultSort?.field) {
          const byDefault = compareByField(
            a,
            b,
            config.defaultSort.field,
            config.defaultSort.direction || "asc",
            isCn
          );
          if (byDefault !== 0) return byDefault;
        }

        // 3) Collection-specific sort.
        if (typeof config.sortRows === "function") {
          return config.sortRows(a, b, isCn);
        }

        // 4) Config orderKey fallback, then year/title.
        const byOrder = orderValue(a, config.orderKey) - orderValue(b, config.orderKey);
        if (byOrder !== 0) return byOrder;
        const aYear = Number(a?.year) || 0;
        const bYear = Number(b?.year) || 0;
        if (aYear !== bYear) return bYear - aYear;
        return asText(readField(a, config.primaryField, isCn)).localeCompare(
          asText(readField(b, config.primaryField, isCn))
        );
      });
  }, [languageRows, filters, query, activeFilters, config.searchFields, config.primaryField, config.sortRows, config.defaultSort, config.orderKey, activeSortOption, isCn]);

  const threshold = config.accordionOver ?? DEFAULT_ACCORDION_OVER;
  const useAccordion = visible.length > threshold;

  // When the list switches back to short form, drop any open accordion state.
  useEffect(() => {
    if (!useAccordion) setOpenId(null);
  }, [useAccordion]);

  const activeFilterCount = activeFilters.filter((f) => filters[f.field]).length;

  // Count wording — collections may supply their own noun (artwork → “works”).

  const handleExport = () => {
    if (!visible.length || !config.exportFn) return;
    const exported = config.exportFn(visible, isCn);
    if (!Array.isArray(exported) || !exported.length) return;
    const headers = Object.keys(exported[0] || {});
    exportToCSV(
      exported,
      headers,
      `${config.key}_export_${isCn ? "cn" : "en"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleConfirmDelete = async (id) => {
    try {
      await deleteItem(id);
      setConfirmingId(null);
      setOpenId((current) => (String(current) === String(id) ? null : current));
    } catch {
      // surfaced via deleteError
    }
  };

  // ── Card mode (optional) ──────────────────────────────────────────────────
  const cardFields = useMemo(() => {
    if (!cardView) return [];
    const list =
      typeof cardView.fields === "function"
        ? cardView.fields(isCn ? "CN" : "EN")
        : cardView.fields || [];
    return list.map((field) => ({
      ...field,
      label: resolveLocalizedLabel(field.label, isCn),
    }));
  }, [cardView, isCn]);

  const cardProps = useMemo(() => {
    if (!cardView) return {};
    return {
      fields: cardFields,
      titleField: cardView.titleField || config.primaryField,
      imageKey: cardView.imageField || config.coverField,
      videoKey: cardView.videoField,
      isCn,
      style: bodyFont ? { fontFamily: bodyFont } : {},
      showActions: true,
      onEdit: (id) => {
        if (!id || !config.editHref) return;
        router.push(config.editHref(id));
      },
      onDelete: (item) => setCardDeleteItem(item),
      ...(cardView.cardProps || {}),
    };
  }, [cardView, cardFields, config.primaryField, config.coverField, config.editHref, isCn, bodyFont, router]);

  // ── Groups (both modes) ────────────────────────────────────────────────
  // One grouping engine for Cards and List. A page describes each dimension
  // as an option:
  //   { value:"year", field:"year", sort:"numericDesc" }
  //   { value:"letter", kind:"letter", field:"title" }   // A–Z, # last
  //   { value:"type", field:"type", format:"type" }
  //   { value:"artist", getKey: fn, getLabel: fn, itemSort:"none", sortFn }
  // Keys are matched case/space-insensitively; labels are computed from the
  // first spelling seen in the bucket.
  const visibleGroups = useMemo(() => {
    if (!groupOption) return [{ key: "__all__", label: "", items: visible }];

    const opt = groupOption;
    const kind =
      opt.kind || (opt.value === "letter" ? "letter" : null);
    const sortMode = opt.sort || (opt.value === "year" ? "numericDesc" : "alpha");
    const direction = sortMode === "numericAsc" || sortMode === "alpha" ? 1 : -1;

    const keyOf = (item) => {
      if (typeof opt.getKey === "function") {
        return String(opt.getKey(item, { isCn }) ?? "").trim();
      }
      if (kind === "letter") {
        const text = asText(
          readField(item, opt.field || config.primaryField, isCn)
        ).trim();
        const first = text.charAt(0).toUpperCase();
        return /[A-Z]/.test(first) ? first : "#";
      }
      const field = opt.field || opt.value;
      return asText(item?.[field] ?? "").trim();
    };

    const labelOf = (bucketKey, raw, items) => {
      if (bucketKey === UNGROUPED_KEY) return isCn ? "未分组" : "Ungrouped";
      if (typeof opt.getLabel === "function") {
        return opt.getLabel(raw || bucketKey, items, { isCn });
      }
      if (opt.format === "type" || opt.value === "type") {
        return formatType(raw || bucketKey);
      }
      return raw || bucketKey;
    };

    const buckets = new Map();
    visible.forEach((item) => {
      const key = keyOf(item);
      const bucketKey = key
        ? opt.normalizeKey === false
          ? key
          : key.toLowerCase().replace(/\s+/g, " ")
        : UNGROUPED_KEY;
      const bucket = buckets.get(bucketKey) || { items: [], raw: key };
      bucket.items.push(item);
      if (!bucket.raw && key) bucket.raw = key;
      buckets.set(bucketKey, bucket);
    });

    const titleCompare = (a, b) =>
      asText(readField(a, config.primaryField, isCn)).localeCompare(
        asText(readField(b, config.primaryField, isCn)),
        undefined,
        { sensitivity: "base" }
      );

    const itemSort =
      opt.itemSort ?? (kind === "letter" || opt.value === "type" ? "title" : "none");

    const sortItems = (items) => {
      if (typeof itemSort === "function") return [...items].sort(itemSort);
      if (itemSort === "title") return [...items].sort(titleCompare);
      return items;
    };

    return [...buckets.entries()]
      .map(([key, bucket]) => ({
        key,
        label: labelOf(key, bucket.raw, bucket.items),
        items: sortItems(bucket.items),
      }))
      .sort((a, b) => {
        if (a.key === UNGROUPED_KEY) return 1;
        if (b.key === UNGROUPED_KEY) return -1;
        if (typeof opt.sortFn === "function") return opt.sortFn(a, b, { isCn });
        if (kind === "letter") {
          if (a.key === "#") return 1;
          if (b.key === "#") return -1;
          return a.key.localeCompare(b.key);
        }
        if (sortMode === "alpha") {
          return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
        }
        const an = Number(a.key);
        const bn = Number(b.key);
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * direction;
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" }) * direction;
      });
  }, [visible, groupOption, isCn, config.primaryField]);

  const handleCardDeleteConfirm = async () => {
    if (!cardDeleteItem) return;
    try {
      await deleteItem(itemId(cardDeleteItem));
      setCardDeleteItem(null);
    } catch {
      // surfaced via deleteError
    }
  };

  const cardDeleteContent = useMemo(() => {
    if (!cardDeleteItem) return "";
    const fields = cardView?.deleteFields || ["title"];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {fields.map((field) => {
          const value = asText(cardDeleteItem?.[field]);
          if (!value) return null;
          const label =
            cardFields.find((f) => f.key === field)?.label ||
            field.charAt(0).toUpperCase() + field.slice(1);
          return (
            <div key={field}>
              <span style={{ opacity: 0.55 }}>{label}: </span>
              {value}
            </div>
          );
        })}
      </div>
    );
  }, [cardDeleteItem, cardView, cardFields]);

  const rowProps = {
    config,
    isCn,
    colors,
    isDark,
    isMobile,
    fonts,
    confirmingId,
    onAskDelete: setConfirmingId,
    onCancelDelete: () => setConfirmingId(null),
    onConfirmDelete: handleConfirmDelete,
    deleting: (item) => loadingId === itemId(item),
    onImageClick: (url, alt) => setZoomImage({ url, alt }),
  };

  return (
    <div
      style={{
        // Manager pages sit directly on the app background.
        backgroundColor: "transparent",
        color: colors.text,
        minHeight: "100vh",
        padding: `${PAGE.PADDING_TOP}px ${
          isMobile ? PAGE.PADDING_X_MOBILE : PAGE.PADDING_X_DESKTOP
        }px ${PAGE.PADDING_BOTTOM}px`,
      }}
    >
      <div style={{ maxWidth: PAGE.MAX_WIDTH, margin: "0 auto" }}>
        {/* ── Title (above every control) ─────────────────────────────── */}
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {/* Page marker — a bold black rule before the title. */}
            <span
              aria-hidden="true"
              style={{
                width: 3,
                height: 30,
                marginTop: 5,
                flex: "0 0 auto",
                background: "#000",
              }}
            />
            <div>
            <h1
              style={{
                fontFamily: fonts.title,
                fontSize: PAGE.TITLE_SIZE,
                letterSpacing: PAGE.TITLE_LETTER_SPACING,
                fontWeight: 700,
                margin: 0,
                color: colors.text,
              }}
            >
              {pick(config.title, isCn)}
            </h1>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: 14,
            }}
          >
            {hasCardView && (
              <ViewModeSwitch
                value={viewMode}
                onChange={setViewMode}
                isCn={isCn}
                colors={colors}
                isDark={isDark}
              />
            )}

          </div>
        </header>

        {/* ── Search + buttons (one row) ──────────────────────────────── */}
        <div
          data-guide-anchor="toolbar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {config.showSearch !== false && (
          <div
            style={{
              position: "relative",
              flex: isMobile ? "1 1 100%" : "0 1 320px",
              minWidth: 0,
              maxWidth: isMobile ? "100%" : 320,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.text}
              strokeWidth="1.4"
              strokeLinecap="round"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.55,
                pointerEvents: "none",
              }}
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pick(config.searchPlaceholder, isCn)}
              aria-label={pick(config.searchPlaceholder, isCn)}
              style={{
                width: "100%",
                height: PAGE.CONTROL.HEIGHT,
                background: "transparent",
                // underline only — no box, same as the archive search
                border: "none",
                borderBottom: `1px solid ${query ? colors.text : HAIRLINE(isDark)}`,
                borderRadius: 0,
                outline: "none",
                padding: "0 2px 0 32px",
                fontFamily: fonts.body,
                fontSize: 12,
                color: colors.text,
              }}
            />
          </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginLeft: isMobile || config.showSearch === false ? 0 : "auto",
            }}
          >
            {config.createHref && (
              <ToolbarButton
                href={config.createHref}
                solid
                colors={colors}
                font={fonts.body}
                isDark={isDark}
              >
                {pick(UI.newEntry, isCn)}
              </ToolbarButton>
            )}

            {config.batchEditHref && (
              <ToolbarButton
                href={config.batchEditHref}
                colors={colors}
                font={fonts.body}
                isDark={isDark}
              >
                {pick(UI.batchEdit, isCn)}
              </ToolbarButton>
            )}

            {config.exportFn && (
              <ToolbarButton
                onClick={handleExport}
                colors={colors}
                font={fonts.body}
                isDark={isDark}
              >
                {pick(UI.export, isCn)}
              </ToolbarButton>
            )}

            {/* Collection shortcuts (artwork → order page) */}
            {(config.extraLinks || []).map((link) => (
              <ToolbarButton
                key={link.href}
                href={link.href}
                colors={colors}
                font={fonts.body}
                isDark={isDark}
              >
                {pick(link.label, isCn)}
              </ToolbarButton>
            ))}
            {/* Page-level actions (e.g. the image manager's “Refresh Images”).
                A disabled action reads as a grey, inactive state; `notice`
                shows a short hint next to it. */}
            {(config.headerActions || []).map((action) => {
              const Icon = action.icon || null;
              // Labels may be bilingual objects or already-localized strings.
              const text = (value) =>
                typeof value === "string" ? value : pick(value, isCn);
              const label = text(action.label);
              const notice = action.notice ? text(action.notice) : "";
              const off = Boolean(action.disabled);
              return (
                <span
                  key={action.key || label}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
                >
                  <span
                    role="button"
                    tabIndex={off ? -1 : 0}
                    aria-disabled={off}
                    onClick={() => {
                      if (!off) action.onClick?.();
                    }}
                    onKeyDown={(event) => {
                      if (off) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        action.onClick?.();
                      }
                    }}
                    title={action.tooltip ? text(action.tooltip) : label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: PAGE.CONTROL.HEIGHT,
                      padding: "0 14px",
                      border: `1px solid ${off ? HAIRLINE(isDark) : colors.text}`,
                      fontFamily: fonts.body,
                      fontSize: PAGE.CONTROL.FONT_SIZE,
                      letterSpacing: PAGE.CONTROL.LETTER_SPACING,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      cursor: off ? "default" : "pointer",
                      opacity: off ? 0.35 : 1,
                      userSelect: "none",
                    }}
                  >
                    {Icon ? <Icon size={13} /> : null}
                    {label}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Row 1: order / group + card-size slider on the far right ── */}
        {(showSortBy || groupOptions.length > 0 || (hasCardView && viewMode === "grid")) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: isMobile ? "wrap" : "nowrap",
              gap: 8,
              paddingTop: 16,
              paddingBottom: visibleFilters.length > 0 ? 8 : 14,
              marginBottom: visibleFilters.length > 0 ? 0 : 18,
            }}
          >
            {showSortBy && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isDark ? "rgba(255,255,255,0.72)" : "#4a4a4a",
                    opacity: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pick(config.sortCaption || { en: "Order by", cn: "排序" }, isCn)}
                </span>
                <FilterDropdown
                  value={sortMode}
                  onChange={setSortMode}
                  options={sortOptions.map((option) => ({
                    value: option.value,
                    label: pick(option.label, isCn),
                  }))}
                  includeAll={false}
                  allLabel=""
                  ariaLabel={pick(config.sortCaption || { en: "Order by", cn: "排序" }, isCn)}
                  fontFamily={fonts.body}
                  colors={colors}
                  labelColor={isDark ? "rgba(255,255,255,0.78)" : "#4a4a4a"}
                  width={86}
                  align="left"
                />
              </div>
            )}

            {groupOptions.length > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isDark ? "rgba(255,255,255,0.72)" : "#4a4a4a",
                    opacity: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pick(groupConfig.caption || { en: "Group", cn: "分组" }, isCn)}
                </span>
                <FilterDropdown
                  value={groupMode === "none" ? "" : groupMode}
                  onChange={(value) => setGroupMode(value || "none")}
                  options={groupOptions.map((option) => ({
                    value: option.value,
                    label: pick(option.label, isCn),
                  }))}
                  allLabel={pick(groupConfig.allLabel || { en: "None", cn: "不分组" }, isCn)}
                  ariaLabel={pick(groupConfig.ariaLabel || { en: "Group by", cn: "分组方式" }, isCn)}
                  fontFamily={fonts.body}
                  colors={colors}
                  labelColor={isDark ? "rgba(255,255,255,0.78)" : "#4a4a4a"}
                  width={80}
                  align="left"
                />
              </div>
            )}

            {hasCardView && viewMode === "grid" && (
              <label
                title={isCn ? `卡片大小 ${cardWidth}px` : `Card size ${cardWidth}px`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                  marginLeft: isMobile ? 0 : "auto",
                  gap: 7,
                  opacity: 1,
                  color: isDark ? "rgba(255,255,255,0.78)" : "#4a4a4a",
                  cursor: "pointer",
                }}
              >
                <Maximize2 size={15} aria-hidden="true" />
                <input
                  type="range"
                  aria-label={isCn ? "卡片大小" : "Card size"}
                  min={MIN_CARD_WIDTH}
                  max={MAX_CARD_WIDTH}
                  step={10}
                  value={cardWidth}
                  onChange={(event) => setCardWidth(Number(event.target.value))}
                  style={{ width: 92, accentColor: colors.text, cursor: "pointer" }}
                />
              </label>
            )}
          </div>
        )}

        {/* ── Row 2: Filter by ─────────────────────────────────────────── */}
        {visibleFilters.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: isMobile ? "wrap" : "nowrap",
              gap: 8,
              paddingBottom: 12,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: isDark ? "rgba(255,255,255,0.72)" : "#4a4a4a",
                opacity: 1,
                whiteSpace: "nowrap",
              }}
            >
              {pick(config.filterCaption || { en: "Filter by", cn: "筛选" }, isCn)}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: isMobile ? "wrap" : "nowrap",
                gap: 8,
                marginLeft: isMobile ? 0 : "auto",
              }}
            >
            {visibleFilters.map((filter) => (
              <div key={filter.field} style={{ display: "inline-flex", alignItems: "center" }}>
                <FilterDropdown
                  value={filters[filter.field] || ""}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, [filter.field]: value }))
                  }
                  options={filterOptions[filter.field] || []}
                  allLabel={pick(filter.allLabel, isCn)}
                  ariaLabel={pick(filter.ariaLabel || filter.allLabel, isCn)}
                  fontFamily={fonts.body}
                  colors={colors}
                  labelColor={isDark ? "rgba(255,255,255,0.78)" : "#4a4a4a"}
                  width={filter.width === 60 ? 54 : Math.min(Math.max(filter.width || 100, 84), 100)}
                  align="left"
                />
              </div>
            ))}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters({})}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: fonts.body,
                  fontSize: 12,
                  letterSpacing: "0.03em",
                  color: colors.text,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                {pick(UI.clear, isCn)}
              </button>
            )}
            </div>
          </div>
        )}

        {!!deleteError && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: "#c0392b",
              margin: "0 0 16px",
            }}
          >
            {deleteError}
          </p>
        )}

        {/* ── States ──────────────────────────────────────────────────── */}
        {isLoading && !rows.length && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.4,
              padding: "40px 0",
              borderTop: `1px solid ${HAIRLINE(isDark)}`,
              margin: 0,
            }}
          >
            {pick(UI.loading, isCn)}
          </p>
        )}

        {!!error && !isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "40px 0",
              borderTop: `1px solid ${HAIRLINE(isDark)}`,
            }}
          >
            <span style={{ fontFamily: fonts.body, fontSize: 12, opacity: 0.6 }}>
              {pick(UI.loadError, isCn)}
            </span>
            <RowAction onClick={() => refetch?.()} colors={colors} font={fonts.body}>
              {pick(UI.retry, isCn)}
            </RowAction>
          </div>
        )}

        {!isLoading && !error && visible.length === 0 && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              opacity: 0.45,
              padding: "40px 0",
              borderTop: `1px solid ${HAIRLINE(isDark)}`,
              margin: 0,
            }}
          >
            {rows.length && (query || activeFilterCount)
              ? pick(UI.noMatch, isCn)
              : pick(config.emptyMessage || { en: "Nothing here yet.", cn: "暂无内容。" }, isCn)}
          </p>
        )}

        {/* ── Rows / cards, split into the selected groups ────────────── */}
        {visibleGroups.map((group) => {
          const groupRows = group.items;
          // Grouped sections read best as one-line accordions (A–Z / type /
          // year), so a group never explodes into full editorial rows. The
          // ungrouped list keeps the short-list behaviour.
          const groupAccordion = group.label ? true : groupRows.length > threshold;
          return (
            <section
              key={group.key}
              style={{ borderTop: `1px solid ${HAIRLINE(isDark)}` }}
            >
              {group.label && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "24px 0 4px",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: fonts.title,
                      fontSize: PAGE.GROUP_TITLE_SIZE,
                      fontWeight: 400,
                      letterSpacing:
                        groupMode === "letter" ? "0.08em" : "0.02em",
                      margin: 0,
                      color: colors.text,
                    }}
                  >
                    {group.label}
                    {groupRows.length > 0 && (
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          fontWeight: 400,
                          letterSpacing: "0.02em",
                          opacity: 0.45,
                          marginLeft: 10,
                          verticalAlign: "middle",
                        }}
                      >
                        · {groupRows.length}
                      </span>
                    )}
                  </h2>

                </div>
              )}

              {hasCardView && viewMode === "grid" ? (
                <div style={{ padding: group.label ? "16px 0 30px" : "22px 0 30px" }}>
                  <GridViewLayout
                    data={groupRows.map((row) =>
                      row.artist || row.artist_name
                        ? row
                        : { ...row, artist: getArtistName(isCn ? "CN" : "EN") || "" }
                    )}
                    Component={ManagerCard}
                    componentProps={cardProps}
                    minColumnWidth={cardWidth}
                    masonry={cardLayout === "masonry"}
                    style={{ alignItems: "start" }}
                  />
                </div>
              ) : (
                groupRows.map((item) => {
                  const id = itemId(item);
                  if (groupAccordion) {
                    return (
                      <AccordionItem
                        key={id}
                        item={item}
                        open={String(openId) === String(id)}
                        onToggle={() =>
                          setOpenId((current) =>
                            String(current) === String(id) ? null : id
                          )
                        }
                        {...rowProps}
                        deleting={rowProps.deleting(item)}
                      />
                    );
                  }
                  return (
                    <article
                      key={id}
                      className="mgr-row-article"
                      style={{
                        borderTop: `1px solid ${HAIRLINE(isDark)}`,
                        padding: `${PAGE.ROW.PADDING_Y}px 0 ${PAGE.ROW.PADDING_Y + 10}px`,
                        position: "relative",
                      }}
                    >
                      <EditorialRowBody
                        item={item}
                        {...rowProps}
                        deleting={rowProps.deleting(item)}
                      />
                    </article>
                  );
                })
              )}
            </section>
          );
        })}

        {visible.length > 0 && <div style={{ borderTop: `1px solid ${HAIRLINE(isDark)}` }} />}
      </div>

      {/* Card-mode delete confirmation — same content as the list's inline ask,
          just in a dialog because a card has no rule to hang the ask on. */}
      {hasCardView && (
        <DeleteDialog
          open={Boolean(cardDeleteItem)}
          onClose={() => setCardDeleteItem(null)}
          onConfirm={handleCardDeleteConfirm}
          title={pick(UI.confirmDelete, isCn)}
          content={cardDeleteContent}
          confirmText={pick(UI.delete, isCn)}
          cancelText={pick(UI.cancel, isCn)}
          loading={Boolean(cardDeleteItem) && loadingId === itemId(cardDeleteItem)}
        />
      )}

      <ImageZoomModal
        isOpen={Boolean(zoomImage?.url)}
        onClose={() => setZoomImage(null)}
        imageUrl={zoomImage?.url || ""}
        title={zoomImage?.alt || ""}
      />

      {/* In-app documentation — the floating right-edge “Guide” tab that used
          to live in the structure layout. Every manager list page gets it. */}
      <ManagerUserGuide />
    </div>
  );
}
