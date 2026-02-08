/**
 * NEXUS CLI - Landing Page Generator
 *
 * Generates a branded NEXUS landing page for each supported frontend framework.
 * Also generates the NEXUS logo SVG and favicon for the public/ directory.
 */

import type { NexusConfig, FrontendFramework } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';

/* ──────────────────────────────────────────────────────────────
 * Shared: inline SVG logo (the "Neural Network" concept)
 * ────────────────────────────────────────────────────────────── */

const NEXUS_SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
  <!-- Connection lines -->
  <path d="M100 100 L60 60" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L140 60" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L60 140" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L140 140" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L100 40" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L100 160" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L40 100" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <path d="M100 100 L160 100" stroke="#00D9FF" stroke-width="2" opacity="0.3"/>
  <!-- Nodes -->
  <circle cx="100" cy="100" r="20" fill="#00D9FF" opacity="1"/>
  <circle cx="60" cy="60" r="12" fill="#00D9FF" opacity="0.7"/>
  <circle cx="140" cy="60" r="12" fill="#00D9FF" opacity="0.7"/>
  <circle cx="60" cy="140" r="12" fill="#00D9FF" opacity="0.7"/>
  <circle cx="140" cy="140" r="12" fill="#00D9FF" opacity="0.7"/>
  <circle cx="100" cy="40" r="10" fill="#00D9FF" opacity="0.5"/>
  <circle cx="100" cy="160" r="10" fill="#00D9FF" opacity="0.5"/>
  <circle cx="40" cy="100" r="10" fill="#00D9FF" opacity="0.5"/>
  <circle cx="160" cy="100" r="10" fill="#00D9FF" opacity="0.5"/>
</svg>`;

/* ──────────────────────────────────────────────────────────────
 * Shared: favicon as a 32×32 SVG (used as favicon.svg)
 * ────────────────────────────────────────────────────────────── */

const NEXUS_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 200 200" fill="none">
  <circle cx="100" cy="100" r="90" fill="#0A0A0A"/>
  <path d="M100 100 L60 60" stroke="#00D9FF" stroke-width="3" opacity="0.3"/>
  <path d="M100 100 L140 60" stroke="#00D9FF" stroke-width="3" opacity="0.3"/>
  <path d="M100 100 L60 140" stroke="#00D9FF" stroke-width="3" opacity="0.3"/>
  <path d="M100 100 L140 140" stroke="#00D9FF" stroke-width="3" opacity="0.3"/>
  <circle cx="100" cy="100" r="22" fill="#00D9FF"/>
  <circle cx="60" cy="60" r="10" fill="#00D9FF" opacity="0.7"/>
  <circle cx="140" cy="60" r="10" fill="#00D9FF" opacity="0.7"/>
  <circle cx="60" cy="140" r="10" fill="#00D9FF" opacity="0.7"/>
  <circle cx="140" cy="140" r="10" fill="#00D9FF" opacity="0.7"/>
</svg>`;

/* ──────────────────────────────────────────────────────────────
 * Shared CSS (embedded in each template)
 * ────────────────────────────────────────────────────────────── */

