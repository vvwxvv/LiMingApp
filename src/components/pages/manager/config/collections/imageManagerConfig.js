/**
 * ===========================================================================
 * WHAT   Image — manager list config
 * USED   /manager/image  ->  <EditorialManagerList config={...} />  (Cards + List)
 * LOGIC  A page passes this object to the shared layout. The layout reads
 *        fields, then filters, grouping, rows/cards. Filters are derived from
 *        the filter list in this file (or a *_FILTER_FIELDS block). Nothing
 *        else imports this file.
 * EDIT   The *_FIELDS / *_FILTER_FIELDS / ROUTES blocks at the top, then the
 *        view options below.
 * ===========================================================================
 */
import { createComprehensiveImageExport } from "@/components/pages/manager/utils/imageExportUtils";
import { FIXED_SIZE_PRESET } from "@/components/pages/manager/constants/cardDisplayPresets";

/**
 * Image — manager list config (Cards + editorial List).
 *
 * The page composes this config with runtime bits (the “Sync images” header
 * action) before passing it to the shared layout. Rolling-image ordering is
 * intentionally absent — not every deployment has a rolling image page.
 */
const IMAGE_FIELDS = [
  // Basic Info
  { key: 'img_url', label: 'Image URL / 图片链接' },
  { key: 'artist', label: 'Artist / 艺术家' },
  { key: 'tag_en', label: 'Tag (EN) / 标签 (英文)' },
  { key: 'tag_cn', label: 'Tag (CN) / 标签 (中文)' },
  { key: 'type', label: 'Type / 类型' },
  
  // Details
  { key: 'caption_en', label: 'Caption (EN) / 说明 (英文)' },
  { key: 'caption_cn', label: 'Caption (CN) / 说明 (中文)' },
  { key: 'tag_source', label: 'Tag Source / 标签来源' },
  
  // Metadata
  { key: 'updatedAt', label: 'Updated At / 更新时间' },
];

export const imageManagerConfig = {
  key: "image",
  api: "/api/image",
  title: { en: "Image", cn: "图片" },
  // Collection accent — the header chip uses this, so the page is
  // identifiable at a glance.
  accentColor: "#3A5BA0",

  createHref: "/manager/image/create",
  batchEditHref: "/manager/image/batch_edit",
  editHref: (id) => `/manager/image/${id}/edit`,
  exportFn: (rows, isCn) => createComprehensiveImageExport(rows, isCn),

  // Images carry no language field.
  languageField: null,

  itemNoun: { en: "image", cn: "张" },

  primaryField: "tag_en",
  subtitleField: "caption_en",
  metaFields: ["type", "tag_source"],
  coverField: "img_url",
  captionFields: ["tag_en", "type"],

  searchPlaceholder: {
    en: "Search tag, caption, type…",
    cn: "搜索标签、说明、类型…",
  },
  searchFields: ["tag_en", "tag_cn", "caption_en", "caption_cn", "type", "tag_source"],

  filters: [
    {
      field: "tag_en",
      allLabel: { en: "Tag: All", cn: "标签：全部" },
      ariaLabel: { en: "Filter by tag", cn: "按标签筛选" },
      width: 120,
    },
    {
      field: "type",
      allLabel: { en: "Type: All", cn: "类型：全部" },
      ariaLabel: { en: "Filter by type", cn: "按类型筛选" },
      width: 90,
    },
    {
      field: "tag_source",
      allLabel: { en: "Source: All", cn: "来源：全部" },
      ariaLabel: { en: "Filter by source", cn: "按来源筛选" },
      width: 90,
    },
  ],

  groupBy: {
    default: "tag",
    caption: { en: "Group", cn: "分组" },
    allLabel: { en: "None", cn: "不分组" },
    options: [
      { value: "tag", field: "tag_en", label: { en: "Tag / Title", cn: "标签 / 标题" } },
      { value: "type", field: "type", format: "type", label: { en: "Type", cn: "类型" } },
      { value: "tag_source", field: "tag_source", label: { en: "Source", cn: "来源" } },
      {
        value: "letter",
        kind: "letter",
        field: "tag_en",
        label: { en: "A–Z", cn: "字母 A–Z" },
      },
    ],
  },

  sortRows: (a, b) =>
    String(a?.tag_en || "").localeCompare(String(b?.tag_en || ""), undefined, {
      sensitivity: "base",
    }),

  cardView: {
    defaultMode: "grid",
    cardWidth: 260,
    fields: IMAGE_FIELDS,
    titleField: "tag_en",
    imageField: "img_url",
    videoField: null,
    deleteFields: ["tag_en", "tag_cn", "type", "tag_source"],
    cardProps: {
      ...FIXED_SIZE_PRESET,
      aspectRatio: "1 / 1",
      summaryFieldCount: 2,
      // No rolling-image order in this app — never render an order badge.
      showOrder: false,
    },
  },

  // This app has no rolling-image page order; keep only the hover picker.
  extraLinks: [
    { href: "/manager/image/hover", label: { en: "Hover Image", cn: "悬停图" } },
  ],

  emptyMessage: { en: "No images yet.", cn: "暂无图片。" },
  accordionOver: 10,
};

export default imageManagerConfig;
