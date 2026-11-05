# Media Splitter ⚡

> **División inteligente y de alto rendimiento para archivos de audio y video de tamaño indefinido.**  
> Diseñado y validado bajo la metodología **EGM (Elephant-Goldfish Model)**.  
> 100% Client-Side · Streaming $O(1)$ de memoria · Cero subidas a la nube · Listo para **Vercel** y **GitHub**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Características Principales

- **Tamaño Indefinido (Sin Colapsar la RAM):** Procesa archivos de 100 MB, 5 GB o más de 50 GB manteniendo una huella de memoria constante y acotada (**< 50 MB RAM**) mediante lectura por punteros y bloques (`File.slice()` + Web Streams).
- **Zero-Upload / Privacidad Total:** Todo el procesamiento ocurre dentro de tu propio navegador web. Ningún byte se transmite a internet ni a servidores de terceros.
- **Dualidad de Corte Informada:**
  - ⚡ **Corte Rápido (Lossless Stream Copy):** Instantáneo, sin recodificación ni degradación de calidad, alineado a fotogramas clave (Keyframes / I-frames).
  - 🎯 **Corte Exacto (Al Segundo):** Máxima precisión para recortes que requieran marcas de tiempo exactas.
- **Criterios de Partición Flexibles:**
  - ⏱️ **Por Tiempo:** Divide cada $X$ segundos, minutos u horas.
  - 💾 **Por Tamaño:** Divide en partes de máximo $X$ MB o GB, aplicando una heurística de margen (-5%) para absorber picos en flujos de bitrate variable (VBR).
  - 🔢 **En $N$ Partes:** Divide el archivo en partes de duración equivalente.
- **Persistencia Optimizada:**
  - 📁 **File System Access API:** Si tu navegador lo soporta, guarda los segmentos directamente en cualquier carpeta local de tu disco a medida que se generan.
  - 📦 **Streaming ZIP:** Fallback automático para empaquetar y descargar todas las partes en un único archivo comprimido en streaming (`client-zip`).
- **Formatos Compatibles:** MP4, MOV, WebM, MP3, WAV, AAC, OGG.

---

## 🚀 Despliegue en Vercel (1 Clic)

Media Splitter está concebido como una Single Page Application (SPA) estática optimizada para Vercel:

1. Sube este repositorio a tu cuenta de **GitHub**.
2. Conecta el repositorio en el panel de **Vercel** o usa el botón [Deploy with Vercel](https://vercel.com/new).
3. Vercel detectará la configuración automáticamente (`npm run build` produciendo `dist/` con las cabeceras `vercel.json` ya preparadas).
4. ¡Listo! Tu webapp estará disponible globalmente con costo $0 de servidor y sin límites de ancho de banda.

---

## 💻 Ejecución Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) v18 o superior.
- Gestor de paquetes `npm`.

### Instalación y arranque

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/media-splitter.git
cd media-splitter

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador preferido (se recomienda Chrome o Edge para soporte nativo de la File System Access API).

### Compilar para producción

```bash
npm run build
npm run preview
```

---

## 📐 Arquitectura & Heurística de Recursos

El diseño detallado y las revisiones multi-lente se encuentran documentados bajo la metodología EGM en:
- [Documento de Diseño EGM](docs/designs/media_splitter.md)
- [Sitemap de Diseños](docs/designs/SITEMAP.md)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Navegador del Usuario                        │
│                                                                 │
│  [File Local] ──(File.slice)──> [Media Inspector & Planner]     │
│                                           │                     │
│                                    Plan de Partición            │
│                                           │                     │
│                                           ▼                     │
│                             [Stream Slicing Pipeline]           │
│                             (RAM Constante < 50 MB)             │
│                                           │                     │
│                     ┌─────────────────────┴──────────────────┐  │
│                     ▼                                        ▼  │
│         [Direct-to-Disk Stream]                   [Streaming ZIP]│
│       (FileSystem Access API)                     (client-zip)  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
            Segmentos en Disco Local
```

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.
