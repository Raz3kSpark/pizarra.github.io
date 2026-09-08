# Pizarra Colaborativa

Lienzo infinito, anónimo y colaborativo, con moderación por votación comunitaria.

## Estructura

```
pizarra-colaborativa/
├── backend/     → API + WebSockets + base de datos (Express, Socket.io, Prisma)
├── frontend/    → Interfaz del lienzo (Next.js, TypeScript, PixiJS)
├── shared/      → Tipos TypeScript compartidos entre frontend y backend
└── .github/     → Workflow que publica el frontend en GitHub Pages
```

## Cómo arrancar en tu máquina (desarrollo local)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con la URL de tu base de datos Postgres (ver sección Neon más abajo)
npx prisma migrate dev --name init
npm run dev
```

El servidor queda escuchando en `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

La app queda en `http://localhost:3000`, ya conectada al backend local.

## Cómo desplegarlo de verdad (para que la gente use la página)

GitHub Pages **solo sirve archivos estáticos** — no puede ejecutar el backend
de Node.js ni la base de datos. Por eso el despliegue se divide en tres
piezas:

```
Frontend (estático)     → GitHub Pages
Backend + Socket.io     → Railway (ejecuta Node.js 24/7, gratis para empezar)
Base de datos Postgres  → Neon.tech (gratis para empezar)
```

### Paso 1 — Base de datos en Neon

1. Crea una cuenta en [neon.tech](https://neon.tech).
2. Crea un proyecto nuevo → te da una `DATABASE_URL` (algo como
   `postgresql://usuario:password@ep-xxxx.neon.tech/neondb`). Guárdala.

### Paso 2 — Backend en Railway

1. Crea una cuenta en [railway.app](https://railway.app) y conéctala a tu
   cuenta de GitHub.
2. Sube este proyecto a un repositorio de GitHub (si aún no lo has hecho).
3. En Railway: "New Project" → "Deploy from GitHub repo" → selecciona el
   repositorio → cuando pida la carpeta raíz del servicio, indica `backend`.
4. En la pestaña "Variables" del servicio, agrega:
   - `DATABASE_URL` → la de Neon del paso 1
   - `FRONTEND_URL` → la URL que tendrá tu GitHub Pages, ej.
     `https://tu-usuario.github.io`
   - `PORT` → `4000`
5. Railway detecta el `package.json` y lo despliega. Una vez arriba, copia la
   URL pública que te asigna (algo como `https://tu-backend.up.railway.app`).
6. Corre la migración de la base de datos una vez, desde tu máquina, apuntando
   a la `DATABASE_URL` de Neon:
   ```bash
   cd backend
   DATABASE_URL="la-url-de-neon" npx prisma migrate deploy
   ```

### Paso 3 — Frontend en GitHub Pages

1. En tu repositorio de GitHub: **Settings → Pages → Source → GitHub
   Actions** (no "Deploy from a branch").
2. **Settings → Secrets and variables → Actions → Variables** → agrega una
   variable nueva:
   - `NEXT_PUBLIC_BACKEND_URL` → la URL de Railway del paso anterior
     (ej. `https://tu-backend.up.railway.app`)
3. Haz `git push` a la rama `main`. El workflow en
   `.github/workflows/deploy.yml` se ejecuta solo: compila el frontend como
   sitio estático y lo publica.
4. Tu página queda en `https://tu-usuario.github.io/nombre-del-repo`.

**Importante:** si más adelante cambias la URL del backend, solo necesitas
actualizar la variable `NEXT_PUBLIC_BACKEND_URL` en GitHub y volver a hacer
push (o correr el workflow manualmente desde la pestaña "Actions").

## Qué ya está armado

- **Modelo de datos** (`backend/prisma/schema.prisma`): Trazo, Votacion, Voto.
- **Servidor con Socket.io**: guarda cada trazo nuevo en la base de datos y lo
  transmite en tiempo real a todos los conectados.
- **Carga de historial**: al entrar, el frontend pide todos los trazos
  guardados y los dibuja antes de que puedas seguir dibujando encima.
- **Canvas con PixiJS**: pincel, borrador, formas (rectángulo/círculo/
  línea/flecha), texto con campo flotante, zoom con rueda del mouse, pan con
  la herramienta "Mano" o clic central, y una grilla que marca los chunks.
- **Sesión anónima**: cada visitante recibe un ID aleatorio guardado en
  `localStorage`, sin necesidad de cuentas ni login.
- **Popup de votación** (`frontend/components/VotePopup.tsx`): el componente
  visual ya existe, pero todavía no está conectado a ningún botón — ver
  siguiente sección.

## Qué falta (próximos pasos)

1. **Conectar la votación de borrado**: agregar un botón "Marcar para votar"
   sobre cada trazo, que dispare `POST /api/votaciones` y muestre el
   `VotePopup` a los demás usuarios conectados en tiempo real (falta emitir el
   evento de socket cuando se crea o resuelve una votación).
2. **Carga por chunk visible** en vez de traer todos los trazos de una vez —
   necesario solo cuando el lienzo crezca mucho (miles de trazos).
3. Integrar Yjs si notas conflictos al dibujar varias personas en la misma
   zona simultáneamente.
4. Filtro de moderación automática (fase 2, según lo conversado).
