"use client";

import { useEffect, useState } from "react";
import type { Votacion } from "@shared/types";

interface Props {
  votacion: Votacion;
  onVotar: (valor: boolean) => void;
  onCerrar: () => void;
}

// Toast no invasivo, esquina inferior derecha. Se auto-cierra si el usuario
// no interactúa, para no ser molesto.
export default function VotePopup({ votacion, onVotar, onCerrar }: Props) {
  const [segundosRestantes, setSegundosRestantes] = useState(15);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundosRestantes((s) => {
        if (s <= 1) {
          clearInterval(intervalo);
          onCerrar();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [onCerrar]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        maxWidth: 300,
        background: "#1c1c1e",
        color: "#fff",
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        zIndex: 20,
        fontSize: 13,
      }}
    >
      <p style={{ marginBottom: 10 }}>
        Alguien propuso eliminar un dibujo. ¿Qué opinas?
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onVotar(true)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 8,
            border: "none",
            background: "#e5484d",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Sí, borrar
        </button>
        <button
          onClick={() => onVotar(false)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 8,
            border: "none",
            background: "#3a3a3c",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          No
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
        Se cierra en {segundosRestantes}s · {votacion.votosSi} sí / {votacion.votosNo} no
      </div>
    </div>
  );
}
