import type { ReactNode } from "react";

type ProgressBarProps = {
  /** Percentuale della parte piena (0-100). */
  percent: number;
  /** Etichetta dentro la parte piena (bianca), mostrata se la percentuale supera `minLabelPercent`. */
  innerLabel: ReactNode;
  /** Etichetta nella parte vuota a destra (grigia). */
  outerLabel: ReactNode;
  /** Colore della parte piena. */
  color: string;
  /** Parte piena più chiara e tratteggiata (valore stimato). */
  striped?: boolean;
  minLabelPercent?: number;
  /** Con percentuale sotto la soglia, mostra comunque l'etichetta interna fuori dalla parte piena. */
  showInnerLabelWhenSmall?: boolean;
};

export function ProgressBar({
  percent,
  innerLabel,
  outerLabel,
  color,
  striped = false,
  minLabelPercent = 12,
  showInnerLabelWhenSmall = false,
}: ProgressBarProps) {
  const small = percent <= minLabelPercent;
  return (
    <div
      style={{
        position: "relative",
        height: 32,
        borderRadius: 10,
        background: "var(--bg, #f6f8fb)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${percent}%`,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 8,
          transition: "width 0.3s",
          ...(striped
            ? {
                opacity: 0.55,
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0, rgba(255,255,255,0.35) 6px, transparent 6px, transparent 12px)",
              }
            : {}),
        }}
      >
        {!small && (
          <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>{innerLabel}</span>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: `${percent}%`,
          top: 0,
          bottom: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          gap: 8,
          overflow: "hidden",
        }}
      >
        {small && showInnerLabelWhenSmall && (
          <span style={{ color: "var(--text)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>{innerLabel}</span>
        )}
        <span style={{ color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>{outerLabel}</span>
      </div>
    </div>
  );
}
