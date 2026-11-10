"use client";

import { useMemo } from "react";
import { artworkManagerConfig } from "@/components/pages/manager/config/collections/artworkManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/artwork — editorial manager layout.
 *
 * Page-level settings mirror nextjsapp's `managerSchemaConfig` overrides:
 * default sort / order key, the order-by selector options, and the group-by
 * dimension. Collection fields, rows and cards still come from the config.
 */
export default function ArtworkManagerPage() {
  const config = useMemo(
    () => ({
      ...artworkManagerConfig,
      filterCaption: { en: "Filter by", cn: "筛选" },
      filterFields: ["type", "series", "year"],

      // Default to year. More than one option exposes the Order-by control;
      // a single option keeps the nav hidden.
      defaultSort: { field: "year", direction: "desc" },
      defaultSortOption: "year",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "year", field: "year", direction: "desc", label: { en: "Year", cn: "年份" } },
        { value: "letter", field: "title", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
        { value: "type", field: "type", direction: "asc", label: { en: "Type", cn: "类型" } },
        { value: "series", field: "series", direction: "asc", label: { en: "Series", cn: "系列" } },
      ],

      // Grouping follows the nextjsapp setting; every other dimension stays
      // selectable in the group-by control.
      groupBy: {
        ...artworkManagerConfig.groupBy,
        default: "year",
        options: [
          { value: "artist", field: "artist", label: { en: "Artist", cn: "艺术家" } },
          { value: "year", field: "year", sort: "numericDesc", label: { en: "Year", cn: "年份" } },
          { value: "type", field: "type", format: "type", label: { en: "Type", cn: "类型" } },
          { value: "series", field: "series", label: { en: "Series", cn: "系列" } },
          { value: "letter", kind: "letter", field: "title", label: { en: "A–Z", cn: "字母 A–Z" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
