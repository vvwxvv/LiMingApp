"use client";

/**
 * BatchDropdown.jsx
 *
 * The manager pages use a small, quiet control: an uppercase caption followed
 * by an underlined value + caret (e.g. "ORDER BY  Year ▾"). This is the same
 * control, extracted so the batch-edit toolbar can reuse it instead of
 * inventing pill buttons.
 *
 * No filled surfaces — only a hairline underline, per the batch-edit look.
 */

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

export default function BatchDropdown({
  label,
  value,
  options = [],
  onChange,
  width = 96,
  labelFontStyle = {},
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current =
    options.find((o) => o.value === value) || options[0] || null;

  if (!options.length) return null;

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
      {label ? (
        <Typography
          component="span"
          sx={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "text.secondary",
            whiteSpace: "nowrap",
            ...labelFontStyle,
          }}
        >
          {label}
        </Typography>
      ) : null}

      <Box ref={ref} sx={{ position: "relative", display: "inline-block" }}>
        <Box
          component="button"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            background: "none",
            border: "none",
            p: 0,
            cursor: "pointer",
            color: "text.primary",
            fontFamily: "inherit",
            "&:hover .batch-dd-value, &:focus-visible .batch-dd-value": { fontWeight: 700 },
            "&:hover .batch-dd-value::after, &:focus-visible .batch-dd-value::after": {
              transform: "scaleX(1)",
            },
          }}
        >
          <Box
            component="span"
            className="batch-dd-value"
            sx={{
              position: "relative",
              display: "inline-block",
              minWidth: width,
              maxWidth: width,
              textAlign: "left",
              fontSize: 11,
              fontWeight: 500,
              pb: "3px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              borderBottom: "1px solid",
              borderColor: "text.primary",
              transition: "font-weight 0.05s linear",
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
              ...labelFontStyle,
            }}
          >
            {current?.label ?? ""}
          </Box>
          <Box
            component="span"
            aria-hidden
            sx={{
              fontSize: 9,
              lineHeight: 1,
              transition: "transform 0.15s ease",
              transform: open ? "rotate(180deg)" : "none",
            }}
          >
            ▾
          </Box>
        </Box>

        {open && (
          <Box
            role="listbox"
            sx={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 1300,
              minWidth: 150,
              py: 0.5,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderLeft: "2px solid",
              borderLeftColor: "text.primary",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            }}
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Box
                  key={option.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                  sx={{
                    px: 1.5,
                    py: 0.7,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: active ? 600 : 400,
                    color: active ? "text.primary" : "text.secondary",
                    whiteSpace: "nowrap",
                    "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                    ...labelFontStyle,
                  }}
                >
                  {option.label}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
