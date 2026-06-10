import { defineConfig } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  // Preset customizado baseado no minimal2023, mas sem a borda branca:
  // o minimal2023Preset usa padding 0.3 + fundo branco para `maskable` e
  // `apple`, o que gera a margem branca ao redor da imagem.
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, "favicon.ico"]],
    },
    maskable: {
      sizes: [512],
      // safe zone mínima para o recorte do Android; sobe para 0.1 se a
      // cabeça/lupa for cortada no recorte circular.
      padding: 0.05,
    },
    apple: {
      sizes: [180],
      // imagem ocupa todo o ícone, sem margem branca.
      padding: 0,
    },
  },
  // Source image lives outside public/ so the 2.5 MB original is never copied
  // into the build or precached by Workbox — only the generated icons ship.
  images: ["assets/joao-tem-favicon.png"],
});
