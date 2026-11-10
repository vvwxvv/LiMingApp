import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";

/**
 * BatchEditActions
 *
 * Quiet uppercase text buttons on transparent backgrounds, one hairline
 * outline each. On hover a button goes pure black + bold and an underline
 * wipes in from the left.
 *
 * The bold label is stacked in the same grid cell as the normal one (and
 * hidden), so the button reserves the bold width up-front — the text can
 * never reflow / "shake" when the hover weight kicks in.
 */
export function BatchEditActions({
  hasChanges,
  isSaving,
  selectedRows = [],
  onSave,
  onAdd,
  onDelete,
  onDownloadCSV,
  getLabel,
  labelFontStyle = {},
}) {
  const base = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 30,
    px: "14px",
    background: "none",
    backgroundColor: "transparent",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 0,
    color: "text.secondary",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease",
    userSelect: "none",
    // underline wipe (covers the bottom hairline when fully extended)
    "&::after": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -1,
      height: 2,
      backgroundColor: "currentColor",
      transform: "scaleX(0)",
      transformOrigin: "left center",
      transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
      pointerEvents: "none",
    },
    "&:hover::after, &:focus-visible::after": { transform: "scaleX(1)" },
    ...labelFontStyle,
  };

  const actions = [
    {
      key: "save",
      label: isSaving ? getLabel("saving") : getLabel("save"),
      onClick: onSave,
      disabled: !hasChanges || isSaving,
      primary: true,
    },
    {
      key: "add",
      label: getLabel("addRow"),
      onClick: onAdd,
    },
    {
      key: "delete",
      label:
        selectedRows.length > 0
          ? `${getLabel("deleteSelected")} (${selectedRows.length})`
          : getLabel("deleteSelected"),
      onClick: onDelete,
      disabled: selectedRows.length === 0,
      danger: true,
    },
    {
      key: "export",
      label: getLabel("exportData"),
      onClick: onDownloadCSV,
    },
  ];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      {actions.map((action) => (
        <Box
          key={action.key}
          component="button"
          type="button"
          onClick={action.disabled ? undefined : action.onClick}
          disabled={action.disabled}
          aria-disabled={action.disabled}
          sx={{
            ...base,
            opacity: action.disabled ? 0.3 : 1,
            cursor: action.disabled ? "default" : "pointer",
            borderColor: action.primary && !action.disabled ? "text.primary" : "divider",
            ...(action.primary && !action.disabled ? { color: "text.primary" } : null),
            ...(action.danger ? { "&:hover": { color: "#c0392b" } } : null),
            "&:hover:not([disabled])": {
              color: action.danger ? "#c0392b" : "text.primary",
              borderColor: action.danger ? "#c0392b" : "text.primary",
            },
            "&:hover .batch-action-label": { fontWeight: 700 },
          }}
        >
          {/* normal + hidden bold label stacked in one grid cell: no reflow */}
          <Box component="span" sx={{ display: "inline-grid", gridTemplateAreas: "'a'" }}>
            <Box
              component="span"
              className="batch-action-label"
              sx={{ gridArea: "a", fontWeight: 500 }}
            >
              {action.label}
            </Box>
            <Box
              component="span"
              aria-hidden
              sx={{ gridArea: "a", fontWeight: 700, visibility: "hidden" }}
            >
              {action.label}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

BatchEditActions.propTypes = {
  hasChanges: PropTypes.bool,
  isSaving: PropTypes.bool,
  selectedRows: PropTypes.array,
  processedData: PropTypes.array,
  onSave: PropTypes.func,
  onAdd: PropTypes.func,
  onDelete: PropTypes.func,
  onDownloadCSV: PropTypes.func,
  getLabel: PropTypes.func.isRequired,
  labelFontStyle: PropTypes.object,
};

export default BatchEditActions;
