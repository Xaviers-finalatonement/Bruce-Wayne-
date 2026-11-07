// THEME: the only place that knows this channel's look. Swap this file to restyle an episode.
// Everything (colours, fonts, background grid, caption styling, ink style) is read from here by scene.js.
window.THEME = {
  brand: "Reality Rulebook",
  colors: {
    paper: "#F3EFE6", ink: "#15171C", red: "#B8302A", graphite: "#555C68", marker: "#F2C230", grid: "#BFD0E0",
    // semantic roles used by scene.js
    bg: "#F3EFE6", line: "#15171C", accent: "#B8302A", label: "#555C68", highlight: "#F2C230",
    faceFill: "#F3EFE6", shirt: "#BFD0E0", pants: "#555C68", ground: "#BFD0E0",
  },
  fonts: {
    display: { family: "Space Grotesk", faces: [
      { weight: 500, url: "/assets/fonts/space-grotesk/space-grotesk-latin-500-normal.woff2" },
      { weight: 700, url: "/assets/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2" } ] },
    mono: { family: "JetBrains Mono", faces: [
      { weight: 400, url: "/assets/fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2" },
      { weight: 700, url: "/assets/fonts/jetbrains-mono/jetbrains-mono-latin-700-normal.woff2" } ] },
  },
  background: { grid: { size: 60, color: "#BFD0E0", width: 2 } },
  ink: { width: 5, wobble: 1.8, seed: 1337 },
  caption: {
    font: "display", weight: 700, size: 64, lineHeight: 1.2,
    color: "#15171C", keyColor: "#B8302A", numberFont: "mono",
    backing: "rgba(243,239,230,0.9)", padX: 22, padY: 4, radius: 16,
    // caption box in px: text centred between left and (1080 - right); bottom edge measured from the top
    left: 56, right: 140, bottomY: 1500,
    maxLineChars: 24,
    // per-beat variants for the key word: 'underline' (red + underline) or 'marker' (Ink on Marker)
    variants: { b05: "underline", b08: "underline", b10: "marker" },
  },
  safe: { top: 154, bottom: 1536, right: 950 },
};