function landingCSS(): string {
  return `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:#0a0a0a;color:#ededed;min-height:100vh}

/* ── Layout ── */
.nexus-page{max-width:720px;margin:0 auto;padding:3rem 1.5rem;display:flex;flex-direction:column;align-items:center;gap:2.5rem}

/* ── Hero ── */
.nexus-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1rem}
.nexus-logo{width:140px;height:140px;animation:float 4s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.nexus-title{font-size:clamp(2.5rem,6vw,3.5rem);font-weight:800;letter-spacing:-.03em;background:linear-gradient(135deg,#00D9FF 0%,#00FF87 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.nexus-subtitle{font-size:clamp(.95rem,2.2vw,1.15rem);color:#888;max-width:480px;line-height:1.6}

/* ── Badge row ── */
.nexus-meta{display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center}
.nexus-badge{font-size:.8rem;padding:.3rem .75rem;border-radius:9999px;border:1px solid #222;color:#aaa;background:#111;transition:border-color .2s}
.nexus-badge:hover{border-color:#00D9FF44}

/* ── Cards ── */
.nexus-card{width:100%;background:#111;border:1px solid #1a1a1a;border-radius:1rem;padding:1.5rem;transition:border-color .25s}
.nexus-card:hover{border-color:#00D9FF33}
.nexus-card h2{font-size:1.1rem;font-weight:700;color:#ddd;margin-bottom:1rem}

/* ── Logo sizes row ── */
.nexus-sizes{display:flex;align-items:flex-end;justify-content:center;gap:2rem;flex-wrap:wrap}
.nexus-size-item{display:flex;flex-direction:column;align-items:center;gap:.5rem}
.nexus-size-item svg{opacity:.85;transition:opacity .2s,transform .2s}
.nexus-size-item:hover svg{opacity:1;transform:scale(1.06)}
.nexus-size-label{font-size:.75rem;color:#555;font-family:monospace}

/* ── Brand colors ── */
.nexus-colors{display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem}
.nexus-color-swatch{display:flex;flex-direction:column;align-items:center;gap:.4rem}
.nexus-color-block{width:100%;aspect-ratio:1;border-radius:.625rem;transition:transform .2s}
.nexus-color-block:hover{transform:scale(1.08)}
.nexus-color-hex{font-size:.7rem;font-family:monospace;color:#666}
.nexus-color-name{font-size:.65rem;color:#444}

/* ── Links row ── */
.nexus-links{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.nexus-links a{color:#00D9FF;text-decoration:none;font-weight:600;font-size:.9rem;padding:.55rem 1.3rem;border-radius:.5rem;border:1px solid #00D9FF33;transition:all .2s}
.nexus-links a:hover{background:#00D9FF15;border-color:#00D9FF}

/* ── Footer ── */
.nexus-footer{text-align:center;font-size:.78rem;color:#444;padding-top:.5rem}
.nexus-footer a{color:#00D9FF;text-decoration:none}

/* ── Responsive ── */
@media(max-width:480px){.nexus-colors{grid-template-columns:repeat(3,1fr)}.nexus-sizes{gap:1.25rem}}`;
}

/* ──────────────────────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────────────────────── */

/**
 * Generate all landing page files for the chosen framework.
 */
export function generateLandingPage(config: NexusConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Always include the logo SVG in public/
  files.push({ path: 'public/nexus-logo.svg', content: NEXUS_SVG_LOGO });
  files.push({ path: 'public/favicon.svg', content: NEXUS_FAVICON_SVG });

  // Only generate landing pages for frontend project types
  if (config.projectType === 'api') {
    return files;
  }

  // Framework-specific landing page + CSS
  const pageFiles = getLandingPageForFramework(config.frontendFramework, config.displayName);
  files.push(...pageFiles);

  return files;
}

/**
 * Return the correct landing page files based on the framework.
 */
function getLandingPageForFramework(
  framework: FrontendFramework,
  projectName: string,
): GeneratedFile[] {
  switch (framework) {
    case 'nextjs':
      return nextjsLandingPage(projectName);
    case 'react-vite':
      return reactViteLandingPage(projectName);
    case 'sveltekit':
      return sveltekitLandingPage(projectName);
    case 'nuxt':
      return nuxtLandingPage(projectName);
    case 'astro':
      return astroLandingPage(projectName);
    case 'remix':
      return nextjsLandingPage(projectName); // Remix uses React/TSX
    default:
      return nextjsLandingPage(projectName);
  }
}

/* ──────────────────────────────────────────────────────────────
 * Next.js (App Router) — src/app/page.tsx + src/app/layout.tsx + globals.css
 * ────────────────────────────────────────────────────────────── */

