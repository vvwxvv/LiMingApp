"use client";

import { useMemo } from "react";
import { videoManagerConfig } from "@/components/pages/manager/config/collections/videoManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/video — shared editorial manager layout (Cards + List).
 * Page-level settings: order ascending, A–Z grouping.
 */
export default function VideoManagerPage() {
  const config = useMemo(
    () => ({
      ...videoManagerConfig,
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
        ...videoManagerConfig.groupBy,
        default: "letter",
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
