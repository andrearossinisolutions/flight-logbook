"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatGpxDateAndClock } from "@/lib/gpx";
import type { MapGpxPointInfo } from "./flight-map-inner";

interface GpxProfilePanelProps {
  details: MapGpxPointInfo[];
  /** Formato "data · PARTENZA → ARRIVO" (opzionale) */
  label?: string;
  dep?: string;
  arr?: string;
  onHoverIndex: (index: number | null) => void;
  onClose: () => void;
}

const M_TO_NM = 1 / 1852;
const M_TO_FT = 3.28084;
const MARGIN = { left: 48, right: 16, top: 8, bottom: 24 };

function niceStep(rangeFt: number, targetTicks: number): number {
  const steps = [500, 1000, 2000, 5000, 10000];
  for (const s of steps) if (rangeFt / s <= targetTicks) return s;
  return 10000;
}

export default function GpxProfilePanel({ details, label, dep, arr, onHoverIndex, onClose }: GpxProfilePanelProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      setWidth(Math.max(200, el.clientWidth));
      setHeight(Math.max(80, el.clientHeight));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Chiude l'eventuale pallino sulla mappa allo smontaggio
  useEffect(() => () => onHoverIndex(null), [onHoverIndex]);

  const chart = useMemo(() => {
    const valid: number[] = [];
    details.forEach((p, i) => {
      if (p.ele !== null && Number.isFinite(p.d)) valid.push(i);
    });
    if (valid.length < 2) return null;
    let minFt = Infinity;
    let maxFt = -Infinity;
    for (const i of valid) {
      const ft = details[i].ele! * M_TO_FT;
      if (ft < minFt) minFt = ft;
      if (ft > maxFt) maxFt = ft;
    }
    const step = niceStep(Math.max(maxFt - minFt, 500), 5);
    let yMin = Math.floor(minFt / step) * step;
    let yMax = Math.ceil(maxFt / step) * step;
    if (yMax - yMin < step) yMax = yMin + step;
    if (yMin === yMax) yMin -= step;
    const dMax = Math.max(details[valid[valid.length - 1]].d, 1);
    const ticks: number[] = [];
    for (let v = yMin; v <= yMax; v += step) ticks.push(v);
    return { valid, yMin, yMax, dMax, ticks };
  }, [details]);

  const w = width ?? 0;
  const plotW = Math.max(50, w - MARGIN.left - MARGIN.right);
  const plotH = Math.max(40, height - MARGIN.top - MARGIN.bottom);

  const xOf = (d: number) => MARGIN.left + (chart ? (d / chart.dMax) * plotW : 0);
  const yOf = (ft: number) =>
    chart ? MARGIN.top + plotH - ((ft - chart.yMin) / (chart.yMax - chart.yMin)) * plotH : 0;

  const setIndex = (i: number | null) => {
    setActive(i);
    onHoverIndex(i);
  };

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!chart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const d = ((e.clientX - rect.left - MARGIN.left) / plotW) * chart.dMax;
    let best = chart.valid[0];
    let bestDiff = Infinity;
    for (const i of chart.valid) {
      const diff = Math.abs(details[i].d - d);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    setIndex(best);
  };

  let linePath = "";
  let areaPath = "";
  if (chart) {
    const pts = chart.valid.map((i) => `${xOf(details[i].d).toFixed(1)},${yOf(details[i].ele! * M_TO_FT).toFixed(1)}`);
    linePath = `M${pts.join("L")}`;
    const baseY = (MARGIN.top + plotH).toFixed(1);
    areaPath = `${linePath}L${xOf(details[chart.valid[chart.valid.length - 1]].d).toFixed(1)},${baseY}L${xOf(details[chart.valid[0]].d).toFixed(1)},${baseY}Z`;
  }

  const xTicks: number[] = [];
  if (chart) {
    const nmMax = chart.dMax * M_TO_NM;
    const step = nmMax <= 10 ? 2 : nmMax <= 30 ? 5 : nmMax <= 80 ? 10 : nmMax <= 200 ? 25 : 50;
    for (let v = step; v < nmMax; v += step) xTicks.push(v);
  }

  const info = active !== null ? details[active] : null;
  const infoParts: string[] = [];
  if (info) {
    if (info.t !== null) {
      const { date, clock } = formatGpxDateAndClock(info.t);
      infoParts.push(`${date} ${clock}`);
    }
    infoParts.push(`${(info.d * M_TO_NM).toLocaleString("it-IT", { maximumFractionDigits: 1 })} nm`);
    if (info.ele !== null) infoParts.push(`${Math.round(info.ele * M_TO_FT).toLocaleString("it-IT")} ft`);
    if (info.gs !== null) infoParts.push(`GS ${Math.round(info.gs * 3.6).toLocaleString("it-IT")} km/h`);
  }

  return (
    <div
      className="gpx-profile-panel"
      style={{
        position: "relative",
        flex: "none",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: "#eaf4fb",
        borderTop: "2px solid #1d4e89",
        userSelect: "none",
        zIndex: 1,
      }}
    >
      <div style={{ padding: "6px 52px 0 12px", fontSize: 12, color: "#142033", flex: "none" }}>
        <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minHeight: 16 }}>
          {label ?? "\u00a0"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 10, minHeight: 16 }}>
          {infoParts.length > 0 ? infoParts.map((t, i) => <span key={i}>{t}</span>) : "\u00a0"}
        </div>
      </div>
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>
      {width === null ? null : !chart ? (
        <div style={{ padding: "8px 52px 8px 12px", fontSize: "0.9rem", color: "#142033" }}>
          Quota non disponibile in questa traccia
        </div>
      ) : (
        <svg
          width={w}
          height={height}
          style={{ display: "block", touchAction: "none", cursor: "crosshair" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handlePointer(e);
          }}
          onPointerMove={handlePointer}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setIndex(null);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse") setIndex(null);
          }}
          onPointerCancel={() => setIndex(null)}
        >
          {chart.ticks.map((v) => (
            <g key={`y${v}`}>
              <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={yOf(v)} y2={yOf(v)} stroke="#9bb8d3" strokeWidth={1} />
              <text x={MARGIN.left - 6} y={yOf(v) + 4} fontSize={11} textAnchor="end" fill="#35506b">
                {v.toLocaleString("it-IT")}
              </text>
            </g>
          ))}
          {xTicks.map((v) => (
            <g key={`x${v}`}>
              <line x1={xOf(v / M_TO_NM)} x2={xOf(v / M_TO_NM)} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="#9bb8d3" strokeWidth={1} strokeDasharray="2 3" />
              <text x={xOf(v / M_TO_NM)} y={height - 8} fontSize={11} textAnchor="middle" fill="#35506b">
                {v}
              </text>
            </g>
          ))}
          <text x={w - MARGIN.right} y={height - 8} fontSize={11} textAnchor="end" fill="#35506b">
            nm
          </text>
          <text x={4} y={11} fontSize={11} fill="#35506b">
            ft
          </text>
          <path d={areaPath} fill="rgba(29, 78, 137, 0.25)" stroke="none" />
          <path d={linePath} fill="none" stroke="#1d4e89" strokeWidth={2} strokeLinejoin="round" />
          {dep && arr && (
            <>
              <MarkerLabel x={xOf(details[chart.valid[0]].d)} y={yOf(details[chart.valid[0]].ele! * M_TO_FT)} text={dep} anchor="start" />
              <MarkerLabel
                x={xOf(details[chart.valid[chart.valid.length - 1]].d)}
                y={yOf(details[chart.valid[chart.valid.length - 1]].ele! * M_TO_FT)}
                text={arr}
                anchor="end"
              />
            </>
          )}
          {info && info.ele !== null && (
            <g pointerEvents="none">
              <line x1={xOf(info.d)} x2={xOf(info.d)} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="#e6007e" strokeWidth={1} />
              <circle cx={xOf(info.d)} cy={yOf(info.ele * M_TO_FT)} r={4} fill="#e6007e" stroke="#fff" strokeWidth={1.5} />
            </g>
          )}
        </svg>
      )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi profilo"
        title="Chiudi (Esc)"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 44,
          height: 44,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            display: "block",
            width: 28,
            height: 24,
            background: "#e53935",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            lineHeight: "24px",
            textAlign: "center",
          }}
        >
          X
        </span>
      </button>
    </div>
  );
}

function MarkerLabel({ x, y, text, anchor }: { x: number; y: number; text: string; anchor: "start" | "end" }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={4} fill="#fff" stroke="#1d4e89" strokeWidth={2} />
      <text x={anchor === "start" ? x + 6 : x - 6} y={y - 8} fontSize={11} fontWeight={700} textAnchor={anchor} fill="#142033">
        {text}
      </text>
    </g>
  );
}
