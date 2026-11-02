"use client";

import { useState } from "react";
import { deriveHourlyFuelCost } from "@/lib/fuel";

type AircraftFuelFieldsProps = {
  defaultBurn?: number;
  defaultPrice?: number;
  defaultTank?: number;
  defaultHangar?: number;
  // Costo carburante orario storico (usato quando consumo o prezzo non sono impostati)
  storedHourlyFuelCost?: number;
  // Se false (cassa comune disattivata) il costo €/h non viene mostrato
  showHourlyCost?: boolean;
};

const labelStyle = { fontSize: "0.8rem", marginBottom: "4px", display: "block" } as const;

export function AircraftFuelFields({
  defaultBurn = 0,
  defaultPrice = 0,
  defaultTank = 0,
  defaultHangar = 100,
  storedHourlyFuelCost = 0,
  showHourlyCost = true,
}: AircraftFuelFieldsProps) {
  const [burn, setBurn] = useState(String(defaultBurn));
  const [price, setPrice] = useState(String(defaultPrice));

  const burnNum = Number(burn.replace(",", "."));
  const priceNum = Number(price.replace(",", "."));
  const derived = deriveHourlyFuelCost(
    Number.isFinite(burnNum) ? burnNum : 0,
    Number.isFinite(priceNum) ? priceNum : 0
  );

  return (
    <div style={{ marginTop: "8px" }}>
      <label style={{ fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "12px" }}>
        Carburante
      </label>
      <div className="grid grid-3" style={{ gap: 16 }}>
        <div className="field">
          <label style={labelStyle}>Consumo (L/h)</label>
          <input
            className="input"
            name="fuelBurnLitersPerHour"
            type="number"
            step="0.1"
            min="0"
            max="200"
            value={burn}
            onChange={(e) => setBurn(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label style={labelStyle}>Prezzo carburante (€/L)</label>
          <input
            className="input"
            name="fuelPricePerLiter"
            type="number"
            step="0.001"
            min="0"
            max="100"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        {showHourlyCost && (
          <div className="field">
            <label style={labelStyle}>Costo benzina (€/h, calcolato)</label>
            <input
              className="input"
              type="text"
              readOnly
              value={(derived ?? storedHourlyFuelCost).toFixed(2)}
              title={
                derived !== null
                  ? "Consumo × prezzo carburante"
                  : "Valore storico: imposta consumo e prezzo per calcolarlo automaticamente"
              }
            />
          </div>
        )}
        <div className="field">
          <label style={labelStyle}>Capacità serbatoio aereo (L, 0 = non impostata)</label>
          <input
            className="input"
            name="tankCapacityLiters"
            type="number"
            step="0.1"
            min="0"
            max="1000"
            defaultValue={defaultTank}
            required
          />
        </div>
        <div className="field">
          <label style={labelStyle}>Capacità hangar (L)</label>
          <input
            className="input"
            name="hangarCapacityLiters"
            type="number"
            step="0.1"
            min="0"
            max="10000"
            defaultValue={defaultHangar}
            required
          />
        </div>
      </div>
      {showHourlyCost && derived === null && (
        <div className="muted" style={{ fontSize: "0.8rem", marginTop: 8 }}>
          Con consumo e prezzo impostati il costo benzina orario viene calcolato in automatico; finché uno dei due è 0 resta il valore storico.
        </div>
      )}
    </div>
  );
}
