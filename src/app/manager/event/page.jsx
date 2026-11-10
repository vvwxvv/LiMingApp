"use client";

import { useMemo } from "react";
import { eventManagerConfig } from "@/components/pages/manager/config/collections/eventManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/event — shared editorial manager layout.
 * Page-level settings: order ascending, type grouping (same as nextjsapp).
 */
export default function EventManagerPage() {
  const config = useMemo(
    () => ({
      ...eventManagerConfig,
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
          { value: "type", field: "type", format: "type", label: { en: "Type", cn: "类型" } },
          { value: "year", field: "year", sort: "numericDesc", label: { en: "Year", cn: "年份" } },
          { value: "letter", kind: "letter", field: "title", label: { en: "A–Z", cn: "字母 A–Z" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
