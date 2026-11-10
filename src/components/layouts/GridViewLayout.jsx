"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * GridViewLayout - reusable card list.
 *
 * With `minColumnWidth`, it renders a **flex-column masonry** layout:
 *   - column count is computed from the container width and card width;
 *   - cards are distributed across ALL columns, so a smaller card size never
 *     leaves an empty right-hand strip;
 *   - each column stacks independently, so cards keep their natural height
 *     and no row is forced to the tallest card.
 *
 * Without `minColumnWidth`, it keeps the original responsive grid.
 */
const GAP = 24;

const GridViewLayout = ({
  data = [],
  Component,
  componentProps = {},
  gridClassName = '',
  style = {},
  minColumnWidth = null,
  masonry = true,
}) => {
  const width = Number(minColumnWidth);
  const useFluid = Number.isFinite(width) && width > 0;
  const containerRef = useRef(null);
  const [columnCount, setColumnCount] = useState(1);

  useLayoutEffect(() => {
    if (!useFluid || !masonry) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const update = () => {
      const available = el.clientWidth;
      const fit = Math.max(
        1,
        Math.round((available + GAP) / (Math.round(width) + GAP))
      );
      // Do not leave an empty trailing column when the group has fewer cards.
      const next = Math.min(Math.max(1, data.length || 1), fit);
      setColumnCount((current) => (current === next ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [useFluid, masonry, width, data.length]);

  const columns = useMemo(() => {
    const count = Math.max(1, columnCount);
    const next = Array.from({ length: count }, () => []);
    data.forEach((item, index) => next[index % count].push(item));
    return next;
  }, [data, columnCount]);

  if (useFluid && masonry) {
    return (
      <div
        ref={containerRef}
        className={gridClassName}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: GAP,
          ...style,
        }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={`masonry-col-${columnIndex}`}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: GAP,
            }}
          >
            {column.map((item, index) => {
              const key = item._id || item.id || index;
              // `order` is a JSON object on Artwork/Image — never pass it as a
              // scalar prop. (String-order collections keep their value.)
              const orderNumber =
                item?.order && typeof item.order === "object"
                  ? undefined
                  : item?.order;
              return (
                <Component
                  key={key}
                  item={item}
                  orderNumber={orderNumber}
                  {...componentProps}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${gridClassName}`}
      style={
        useFluid
          ? {
              gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(width)}px, 1fr))`,
              ...style,
            }
          : style
      }
    >
      {data.map((item, idx) => {
        const orderNumber =
          item?.order && typeof item.order === "object" ? undefined : item?.order;
        return (
          <Component
            key={item._id || idx}
            item={item}
            orderNumber={orderNumber}
            {...componentProps}
          />
        );
      })}
    </div>
  );
};

export default GridViewLayout;
