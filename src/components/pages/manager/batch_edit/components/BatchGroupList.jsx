/**
 * BatchGroupList.jsx
 *
 * Grouped list for every batch-edit page, driven by a GROUP_CONFIG from
 * schemaBatchGroupConfig.js. (A plain flat list is used automatically only
 * when the rows carry no group values at all.)
 *
 * Styling is intentionally quiet (same language as the manager pages):
 *   - no info banners, no count chips, no view/sort pill toggles
 *   - grouping headers are plain text on a hairline rule
 *   - rows themselves come from BatchEditCardList, also borderless
 *
 * The parent (BatchEditLayout) owns the ORDER BY / GROUP dropdowns and the
 * search box, and passes them down:
 *   search    — controlled search string
 *   sortSpec  — { field, dir } applied to rows inside each group
 *
 * FREEZE BEHAVIOR — grouping and ordering stay locked to the last committed
 * state until the parent bumps `commitSignal` (after a successful save), so
 * editing a value (e.g. a group or year field) doesn't make rows jump around
 * mid-edit. Cards still show live values.
 */

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Typography, Box, Collapse, Checkbox } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import BatchEditCardList from "@/components/pages/manager/batch_edit/components/BatchEditCardList";
import { buildGroups } from "@/components/pages/manager/config/schemaBatchGroupConfig";
import { sortRowsBySpec } from "@/components/pages/manager/batch_edit/utils/batchSortOptions";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasUsableGroups(groups) {
  return groups.some((g) => !g.noGroup && g.rows.length > 0);
}

function toComparableLabel(row, getLabel) {
  if (getLabel) {
    const raw = getLabel(row);
    if (typeof raw === "string") return raw;
    if (typeof raw === "number") return String(raw);
  }
  const fallback =
    row?.title_en ?? row?.title_cn ??
    row?.name_en  ?? row?.name_cn  ??
    row?.title    ?? row?.name     ??
    row?.label    ?? row?.id       ?? "";
  return typeof fallback === "string" ? fallback : String(fallback);
}

function defaultRowMatches(row, query, getLabel) {
  const label = toComparableLabel(row, getLabel);
  if (label.toLowerCase().includes(query)) return true;

  return Object.values(row).some((value) => {
    if (typeof value === "string") return value.toLowerCase().includes(query);
    if (Array.isArray(value)) {
      return value.some((v) => typeof v === "string" && v.toLowerCase().includes(query));
    }
    return false;
  });
}

function defaultSortRows(rows, dir, config, getLabel) {
  const sorted = [...rows].sort((a, b) => {
    if (config.sortType === "numeric") {
      const av = a.order ?? a.index ?? 0;
      const bv = b.order ?? b.index ?? 0;
      return av - bv;
    }
    return toComparableLabel(a, getLabel).localeCompare(toComparableLabel(b, getLabel));
  });
  return dir === config.sortDefaultDir ? sorted : sorted.reverse();
}

