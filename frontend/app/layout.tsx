import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Pizarra Colaborativa",
  description: "Un lienzo infinito, anónimo y libre",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
