"use client";

import { Children, ReactNode, useMemo, useState, useEffect } from "react";

type DashboardWidgetsProps = {
  children: ReactNode;
};

export function DashboardWidgets({ children }: DashboardWidgetsProps) {
  const originalItems = useMemo(() => Children.toArray(children), [children]);
  const [items, setItems] = useState(originalItems);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Sync with original items if they change
  useEffect(() => {
    setItems(originalItems);
  }, [originalItems]);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sync items back to original order when expanded
  useEffect(() => {
    if (isExpanded) {
      setItems(originalItems);
    }
  }, [isExpanded, originalItems]);

  const limit = isMobile ? 2 : 4;
  const hasHiddenItems = originalItems.length > limit;

  // Auto-slide interval
  useEffect(() => {
    if (isExpanded) return;
    if (originalItems.length <= limit) return;
    if (isHovered) return;

    const interval = setInterval(() => {
      setIsSliding(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [isExpanded, isMobile, originalItems.length, isHovered, limit]);

  // Slide transition duration timer
  useEffect(() => {
    if (!isSliding) return;

    const timer = setTimeout(() => {
      setItems((prev) => {
        const next = [...prev];
        const first = next.shift();
        if (first) {
          next.push(first);
        }
        return next;
      });
      setIsSliding(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [isSliding]);

  return (
    <>
      <div
        className={"dashboard-widgets" + (isExpanded ? " is-expanded" : "")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={
            "dashboard-widgets-inner" +
            (isExpanded ? " summary-grid" : "") +
            (isSliding ? " is-sliding" : "")
          }
        >
          {items.map((item, index) => {
            const itemKey = (item as any)?.key ?? index;
            return (
              <div key={itemKey} className="dashboard-widget-item">
                {item}
              </div>
            );
          })}
        </div>
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
