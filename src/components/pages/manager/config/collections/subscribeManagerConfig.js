/**
 * ===========================================================================
 * WHAT   Subscribe — manager list config
 * USED   /manager/subscribe  ->  <EditorialManagerList config={...} /> (List)
 * LOGIC  Read-only newsletter list. No create / edit / batch routes: the app
 *        only ever collects these through the public form.
 * ===========================================================================
 */

export const subscribeManagerConfig = {
  key: "subscribe",
  api: "/api/subscribe",
  title: { en: "Subscribers", cn: "订阅" },
  accentColor: "#5A6B7B",

  // No authoring routes.
  languageField: null,
  // Inbox/subscriber rows are not artist content.
  showArtistMeta: false,
  itemNoun: { en: "subscriber", cn: "位" },

  primaryField: "name",
  subtitleField: "email",
  metaFields: [],
  metaResolver: (item, isCn) => {
    const active = item?.isActive !== false;
    const status = isCn
      ? active
        ? "已激活"
        : "已停用"
      : active
      ? "Active"
      : "Inactive";
    const date = item?.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "";
    return [status, date].filter(Boolean).join(" · ");
  },
  captionFields: [],

  searchPlaceholder: { en: "Search name, email…", cn: "搜索姓名、邮箱…" },
  searchFields: ["name", "email"],

  filters: [
    {
      field: "isActive",
      allLabel: { en: "Status: All", cn: "状态：全部" },
      ariaLabel: { en: "Filter by status", cn: "按状态筛选" },
      width: 100,
      format: (value) => {
        const raw = String(value).toLowerCase();
        if (raw === "true") return "Active";
        if (raw === "false") return "Inactive";
        return value;
      },
    },
  ],

  sortRows: (a, b) => {
    const ad = String(a?.createdAt || "");
    const bd = String(b?.createdAt || "");
    if (ad && bd && ad !== bd) return bd.localeCompare(ad); // newest first
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  },

  emptyMessage: { en: "No subscribers yet.", cn: "暂无订阅者。" },
  accordionOver: 20,
};

export default subscribeManagerConfig;
