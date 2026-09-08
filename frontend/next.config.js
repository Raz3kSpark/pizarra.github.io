/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages solo sirve archivos estáticos: esto genera una carpeta
  // /out con HTML/CSS/JS puro, sin necesidad de un servidor Next.js corriendo.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,

  // Si el repo se llama "mi-repo", GitHub Pages sirve el sitio en
  // usuario.github.io/mi-repo — sin este basePath, todos los links y
  // archivos estáticos (CSS/JS) apuntarían a la raíz equivocada.
  // Se define en tiempo de compilación vía variable de entorno (ver
  // .github/workflows/deploy.yml). Si tu repo se llama igual que tu usuario
  // de GitHub (usuario.github.io), déjalo vacío.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

module.exports = nextConfig;
