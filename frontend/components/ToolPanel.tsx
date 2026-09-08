"use client";

import type { HerramientaTrazo } from "@shared/types";
import type { TipoForma } from "@/lib/types";

interface Props {
  color: string;
  onColorChange: (c: string) => void;
  grosor: number;
  onGrosorChange: (g: number) => void;
  herramienta: HerramientaTrazo;
  onHerramientaChange: (h: HerramientaTrazo) => void;
  tipoForma: TipoForma;
  onTipoFormaChange: (f: TipoForma) => void;
}

const HERRAMIENTAS: { id: HerramientaTrazo; etiqueta: string }[] = [
  { id: "pincel", etiqueta: "Pincel" },
  { id: "borrador", etiqueta: "Borrador" },
  { id: "texto", etiqueta: "Texto" },
  { id: "forma", etiqueta: "Forma" },
  { id: "mano", etiqueta: "✋ Mano" },
];

const FORMAS: { id: TipoForma; etiqueta: string }[] = [
  { id: "rectangulo", etiqueta: "▭ Rectángulo" },
  { id: "circulo", etiqueta: "○ Círculo" },
  { id: "linea", etiqueta: "／ Línea" },
  { id: "flecha", etiqueta: "→ Flecha" },
];

export default function ToolPanel({
  color,
  onColorChange,
  grosor,
  onGrosorChange,
  herramienta,
  onHerramientaChange,
  tipoForma,
  onTipoFormaChange,
}: Props) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 12,
          padding: "10px 18px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {HERRAMIENTAS.map((h) => (
            <button
              key={h.id}
              onClick={() => onHerramientaChange(h.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: herramienta === h.id ? "#111" : "#eee",
                color: herramienta === h.id ? "#fff" : "#111",
                fontSize: 13,
              }}
            >
              {h.etiqueta}
            </button>
          ))}
        </div>

        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          style={{ width: 32, height: 32, border: "none", cursor: "pointer" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range"
            min={1}
            max={80}
            value={grosor}
            onChange={(e) => onGrosorChange(Number(e.target.value))}
          />
          <span style={{ fontSize: 12, width: 28, textAlign: "right" }}>{grosor}px</span>
        </div>
      </div>

      {herramienta === "forma" && (
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "rgba(255,255,255,0.95)",
            borderRadius: 10,
            padding: "6px 10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          }}
        >
          {FORMAS.map((f) => (
            <button
              key={f.id}
              onClick={() => onTipoFormaChange(f.id)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: tipoForma === f.id ? "#111" : "#eee",
                color: tipoForma === f.id ? "#fff" : "#111",
                fontSize: 12,
              }}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
