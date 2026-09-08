"use client";

import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text, TextStyle } from "pixi.js";
import {
  CHUNK_SIZE,
  coordenadaAChunk,
  type HerramientaTrazo,
  type Punto,
  type Trazo,
  type TipoForma,
} from "@shared/types";
import { obtenerSocket } from "@/lib/socket";
import { obtenerAutorAnonId } from "@/lib/anon";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 6;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

function cursorParaHerramienta(herramienta: HerramientaTrazo, grosor: number, color: string) {
  if (herramienta === "texto") return "text";
  if (herramienta === "forma") return "crosshair";
  if (herramienta === "mano") return "grab";

  const radio = Math.max(grosor / 2, 1);
  const tam = radio * 2 + 2;
  const colorAro = herramienta === "borrador" ? "#999" : color;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tam}' height='${tam}'>
    <circle cx='${tam / 2}' cy='${tam / 2}' r='${radio}' fill='none' stroke='${colorAro}' stroke-width='1.5'/>
  </svg>`;
  const url = `data:image/svg+xml;base64,${btoa(svg)}`;
  return `url("${url}") ${tam / 2} ${tam / 2}, crosshair`;
}

// Dibuja una forma (rectángulo, círculo, línea o flecha) entre dos puntos.
// La usan tanto la previsualización en vivo como el render final/guardado.
function trazarForma(g: Graphics, tipoForma: TipoForma, inicio: Punto, actual: Punto, grosor: number, color: string) {
  const dx = actual.x - inicio.x;
  const dy = actual.y - inicio.y;

  if (tipoForma === "rectangulo") {
    g.rect(Math.min(inicio.x, actual.x), Math.min(inicio.y, actual.y), Math.abs(dx), Math.abs(dy));
    g.stroke({ width: grosor, color, join: "round" });
  } else if (tipoForma === "circulo") {
    const radio = Math.sqrt(dx * dx + dy * dy);
    g.circle(inicio.x, inicio.y, radio);
    g.stroke({ width: grosor, color });
  } else if (tipoForma === "linea") {
    g.moveTo(inicio.x, inicio.y);
    g.lineTo(actual.x, actual.y);
    g.stroke({ width: grosor, color, cap: "round" });
  } else if (tipoForma === "flecha") {
    g.moveTo(inicio.x, inicio.y);
    g.lineTo(actual.x, actual.y);
    g.stroke({ width: grosor, color, cap: "round" });

    const angulo = Math.atan2(dy, dx);
    const tamPunta = Math.max(grosor * 3, 10);
    const p1x = actual.x - tamPunta * Math.cos(angulo - Math.PI / 6);
    const p1y = actual.y - tamPunta * Math.sin(angulo - Math.PI / 6);
    const p2x = actual.x - tamPunta * Math.cos(angulo + Math.PI / 6);
    const p2y = actual.y - tamPunta * Math.sin(angulo + Math.PI / 6);

    g.moveTo(actual.x, actual.y);
    g.lineTo(p1x, p1y);
    g.moveTo(actual.x, actual.y);
    g.lineTo(p2x, p2y);
    g.stroke({ width: grosor, color, cap: "round" });
  }
}

interface Props {
  color: string;
  grosor: number;
  herramienta: HerramientaTrazo;
  tipoForma: TipoForma;
}

export default function Canvas({ color, grosor, herramienta, tipoForma }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gridRef = useRef<Graphics | null>(null);
  const objetosPorTrazoRef = useRef<Map<string, Graphics | Text>>(new Map());
  const autorIdRef = useRef<string>("");

  const dibujandoRef = useRef(false);
  const puntosActualesRef = useRef<Punto[]>([]);
  const graficoActualRef = useRef<Graphics | null>(null);
  const inicioFormaRef = useRef<Punto | null>(null);
  const puntoFinalFormaRef = useRef<Punto | null>(null);
  const inputTextoRef = useRef<HTMLInputElement | null>(null);

  const panEnCursoRef = useRef(false);
  const panInicioRef = useRef<{ x: number; y: number; stageX: number; stageY: number } | null>(null);

  const controlesZoomRef = useRef<{ acercar: () => void; alejar: () => void; restablecer: () => void }>({
    acercar: () => {},
    alejar: () => {},
    restablecer: () => {},
  });

  const [zoomPorcentaje, setZoomPorcentaje] = useState(100);
  const [conectado, setConectado] = useState(false);

  // --- Inicializa la app de PixiJS (una sola vez) ---
  useEffect(() => {
    if (!contenedorRef.current) return;
    autorIdRef.current = obtenerAutorAnonId();

    const app = new Application();
    let montado = true;

    app
      .init({ resizeTo: window, backgroundColor: 0xffffff, antialias: true })
      .then(() => {
        if (!montado || !contenedorRef.current) return;
        contenedorRef.current.appendChild(app.canvas);

        const grid = new Graphics();
        app.stage.addChildAt(grid, 0);
        gridRef.current = grid;

        appRef.current = app;
      });

    return () => {
      montado = false;
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
      gridRef.current = null;
    };
  }, []);

  // --- Conecta al backend: carga el historial y escucha trazos nuevos ---
  useEffect(() => {
    let cancelado = false;

    const esperarApp = setInterval(() => {
      if (!appRef.current || cancelado) return;
      clearInterval(esperarApp);

      const app = appRef.current;

      const renderizarTrazo = (trazo: Trazo) => {
        if (objetosPorTrazoRef.current.has(trazo.id)) return;

        if (trazo.herramienta === "texto") {
          const estilo = new TextStyle({ fill: trazo.color, fontSize: Math.max(trazo.grosor * 4, 14), fontFamily: "system-ui, sans-serif" });
          const texto = new Text({ text: trazo.texto ?? "", style: estilo });
          const p = trazo.puntos[0];
          if (p) {
            texto.x = p.x;
            texto.y = p.y;
          }
          app.stage.addChild(texto);
          objetosPorTrazoRef.current.set(trazo.id, texto);
          return;
        }

        const g = new Graphics();
        if (trazo.herramienta === "forma" && trazo.tipoForma && trazo.puntos.length >= 2) {
          trazarForma(g, trazo.tipoForma, trazo.puntos[0], trazo.puntos[1], trazo.grosor, trazo.color);
        } else if (trazo.puntos.length > 0) {
          g.moveTo(trazo.puntos[0].x, trazo.puntos[0].y);
          for (const p of trazo.puntos.slice(1)) g.lineTo(p.x, p.y);
          g.stroke({ width: trazo.grosor, color: trazo.color, cap: "round", join: "round" });
        }
        app.stage.addChild(g);
        objetosPorTrazoRef.current.set(trazo.id, g);
      };

      // Carga todo lo que ya se dibujó antes de que entráramos.
      fetch(`${BACKEND_URL}/api/trazos`)
        .then((r) => r.json())
        .then((trazos: Trazo[]) => {
          if (cancelado) return;
          trazos.forEach(renderizarTrazo);
        })
        .catch((err) => console.error("No se pudo cargar el historial:", err));

      const socket = obtenerSocket();
      setConectado(socket.connected);
      socket.on("connect", () => setConectado(true));
      socket.on("disconnect", () => setConectado(false));
      socket.on("trazo:nuevo", (trazo: Trazo) => {
        // El propio autor ya ve su trazo en vivo mientras dibuja; evitamos
        // redibujarlo cuando el servidor lo confirma de vuelta, solo lo
        // "recatalogamos" bajo su id real por si hace falta borrarlo luego.
        if (trazo.autorAnonId === autorIdRef.current) {
          const pendiente = objetosPorTrazoRef.current.get("__pendiente__");
          if (pendiente) {
            objetosPorTrazoRef.current.set(trazo.id, pendiente);
            objetosPorTrazoRef.current.delete("__pendiente__");
          }
          return;
        }
        renderizarTrazo(trazo);
      });
    }, 50);

    return () => {
      cancelado = true;
      clearInterval(esperarApp);
      const socket = obtenerSocket();
      socket.off("connect");
      socket.off("disconnect");
      socket.off("trazo:nuevo");
    };
  }, []);

  // --- Interacción: dibujar, panear, hacer zoom ---
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const stage = app.stage;
    const socket = obtenerSocket();

    const emitirTrazo = (datos: Omit<Trazo, "id" | "eliminado" | "creadoEn" | "chunkX" | "chunkY">) => {
      const primerPunto = datos.puntos[0] ?? { x: 0, y: 0 };
      socket.emit("trazo:nuevo", {
        ...datos,
        chunkX: coordenadaAChunk(primerPunto.x),
        chunkY: coordenadaAChunk(primerPunto.y),
      });
    };

    const aPuntoMundo = (e: PointerEvent): Punto => ({
      x: (e.clientX - stage.position.x) / stage.scale.x,
      y: (e.clientY - stage.position.y) / stage.scale.y,
    });

    const dibujarGrilla = () => {
      const g = gridRef.current;
      if (!g) return;
      g.clear();

      const minX = -stage.position.x / stage.scale.x;
      const minY = -stage.position.y / stage.scale.y;
      const maxX = (window.innerWidth - stage.position.x) / stage.scale.x;
      const maxY = (window.innerHeight - stage.position.y) / stage.scale.y;

      const inicioX = Math.floor(minX / CHUNK_SIZE) * CHUNK_SIZE;
      const inicioY = Math.floor(minY / CHUNK_SIZE) * CHUNK_SIZE;
      const grosorLinea = 1 / stage.scale.x;

      for (let x = inicioX; x <= maxX; x += CHUNK_SIZE) {
        g.moveTo(x, minY);
        g.lineTo(x, maxY);
      }
      for (let y = inicioY; y <= maxY; y += CHUNK_SIZE) {
        g.moveTo(minX, y);
        g.lineTo(maxX, y);
      }
      g.stroke({ width: grosorLinea, color: 0xe8e8e8 });
    };

    const aplicarZoom = (nuevaEscala: number, centroX: number, centroY: number) => {
      const escalaClamp = Math.min(Math.max(nuevaEscala, ZOOM_MIN), ZOOM_MAX);
      const mundoX = (centroX - stage.position.x) / stage.scale.x;
      const mundoY = (centroY - stage.position.y) / stage.scale.y;

      stage.scale.set(escalaClamp);
      stage.position.x = centroX - mundoX * escalaClamp;
      stage.position.y = centroY - mundoY * escalaClamp;

      dibujarGrilla();
      setZoomPorcentaje(Math.round(escalaClamp * 100));
    };

    controlesZoomRef.current = {
      acercar: () => aplicarZoom(stage.scale.x * 1.25, window.innerWidth / 2, window.innerHeight / 2),
      alejar: () => aplicarZoom(stage.scale.x / 1.25, window.innerWidth / 2, window.innerHeight / 2),
      restablecer: () => aplicarZoom(1, window.innerWidth / 2, window.innerHeight / 2),
    };

    dibujarGrilla();

    const alRueda = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      aplicarZoom(stage.scale.x * factor, e.clientX, e.clientY);
    };

    const colocarCampoTexto = (e: PointerEvent) => {
      if (!contenedorRef.current) return;
      inputTextoRef.current?.blur();

      const rectContenedor = contenedorRef.current.getBoundingClientRect();
      const xPantalla = e.clientX - rectContenedor.left;
      const yPantalla = e.clientY - rectContenedor.top;
      const tamañoFuenteMundo = Math.max(grosor * 4, 14);
      const tamañoFuentePantalla = tamañoFuenteMundo * stage.scale.x;

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Escribe y presiona Enter";
      Object.assign(input.style, {
        position: "absolute",
        left: `${xPantalla}px`,
        top: `${yPantalla - tamañoFuentePantalla / 2}px`,
        font: `${tamañoFuentePantalla}px system-ui, sans-serif`,
        color,
        background: "rgba(255,255,255,0.85)",
        border: "1px dashed #999",
        borderRadius: "4px",
        outline: "none",
        padding: "2px 6px",
        zIndex: "15",
        minWidth: "140px",
      });

      let yaConfirmado = false;
      const puntoMundo = aPuntoMundo(e);

      const confirmar = () => {
        if (yaConfirmado) return;
        yaConfirmado = true;

        const valor = input.value.trim();
        if (valor) {
          const estilo = new TextStyle({ fill: color, fontSize: tamañoFuenteMundo, fontFamily: "system-ui, sans-serif" });
          const texto = new Text({ text: valor, style: estilo });
          const posicion = { x: puntoMundo.x, y: puntoMundo.y - tamañoFuenteMundo / 2 };
          texto.x = posicion.x;
          texto.y = posicion.y;
          app.stage.addChild(texto);
          objetosPorTrazoRef.current.set("__pendiente__", texto);

          emitirTrazo({
            herramienta: "texto",
            puntos: [posicion],
            color,
            grosor,
            texto: valor,
            autorAnonId: autorIdRef.current,
          });
        }
        input.remove();
        if (inputTextoRef.current === input) inputTextoRef.current = null;
      };

      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          confirmar();
        }
        if (ev.key === "Escape") {
          yaConfirmado = true;
          input.remove();
          if (inputTextoRef.current === input) inputTextoRef.current = null;
        }
      });
      input.addEventListener("blur", confirmar);

      contenedorRef.current.appendChild(input);
      inputTextoRef.current = input;
      setTimeout(() => input.focus(), 0);
    };

    const iniciarTrazo = (e: PointerEvent) => {
      if (e.button === 1 || herramienta === "mano") {
        panEnCursoRef.current = true;
        panInicioRef.current = { x: e.clientX, y: e.clientY, stageX: stage.position.x, stageY: stage.position.y };
        canvasEl.style.cursor = "grabbing";
        return;
      }

      if (herramienta === "texto") {
        e.preventDefault();
        colocarCampoTexto(e);
        return;
      }

      if (herramienta === "forma") {
        dibujandoRef.current = true;
        const inicio = aPuntoMundo(e);
        inicioFormaRef.current = inicio;
        puntoFinalFormaRef.current = inicio;
        const g = new Graphics();
        app.stage.addChild(g);
        graficoActualRef.current = g;
        return;
      }

      if (herramienta !== "pincel" && herramienta !== "borrador") return;
      dibujandoRef.current = true;
      puntosActualesRef.current = [aPuntoMundo(e)];

      const g = new Graphics();
      app.stage.addChild(g);
      graficoActualRef.current = g;
    };

    const continuarTrazo = (e: PointerEvent) => {
      if (panEnCursoRef.current && panInicioRef.current) {
        const dx = e.clientX - panInicioRef.current.x;
        const dy = e.clientY - panInicioRef.current.y;
        stage.position.x = panInicioRef.current.stageX + dx;
        stage.position.y = panInicioRef.current.stageY + dy;
        dibujarGrilla();
        return;
      }

      if (!dibujandoRef.current || !graficoActualRef.current) return;
      const punto = aPuntoMundo(e);

      if (herramienta === "forma" && inicioFormaRef.current) {
        puntoFinalFormaRef.current = punto;
        graficoActualRef.current.clear();
        trazarForma(graficoActualRef.current, tipoForma, inicioFormaRef.current, punto, grosor, color);
        return;
      }

      puntosActualesRef.current.push(punto);
      const puntos = puntosActualesRef.current;
      const g = graficoActualRef.current;
      g.clear();

      const colorTrazo = herramienta === "borrador" ? "#ffffff" : color;
      g.moveTo(puntos[0].x, puntos[0].y);
      for (const p of puntos.slice(1)) g.lineTo(p.x, p.y);
      g.stroke({ width: grosor, color: colorTrazo, cap: "round", join: "round" });
    };

    const terminarTrazo = () => {
      if (panEnCursoRef.current) {
        panEnCursoRef.current = false;
        panInicioRef.current = null;
        canvasEl.style.cursor = cursorParaHerramienta(herramienta, grosor, color);
        return;
      }

      if (!dibujandoRef.current) return;
      dibujandoRef.current = false;

      if (herramienta === "forma" && inicioFormaRef.current && puntoFinalFormaRef.current && graficoActualRef.current) {
        objetosPorTrazoRef.current.set("__pendiente__", graficoActualRef.current);
        emitirTrazo({
          herramienta: "forma",
          puntos: [inicioFormaRef.current, puntoFinalFormaRef.current],
          color,
          grosor,
          tipoForma,
          autorAnonId: autorIdRef.current,
        });
      } else if ((herramienta === "pincel" || herramienta === "borrador") && puntosActualesRef.current.length > 1 && graficoActualRef.current) {
        objetosPorTrazoRef.current.set("__pendiente__", graficoActualRef.current);
        emitirTrazo({
          herramienta,
          puntos: puntosActualesRef.current,
          color: herramienta === "borrador" ? "#ffffff" : color,
          grosor,
          autorAnonId: autorIdRef.current,
        });
      }

      puntosActualesRef.current = [];
      graficoActualRef.current = null;
      inicioFormaRef.current = null;
      puntoFinalFormaRef.current = null;
    };

    const alRedimensionar = () => dibujarGrilla();

    const canvasEl = app.canvas;
    canvasEl.style.cursor = cursorParaHerramienta(herramienta, grosor, color);
    canvasEl.addEventListener("pointerdown", iniciarTrazo);
    canvasEl.addEventListener("pointermove", continuarTrazo);
    canvasEl.addEventListener("wheel", alRueda, { passive: false });
    window.addEventListener("pointerup", terminarTrazo);
    window.addEventListener("resize", alRedimensionar);

    return () => {
      canvasEl.removeEventListener("pointerdown", iniciarTrazo);
      canvasEl.removeEventListener("pointermove", continuarTrazo);
      canvasEl.removeEventListener("wheel", alRueda);
      window.removeEventListener("pointerup", terminarTrazo);
      window.removeEventListener("resize", alRedimensionar);
    };
  }, [color, grosor, herramienta, tipoForma]);

  return (
    <div ref={contenedorRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 10,
          padding: "6px 10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          zIndex: 10,
          fontSize: 12,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: conectado ? "#22c55e" : "#ef4444", display: "inline-block" }} />
        {conectado ? "Conectado" : "Sin conexión al servidor"}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 10,
          padding: "6px 8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          zIndex: 10,
          fontSize: 12,
        }}
      >
        <button onClick={() => controlesZoomRef.current.alejar()} style={botonZoomEstilo}>
          −
        </button>
        <span style={{ minWidth: 42, textAlign: "center" }}>{zoomPorcentaje}%</span>
        <button onClick={() => controlesZoomRef.current.acercar()} style={botonZoomEstilo}>
          +
        </button>
        <button onClick={() => controlesZoomRef.current.restablecer()} style={{ ...botonZoomEstilo, width: "auto", padding: "0 10px" }}>
          Restablecer
        </button>
      </div>
    </div>
  );
}

const botonZoomEstilo: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "none",
  background: "#eee",
  cursor: "pointer",
  fontSize: 14,
};
