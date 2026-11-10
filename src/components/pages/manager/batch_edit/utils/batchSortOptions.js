/**
 * batchSortOptions.js
 *
 * Order-by choices for the batch-edit pages, mirroring how the manager pages
 * present sorting: one small "ORDER BY  Year ▾" control instead of a stack of
 * sort pills. Each option is a plain field + direction pair so both the flat
 * list and the rows inside each group can be ordered the same way.
 */

const S = (value, field, dir, en, cn) => ({ value, field, dir, label: { en, cn } });

/** Per-entity options — first entry is the default. */
const ENTITY_SORTS = {
  artwork: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
    S("series", "series", "asc", "Series", "系列"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  exhibition: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  fair: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  event: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  writing: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
    S("category", "category", "asc", "Category", "分类"),
  ],
  bibliography: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
  ],
  image: [
    S("letter", "tag_en", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  video: [
    S("letter", "tag_en", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  web: [
    S("letter", "tag_en", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  series: [
    S("year", "year", "desc", "Year", "年份"),
    S("letter", "title", "asc", "A–Z", "字母 A–Z"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  resume: [
    S("year", "year", "desc", "Year", "年份"),
    S("type", "type", "asc", "Type", "类型"),
  ],
  enquire: [
    S("newest", "createdAt", "desc", "Newest", "最新"),
    S("status", "status", "asc", "Status", "状态"),
  ],
};

/** Read `a.b.c` style paths without throwing on null. */
function readPath(row, path) {
  if (!row || !path) return undefined;
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), row);
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

/**
 * @param {string} entity
 * @param {boolean} isCn
 * @param {{ alphabetField?: string, defaultField?: string }} [opts]
 * @returns {Array<{ value, field, dir, label: { en, cn } }>}
 */
export function getBatchSortOptions(entity, isCn = false, opts = {}) {
  const alphabetField = opts.alphabetField || "title";
  const base =
    ENTITY_SORTS[entity] ||
    [
      S("letter", alphabetField, "asc", "A–Z", "字母 A–Z"),
      S("year", "year", "desc", "Year", "年份"),
    ];

  const options = base.map((option) => ({ ...option }));

  // Keep the page's own alphabet field for the "A–Z" entry when it differs
  // (e.g. the image page sorts on `tag`, not `title`).
  const letter = options.find((o) => o.value === "letter");
  if (letter && !ENTITY_SORTS[entity]) letter.field = alphabetField;

  return options.map((option) => ({
    ...option,
    label: isCn ? option.label.cn : option.label.en,
  }));
}

/** Numeric-ish fields sort numerically even when stored as strings. */
function isNumericField(field) {
  return /(^|\.)(year|order|price|value|index|num)($|\.|_)/i.test(field || "");
}

/**
 * Sort a copy of `rows` by `{ field, dir }`.
 * Empty values always sink to the bottom, new rows stay on top.
 */
export function sortRowsBySpec(rows, spec) {
  const list = [...rows];
  if (!spec?.field) return list;

  const { field, dir = "asc" } = spec;
  const sign = dir === "desc" ? -1 : 1;
  const numeric = isNumericField(field);

  return list.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;

    const av = readPath(a, field);
    const bv = readPath(b, field);
    const aEmpty = isEmpty(av) || (Array.isArray(av) && av.length === 0);
    const bEmpty = isEmpty(bv) || (Array.isArray(bv) && bv.length === 0);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    const aVal = Array.isArray(av) ? av.join(", ") : av;
    const bVal = Array.isArray(bv) ? bv.join(", ") : bv;

    if (numeric) {
      const an = Number(aVal);
      const bn = Number(bVal);
      if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * sign;
    }

    return String(aVal).localeCompare(String(bVal), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * sign;
  });
}

export default getBatchSortOptions;
