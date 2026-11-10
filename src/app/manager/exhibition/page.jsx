"use client";

import { useMemo } from "react";
import { exhibitionManagerConfig } from "@/components/pages/manager/config/collections/exhibitionManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/exhibition — shared editorial manager layout (Cards + List).
 * Page-level settings: newest year first, year grouping.
 */
export default function ExhibitionManagerPage() {
  const config = useMemo(
    () => ({
      ...exhibitionManagerConfig,
      filterFields: ["type", "year"],
      filterCaption: { en: "Filter by", cn: "筛选" },
      defaultSort: { field: "year", direction: "desc" },
      defaultSortOption: "year",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "year", field: "year", direction: "desc", label: { en: "Year", cn: "年份" } },
        { value: "letter", field: "title", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
        { value: "type", field: "type", direction: "asc", label: { en: "Type", cn: "类型" } },
      ],
      groupBy: {
        default: "year",
        caption: { en: "Group", cn: "分组" },
        allLabel: { en: "None", cn: "不分组" },
        options: [
          { value: "year", field: "year", sort: "numericDesc", label: { en: "Year", cn: "年份" } },
          { value: "letter", kind: "letter", field: "title", label: { en: "A–Z", cn: "字母 A–Z" } },
          { value: "type", field: "type", format: "type", label: { en: "Type", cn: "类型" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
