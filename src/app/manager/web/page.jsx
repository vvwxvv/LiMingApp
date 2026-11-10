"use client";

import { useMemo } from "react";
import { webManagerConfig } from "@/components/pages/manager/config/collections/webManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/web — shared editorial manager layout.
 * Page-level settings: order ascending, type grouping.
 */
export default function WebManagerPage() {
  const config = useMemo(
    () => ({
      ...webManagerConfig,
      filterFields: ["type", "tag_source"],
      filterCaption: { en: "Filter by", cn: "筛选" },
      defaultSort: { field: "order", direction: "asc" },
      defaultSortOption: "order",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "order", field: "order", direction: "asc", label: { en: "Order", cn: "顺序" } },
        { value: "letter", field: "tag_en", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
      ],
      groupBy: {
        default: "type",
        caption: { en: "Group", cn: "分组" },
        allLabel: { en: "None", cn: "不分组" },
        options: [
          { value: "type", field: "type", format: "type", label: { en: "Type", cn: "类型" } },
          { value: "tag_source", field: "tag_source", label: { en: "Source", cn: "来源" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
