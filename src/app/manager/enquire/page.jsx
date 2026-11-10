"use client";

import { useMemo } from "react";
import { enquireManagerConfig } from "@/components/pages/manager/config/collections/enquireManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/enquire — shared editorial manager layout (list only).
 * Page-level settings: newest first, status grouping.
 */
export default function EnquireManagerPage() {
  const config = useMemo(
    () => ({
      ...enquireManagerConfig,
      filterFields: ["status"],
      filterCaption: { en: "Filter by", cn: "筛选" },
      defaultSort: { field: "createdAt", direction: "desc" },
      defaultSortOption: "createdAt",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "createdAt", field: "createdAt", direction: "desc", label: { en: "Newest", cn: "最新" } },
        { value: "letter", field: "name", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
      ],
      groupBy: {
        default: "status",
        caption: { en: "Group", cn: "分组" },
        allLabel: { en: "None", cn: "不分组" },
        options: [
          { value: "status", field: "status", label: { en: "Status", cn: "状态" } },
          { value: "letter", kind: "letter", field: "name", label: { en: "A–Z", cn: "字母 A–Z" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