function nextjsLandingPage(projectName: string): GeneratedFile[] {
  const page = `import Image from "next/image";

const brandColors = [
  { hex: "#00D9FF", name: "Primary Cyan" },
  { hex: "#00FF87", name: "Success Green" },
  { hex: "#5352ED", name: "Info Blue" },
  { hex: "#A55EEA", name: "Purple Accent" },
  { hex: "#FF4757", name: "Error Red" },
];

export default function Home() {
  return (
    <div className="nexus-page">
      {/* ── Hero ── */}
      <section className="nexus-hero">
        <Image
          className="nexus-logo"
          src="/nexus-logo.svg"
          alt="NEXUS Logo"
          width={140}
          height={140}
          priority
        />
        <h1 className="nexus-title">${projectName}</h1>
        <p className="nexus-subtitle">
          Built with <strong>NEXUS CLI</strong> — the AI-native project scaffolding
          tool by GDA Africa. Your project is ready.
        </p>
        <div className="nexus-meta">
          <span className="nexus-badge">Next.js 15</span>
          <span className="nexus-badge">TypeScript</span>
          <span className="nexus-badge">NEXUS Docs</span>
        </div>
      </section>

      {/* ── Size Variations ── */}
      <div className="nexus-card">
        <h2>✦ Size Variations</h2>
        <div className="nexus-sizes">
          {[48, 96, 160].map((s) => (
            <div className="nexus-size-item" key={s}>
              <Image src="/nexus-logo.svg" alt="logo" width={s} height={s} />
              <span className="nexus-size-label">{s}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Brand Colors ── */}
      <div className="nexus-card">
        <h2>🎨 Brand Colors</h2>
        <div className="nexus-colors">
          {brandColors.map((c) => (
            <div className="nexus-color-swatch" key={c.hex}>
              <div className="nexus-color-block" style={{ background: c.hex }} />
              <span className="nexus-color-hex">{c.hex}</span>
              <span className="nexus-color-name">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Links ── */}
      <div className="nexus-links">
        <a href="https://github.com/GDA-Africa/nexus-cli" target="_blank" rel="noopener noreferrer">
          Documentation
        </a>
        <a href="https://github.com/GDA-Africa" target="_blank" rel="noopener noreferrer">
          GDA Africa
        </a>
      </div>

      <footer className="nexus-footer">
        Scaffolded with 🔮 <a href="https://github.com/GDA-Africa/nexus-cli">NEXUS CLI</a> by{" "}
        <a href="https://github.com/GDA-Africa">GDA Africa</a>
      </footer>
    </div>
  );
}
`;

  const layout = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Generated with NEXUS CLI by GDA Africa",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

  const css = landingCSS();

  return [
    { path: 'src/app/page.tsx', content: page },
    { path: 'src/app/layout.tsx', content: layout },
    { path: 'src/app/globals.css', content: css },
  ];
}

/* ──────────────────────────────────────────────────────────────
 * React + Vite — src/App.tsx + src/main.tsx + index.html + src/index.css
 * ────────────────────────────────────────────────────────────── */