// ─────────────────────────────────────────────────────────────────────────────
// One group
// ─────────────────────────────────────────────────────────────────────────────
function GroupSection({
  group,
  config,
  labelFontStyle,
  columns,
  selectedRows,
  onSelectRow,
  onCellUpdate,
  getLabel,
}) {
  const [open, setOpen] = useState(false);

  const liveRows = group.liveRows;
  const groupIds = liveRows.map((r) => r.id);
  const selectedCount = groupIds.filter((id) => selectedRows.includes(id)).length;
  const allSelected = groupIds.length > 0 && selectedCount === groupIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const handleGroupSelectAll = useCallback(() => {
    if (allSelected) {
      groupIds.forEach((id) => {
        if (selectedRows.includes(id)) onSelectRow(id);
      });
    } else {
      groupIds.forEach((id) => {
        if (!selectedRows.includes(id)) onSelectRow(id);
      });
    }
  }, [allSelected, groupIds, selectedRows, onSelectRow]);

  const { primary } = config.getDisplay(group);

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1.25,
          px: 0.25,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: "flex" }}>
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={handleGroupSelectAll}
            sx={{
              p: 0,
              mr: 0.5,
              color: "text.disabled",
              "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "text.primary" },
            }}
          />
        </Box>

        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: group.noGroup ? "text.disabled" : "text.primary",
            fontStyle: group.noGroup ? "italic" : "normal",
            fontVariantNumeric: config.sortType === "numeric" ? "tabular-nums" : "normal",
            ...labelFontStyle,
          }}
        >
          {group.noGroup ? config.noGroupLabel : primary || "—"}
        </Typography>

        <Typography
          sx={{
            fontSize: 11,
            color: "text.disabled",
            fontVariantNumeric: "tabular-nums",
            ...labelFontStyle,
          }}
        >
          {liveRows.length}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <KeyboardArrowDownIcon
          sx={{
            fontSize: 17,
            color: "text.disabled",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ pb: 1 }}>
          <BatchEditCardList
            columns={columns}
            data={liveRows}
            selectedRows={selectedRows}
            onSelectRow={onSelectRow}
            onSelectAll={handleGroupSelectAll}
            onCellUpdate={onCellUpdate}
            getLabel={getLabel}
            labelFontStyle={labelFontStyle}
            hideSortBar
            preserveOrder
          />
        </Box>
      </Collapse>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function BatchGroupList({
  config,
  rows = [],
  commitSignal = 0,
  labelFontStyle = {},
  columns = [],
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  onCellUpdate,
  getLabel,
  isCn = false,
  search = "",
  sortSpec = null,
}) {
  // ── Freeze mechanism ─────────────────────────────────────────────────────
  const [committedRows, setCommittedRows] = useState(() => rows);
  // Re-freeze when the row *set* changes (add / delete / save) so a new row
  // can never vanish from the grouped view and deleted rows leave no empty
  // groups. Editing values alone keeps the same key → structure stays put.
  const rowIdsKey = useMemo(
    () => rows.map((r) => String(r.id)).sort().join("|"),
    [rows]
  );
  useEffect(() => {
    setCommittedRows(rows);
  }, [commitSignal, rowIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const frozenGroups = useMemo(
    () => buildGroups(committedRows, config),
    [committedRows, config]
  );
  // Grouped is the only view the pages expose. Flat stays as an automatic
  // fallback for datasets with no usable group values at all (otherwise the
  // list would render empty).
  const groupingAvailable = useMemo(() => hasUsableGroups(frozenGroups), [frozenGroups]);

  const liveRowMap = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const matchingIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const set = new Set();
    rows.forEach((row) => {
      const hit = config.canSearchRow
        ? config.canSearchRow(row, q)
        : defaultRowMatches(row, q, getLabel);
      if (hit) set.add(row.id);
    });
    return set;
  }, [rows, search, config, getLabel]);

  // Rows inside each group, ordered by the parent's ORDER BY choice.
  const filteredGroups = useMemo(() => {
    const sortedGroups = config.sortGroups(frozenGroups, config.sortDefaultDir);
    return sortedGroups.reduce((acc, group) => {
      let liveRows = group.rows.map((fr) => liveRowMap.get(fr.id) || fr);
      if (matchingIds) liveRows = liveRows.filter((row) => matchingIds.has(row.id));
      if (liveRows.length === 0 && !group.noGroup) return acc;
      acc.push({
        ...group,
        liveRows: sortSpec ? sortRowsBySpec(liveRows, sortSpec) : liveRows,
      });
      return acc;
    }, []);
  }, [frozenGroups, config, matchingIds, liveRowMap, sortSpec]);

  const filteredFlatRows = useMemo(() => {
    let ordered = sortSpec
      ? sortRowsBySpec(committedRows, sortSpec)
      : defaultSortRows(committedRows, config.sortDefaultDir, config, getLabel);
    ordered = ordered.map((fr) => liveRowMap.get(fr.id) || fr);
    if (matchingIds) ordered = ordered.filter((row) => matchingIds.has(row.id));
    return ordered;
  }, [committedRows, sortSpec, config, getLabel, matchingIds, liveRowMap]);

  const Empty = (
    <Box sx={{ textAlign: "center", py: 6, color: "text.disabled" }}>
      <Typography variant="body2" sx={{ fontSize: 11, ...labelFontStyle }}>
        {config.emptyLabel}
      </Typography>
    </Box>
  );

  return (
    <Box>
      {groupingAvailable ? (
        filteredGroups.length === 0 ? (
          Empty
        ) : (
          filteredGroups.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              config={config}
              labelFontStyle={labelFontStyle}
              columns={columns}
              selectedRows={selectedRows}
              onSelectRow={onSelectRow}
              onCellUpdate={onCellUpdate}
              getLabel={getLabel}
            />
          ))
        )
      ) : filteredFlatRows.length === 0 ? (
        Empty
      ) : (
        <BatchEditCardList
          columns={columns}
          data={filteredFlatRows}
          selectedRows={selectedRows}
          onSelectRow={onSelectRow}
          onSelectAll={onSelectAll}
          onCellUpdate={onCellUpdate}
          getLabel={getLabel}
          labelFontStyle={labelFontStyle}
          hideSortBar
          preserveOrder
        />
      )}
    </Box>
  );
}
