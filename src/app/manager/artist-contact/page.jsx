"use client";

import { useMemo } from "react";
import { artistContactManagerConfig } from "@/components/pages/manager/config/collections/artistContactManagerConfig";
import EditorialManagerList from "@/components/pages/manager/layouts/EditorialManagerList";

/**
 * /manager/artist-contact — shared editorial manager layout (list only).
 * Page-level settings: order ascending, A–Z grouping.
 */
export default function GalleryArtistContactManagerPage() {
  const config = useMemo(
    () => ({
      ...artistContactManagerConfig,
      filterFields: ["artist_name"],
      filterCaption: { en: "Filter by", cn: "筛选" },
      defaultSort: { field: "order", direction: "asc" },
      defaultSortOption: "order",
      sortCaption: { en: "Order by", cn: "排序" },
      sortOptions: [
        { value: "order", field: "order", direction: "asc", label: { en: "Order", cn: "顺序" } },
        { value: "letter", field: "artist_name", direction: "asc", label: { en: "A–Z", cn: "字母 A–Z" } },
      ],
      groupBy: {
        default: "letter",
        caption: { en: "Group", cn: "分组" },
        allLabel: { en: "None", cn: "不分组" },
        options: [
          { value: "letter", kind: "letter", field: "artist_name", label: { en: "A–Z", cn: "字母 A–Z" } },
        ],
      },
    }),
    []
  );

  return <EditorialManagerList config={config} />;
}
