"use client";

import { Children, ReactNode, useMemo, useState } from "react";

type DashboardWidgetsProps = {
  children: ReactNode;
};

export function DashboardWidgets({ children }: DashboardWidgetsProps) {
  const items = useMemo(() => Children.toArray(children), [children]);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHiddenItems = items.length > 4;

  return (
    <>
      <div
        className={"summary-grid dashboard-widgets" + (isExpanded ? " is-expanded" : "")}
        style={{ marginBottom: 16 }}
      >
        {items.map((item, index) => (
          <div key={index} className="dashboard-widget-item">
            {item}
          </div>
        ))}
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
