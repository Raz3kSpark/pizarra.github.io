"use client";

import Canvas from "@/components/Canvas";
import ToolPanel from "@/components/ToolPanel";
import { useState } from "react";
import type { HerramientaTrazo } from "@shared/types";
import type { TipoForma } from "@/lib/types";

export default function Home() {
  const [color, setColor] = useState("#111111");
  const [grosor, setGrosor] = useState(4);
  const [herramienta, setHerramienta] = useState<HerramientaTrazo>("pincel");
  const [tipoForma, setTipoForma] = useState<TipoForma>("rectangulo");

  return (
    <main style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas color={color} grosor={grosor} herramienta={herramienta} tipoForma={tipoForma} />
      <ToolPanel
        color={color}
        onColorChange={setColor}
        grosor={grosor}
        onGrosorChange={setGrosor}
        herramienta={herramienta}
        onHerramientaChange={setHerramienta}
        tipoForma={tipoForma}
        onTipoFormaChange={setTipoForma}
      />
    </main>
  );
}
