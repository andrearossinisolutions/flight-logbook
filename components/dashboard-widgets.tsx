"use client";

import { Children, ReactNode, useMemo, useState } from "react";

type DashboardWidgetsProps = {
  children: ReactNode;
  initiallyVisible?: number;
};

export function DashboardWidgets({
  children,
  initiallyVisible = 4,
}: DashboardWidgetsProps) {
  const items = useMemo(() => Children.toArray(children), [children]);
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleItems = isExpanded ? items : items.slice(0, initiallyVisible);
  const hasHiddenItems = items.length > initiallyVisible;

  return (
    <>
      <div className="summary-grid" style={{ marginBottom: 16 }}>
        {visibleItems}
      </div>

      {hasHiddenItems ? (
        <div className="row" style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? "Compatta widget" : "Mostra tutti i widget"}
          </button>
        </div>
      ) : null}
    </>
  );
}
