"use client";

import { useMemo } from "react";
import { subscribeManagerConfig } from "@/components/pages/manager/config/collections/subscribeManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/subscribe — shared editorial manager layout.
 * Read-only list: newest subscriber first, status filter, delete only.
 */
export default function SubscribeManagerPage() {
  const config = useMemo(
    () => ({
      ...subscribeManagerConfig,
      filterFields: ["isActive"],
      filterCaption: { en: "Filter by", cn: "筛选" },
      defaultSort: { field: "createdAt", direction: "desc" },
      defaultSortOption: "createdAt",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "createdAt", field: "createdAt", direction: "desc", label: { en: "Newest", cn: "最新" } },
        { value: "letter", field: "name", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
      ],
      groupBy: { default: "none", options: [] },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
