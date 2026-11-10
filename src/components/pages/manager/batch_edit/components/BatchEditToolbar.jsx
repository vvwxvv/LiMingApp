"use client";

/**
 * BatchEditToolbar.jsx
 *
 * The whole top of a batch-edit page, in one quiet block:
 *
 *   Title                                        [Save] [Add Row] [Delete] [Export]
 *   ORDER BY  Year ▾   GROUP  Year ▾              Unsaved   [search]
 *   ───────────────────────────────────────────────────────────────────────────
 *
 * Mirrors the manager pages' control row (uppercase caption + underlined
 * value + caret), and mirrors the Dream Journal page's restraint: no info
 * banners, no counters, no pill buttons.
 */

import React from "react";
import { Box, Divider, Stack, TextField, Typography } from "@mui/material";
import BatchDropdown from "@/components/pages/manager/batch_edit/components/BatchDropdown";
import BatchEditActions from "@/components/pages/manager/batch_edit/components/BatchEditActions";

export default function BatchEditToolbar({
  title,
  isCn = false,
  labelFontStyle = {},
  // actions
  hasChanges,
  isSaving,
  selectedRows,
  onSave,
  onAdd,
  onDelete,
  onExport,
  getLabel,
  processedData,
  // sorting
  sortOptions = [],
  activeSort = null,
  onSortChange,
  // grouping
  groupOptions = [],
  groupBy,
  onGroupChange,
  // search
  searchTerm = "",
  onSearchChange,
  searchPlaceholder,
}) {
  return (
    <Stack spacing={2}>
      {/* ── Title + actions ── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "text.primary",
            ...labelFontStyle,
          }}
        >
          {title}
        </Typography>

        <BatchEditActions
          onSave={onSave}
          onAdd={onAdd}
          onDelete={onDelete}
          onDownloadCSV={onExport}
          hasChanges={hasChanges}
          isSaving={isSaving}
          selectedRows={selectedRows}
          processedData={processedData}
          getLabel={getLabel}
          labelFontStyle={labelFontStyle}
        />
      </Stack>

      {/* ── Controls ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 2, sm: 3 },
          rowGap: 1.5,
          flexWrap: "wrap",
          pt: 0.5,
        }}
      >
        {activeSort && (
          <BatchDropdown
            label={isCn ? "排序" : "Order by"}
            value={activeSort.value}
            options={sortOptions.map((o) => ({ value: o.value, label: o.label }))}
            onChange={onSortChange}
            width={72}
            labelFontStyle={labelFontStyle}
          />
        )}

        {groupOptions.length > 0 && (
          <BatchDropdown
            label={isCn ? "分组" : "Group"}
            value={groupBy}
            options={groupOptions.map((o) => ({
              value: o.value,
              label: o.label?.[isCn ? "cn" : "en"] || o.value,
            }))}
            onChange={onGroupChange}
            width={76}
            labelFontStyle={labelFontStyle}
          />
        )}

        <Box sx={{ flex: 1, minWidth: 0 }} />

        {hasChanges && (
          <Typography
            sx={{
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "text.disabled",
              whiteSpace: "nowrap",
            }}
          >
            {isCn ? "未保存" : "Unsaved"}
          </Typography>
        )}

        <TextField
          variant="standard"
          size="small"
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={
            searchPlaceholder || (isCn ? "搜索标题、艺术家…" : "Search title, artist…")
          }
          sx={{
            width: { xs: "100%", sm: 220 },
            "& .MuiInputBase-root": { fontSize: 11 },
            "& .MuiInputBase-input": { pb: "4px", ...labelFontStyle },
            "& .MuiInputBase-input::placeholder": { opacity: 0.45 },
            "& .MuiInput-underline:before": {
              borderBottom: "1px solid var(--border-light, #ddd)",
            },
            "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
              borderBottom: "1px solid",
              borderColor: "text.primary",
            },
            "& .MuiInput-underline:after": { borderBottomColor: "text.primary" },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: "divider" }} />
    </Stack>
  );
}
