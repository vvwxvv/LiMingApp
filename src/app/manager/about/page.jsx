"use client";

import { useMemo } from "react";
import { aboutManagerConfig } from "@/components/pages/manager/config/collections/aboutManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/about — shared editorial manager layout (list only).
 * Page-level settings: order ascending (same as nextjsapp), A–Z grouping.
 */
export default function AboutManagerPage() {
  const config = useMemo(
    () => ({
      ...aboutManagerConfig,
      filterFields: ["artist"],
      filterCaption: { en: "Filter by", cn: "筛选" },
      defaultSort: { field: "order", direction: "asc" },
      defaultSortOption: "order",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "order", field: "order", direction: "asc", label: { en: "Order", cn: "顺序" } },
        { value: "letter", field: "artist", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
      ],
      groupBy: {
        default: "letter",
        caption: { en: "Group", cn: "分组" },
        allLabel: { en: "None", cn: "不分组" },
        options: [
          { value: "letter", kind: "letter", field: "artist", label: { en: "A–Z", cn: "字母 A–Z" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