function reactViteLandingPage(projectName: string): GeneratedFile[] {
  const app = `import "./index.css";

function App() {
  return (
    <div className="nexus-page">
      {/* ── Hero ── */}
      <section className="nexus-hero">
        <img className="nexus-logo" src="/nexus-logo.svg" alt="NEXUS Logo" width={140} height={140} />
        <h1 className="nexus-title">${projectName}</h1>
        <p className="nexus-subtitle">
          Built with <strong>NEXUS CLI</strong> — the AI-native project scaffolding
          tool by GDA Africa. Your project is ready.
        </p>
        <div className="nexus-meta">
          <span className="nexus-badge">React + Vite</span>
          <span className="nexus-badge">TypeScript</span>
          <span className="nexus-badge">NEXUS Docs</span>
        </div>
      </section>

      {/* ── Size Variations ── */}
      <div className="nexus-card">
        <h2>✦ Size Variations</h2>
        <div className="nexus-sizes">
          {[48, 96, 160].map((s) => (
            <div className="nexus-size-item" key={s}>
              <img src="/nexus-logo.svg" alt="logo" width={s} height={s} />
              <span className="nexus-size-label">{s}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Brand Colors ── */}
      <div className="nexus-card">
        <h2>🎨 Brand Colors</h2>
        <div className="nexus-colors">
          {[
            { hex: "#00D9FF", name: "Primary Cyan" },
            { hex: "#00FF87", name: "Success Green" },
            { hex: "#5352ED", name: "Info Blue" },
            { hex: "#A55EEA", name: "Purple Accent" },
            { hex: "#FF4757", name: "Error Red" },
          ].map((c) => (
            <div className="nexus-color-swatch" key={c.hex}>
              <div className="nexus-color-block" style={{ background: c.hex }} />
              <span className="nexus-color-hex">{c.hex}</span>
              <span className="nexus-color-name">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Links ── */}
      <div className="nexus-links">
        <a href="https://github.com/GDA-Africa/nexus-cli" target="_blank" rel="noopener noreferrer">
          Documentation
        </a>
        <a href="https://github.com/GDA-Africa" target="_blank" rel="noopener noreferrer">
          GDA Africa
        </a>
      </div>

      <footer className="nexus-footer">
        Scaffolded with 🔮 <a href="https://github.com/GDA-Africa/nexus-cli">NEXUS CLI</a> by{" "}
        <a href="https://github.com/GDA-Africa">GDA Africa</a>
      </footer>
    </div>
  );
}

export default App;
`;

  const main = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  const css = landingCSS();

  return [
    { path: 'src/App.tsx', content: app },
    { path: 'src/main.tsx', content: main },
    { path: 'index.html', content: indexHtml },
    { path: 'src/index.css', content: css },
  ];
}

/* ──────────────────────────────────────────────────────────────
 * SvelteKit — src/routes/+page.svelte + src/routes/+layout.svelte + src/app.css + src/app.html
 * ────────────────────────────────────────────────────────────── */

function sveltekitLandingPage(projectName: string): GeneratedFile[] {
  const page = `<script lang="ts">
  const brandColors = [
    { hex: "#00D9FF", name: "Primary Cyan" },
    { hex: "#00FF87", name: "Success Green" },
    { hex: "#5352ED", name: "Info Blue" },
    { hex: "#A55EEA", name: "Purple Accent" },
    { hex: "#FF4757", name: "Error Red" },
  ];
  const sizes = [48, 96, 160];
</script>

<div class="nexus-page">
  <!-- Hero -->
  <section class="nexus-hero">
    <img class="nexus-logo" src="/nexus-logo.svg" alt="NEXUS Logo" width="140" height="140" />
    <h1 class="nexus-title">${projectName}</h1>
    <p class="nexus-subtitle">
      Built with <strong>NEXUS CLI</strong> — the AI-native project scaffolding
      tool by GDA Africa. Your project is ready.
    </p>
    <div class="nexus-meta">
      <span class="nexus-badge">SvelteKit</span>
      <span class="nexus-badge">TypeScript</span>
      <span class="nexus-badge">NEXUS Docs</span>
    </div>
  </section>

  <!-- Size Variations -->
  <div class="nexus-card">
    <h2>✦ Size Variations</h2>
    <div class="nexus-sizes">
      {#each sizes as s}
        <div class="nexus-size-item">
          <img src="/nexus-logo.svg" alt="logo" width={s} height={s} />
          <span class="nexus-size-label">{s}px</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Brand Colors -->
  <div class="nexus-card">
    <h2>🎨 Brand Colors</h2>
    <div class="nexus-colors">
      {#each brandColors as c}
        <div class="nexus-color-swatch">
          <div class="nexus-color-block" style="background:{c.hex}"></div>
          <span class="nexus-color-hex">{c.hex}</span>
          <span class="nexus-color-name">{c.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Links -->
  <div class="nexus-links">
    <a href="https://github.com/GDA-Africa/nexus-cli" target="_blank" rel="noopener noreferrer">
      Documentation
    </a>
    <a href="https://github.com/GDA-Africa" target="_blank" rel="noopener noreferrer">
      GDA Africa
    </a>
  </div>

  <footer class="nexus-footer">
    Scaffolded with 🔮 <a href="https://github.com/GDA-Africa/nexus-cli">NEXUS CLI</a> by
    <a href="https://github.com/GDA-Africa">GDA Africa</a>
  </footer>
</div>
`;

  const layout = `<script lang="ts">
  import "../app.css";
  let { children } = $props();
</script>

<svelte:head>
  <title>${projectName}</title>
  <meta name="description" content="Generated with NEXUS CLI by GDA Africa" />
  <link rel="icon" href="/favicon.svg" />
</svelte:head>

{@render children()}
`;

  const appHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body>
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
`;

  const css = landingCSS();

  return [
    { path: 'src/routes/+page.svelte', content: page },
    { path: 'src/routes/+layout.svelte', content: layout },
    { path: 'src/app.html', content: appHtml },
    { path: 'src/app.css', content: css },
  ];
}

/* ──────────────────────────────────────────────────────────────
 * Nuxt 3 — app.vue + pages/index.vue + assets/css/main.css + nuxt.config.ts
 * ────────────────────────────────────────────────────────────── */

function nuxtLandingPage(projectName: string): GeneratedFile[] {
  const appVue = `<template>
  <NuxtPage />
</template>
`;

  const indexPage = `<template>
  <div class="nexus-page">
    <!-- Hero -->
    <section class="nexus-hero">
      <img class="nexus-logo" src="/nexus-logo.svg" alt="NEXUS Logo" width="140" height="140" />
      <h1 class="nexus-title">${projectName}</h1>
      <p class="nexus-subtitle">
        Built with <strong>NEXUS CLI</strong> — the AI-native project scaffolding
        tool by GDA Africa. Your project is ready.
      </p>
      <div class="nexus-meta">
        <span class="nexus-badge">Nuxt 3</span>
        <span class="nexus-badge">TypeScript</span>
        <span class="nexus-badge">NEXUS Docs</span>
      </div>
    </section>

    <!-- Size Variations -->
    <div class="nexus-card">
      <h2>✦ Size Variations</h2>
      <div class="nexus-sizes">
        <div v-for="s in [48, 96, 160]" :key="s" class="nexus-size-item">
          <img src="/nexus-logo.svg" alt="logo" :width="s" :height="s" />
          <span class="nexus-size-label">{{ s }}px</span>
        </div>
      </div>
    </div>

    <!-- Brand Colors -->
    <div class="nexus-card">
      <h2>🎨 Brand Colors</h2>
      <div class="nexus-colors">
        <div v-for="c in brandColors" :key="c.hex" class="nexus-color-swatch">
          <div class="nexus-color-block" :style="{ background: c.hex }" />
          <span class="nexus-color-hex">{{ c.hex }}</span>
          <span class="nexus-color-name">{{ c.name }}</span>
        </div>
      </div>
    </div>

    <!-- Links -->
    <div class="nexus-links">
      <a href="https://github.com/GDA-Africa/nexus-cli" target="_blank" rel="noopener noreferrer">
        Documentation
      </a>
      <a href="https://github.com/GDA-Africa" target="_blank" rel="noopener noreferrer">
        GDA Africa
      </a>
    </div>

    <footer class="nexus-footer">
      Scaffolded with 🔮 <a href="https://github.com/GDA-Africa/nexus-cli">NEXUS CLI</a> by
      <a href="https://github.com/GDA-Africa">GDA Africa</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
const brandColors = [
  { hex: "#00D9FF", name: "Primary Cyan" },
  { hex: "#00FF87", name: "Success Green" },
  { hex: "#5352ED", name: "Info Blue" },
  { hex: "#A55EEA", name: "Purple Accent" },
  { hex: "#FF4757", name: "Error Red" },
];

useHead({
  title: "${projectName}",
  meta: [{ name: "description", content: "Generated with NEXUS CLI by GDA Africa" }],
  link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
});
</script>
`;

  const css = landingCSS();

  const nuxtConfig = `// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
`;

  return [
    { path: 'app.vue', content: appVue },
    { path: 'pages/index.vue', content: indexPage },
    { path: 'assets/css/main.css', content: css },
    { path: 'nuxt.config.ts', content: nuxtConfig },
  ];
}

/* ──────────────────────────────────────────────────────────────
 * Astro — src/pages/index.astro + src/layouts/Layout.astro + src/styles/global.css
 * ────────────────────────────────────────────────────────────── */

function astroLandingPage(projectName: string): GeneratedFile[] {
  const indexAstro = `---
import Layout from "../layouts/Layout.astro";

const brandColors = [
  { hex: "#00D9FF", name: "Primary Cyan" },
  { hex: "#00FF87", name: "Success Green" },
  { hex: "#5352ED", name: "Info Blue" },
  { hex: "#A55EEA", name: "Purple Accent" },
  { hex: "#FF4757", name: "Error Red" },
];
const sizes = [48, 96, 160];
---

<Layout title="${projectName}">
  <div class="nexus-page">
    <!-- Hero -->
    <section class="nexus-hero">
      <img class="nexus-logo" src="/nexus-logo.svg" alt="NEXUS Logo" width="140" height="140" />
      <h1 class="nexus-title">${projectName}</h1>
      <p class="nexus-subtitle">
        Built with <strong>NEXUS CLI</strong> — the AI-native project scaffolding
        tool by GDA Africa. Your project is ready.
      </p>
      <div class="nexus-meta">
        <span class="nexus-badge">Astro</span>
        <span class="nexus-badge">TypeScript</span>
        <span class="nexus-badge">NEXUS Docs</span>
      </div>
    </section>

    <!-- Size Variations -->
    <div class="nexus-card">
      <h2>✦ Size Variations</h2>
      <div class="nexus-sizes">
        {sizes.map((s) => (
          <div class="nexus-size-item">
            <img src="/nexus-logo.svg" alt="logo" width={s} height={s} />
            <span class="nexus-size-label">{s}px</span>
          </div>
        ))}
      </div>
    </div>

    <!-- Brand Colors -->
    <div class="nexus-card">
      <h2>🎨 Brand Colors</h2>
      <div class="nexus-colors">
        {brandColors.map((c) => (
          <div class="nexus-color-swatch">
            <div class="nexus-color-block" style={\`background:\${c.hex}\`} />
            <span class="nexus-color-hex">{c.hex}</span>
            <span class="nexus-color-name">{c.name}</span>
          </div>
        ))}
      </div>
    </div>

    <!-- Links -->
    <div class="nexus-links">
      <a href="https://github.com/GDA-Africa/nexus-cli" target="_blank" rel="noopener noreferrer">
        Documentation
      </a>
      <a href="https://github.com/GDA-Africa" target="_blank" rel="noopener noreferrer">
        GDA Africa
      </a>
    </div>

    <footer class="nexus-footer">
      Scaffolded with 🔮 <a href="https://github.com/GDA-Africa/nexus-cli">NEXUS CLI</a> by
      <a href="https://github.com/GDA-Africa">GDA Africa</a>
    </footer>
  </div>
</Layout>
`;

  const layoutAstro = `---
import "../styles/global.css";

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Generated with NEXUS CLI by GDA Africa" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
`;

  const css = landingCSS();

  return [
    { path: 'src/pages/index.astro', content: indexAstro },
    { path: 'src/layouts/Layout.astro', content: layoutAstro },
    { path: 'src/styles/global.css', content: css },
  ];
}
