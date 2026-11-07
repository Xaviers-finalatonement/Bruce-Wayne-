// THEME: the only place that knows this channel's look ("Unreal, Actually"). Swap this file to restyle an episode.
// scene.js reads colours, fonts, caption style, safe areas and the look (grain/vignette) from here.
window.THEME = {
  brand: "Unreal, Actually",
  colors: {
    abyss: "#08070D", static: "#F3F1FF", horizon: "#FF8A2A", ultraviolet: "#A98BFF", haze: "#8D8AA6",
    // derived tones used for depth (all on-palette: tints of Abyss / Ultraviolet)
    panel: "#120F1C", panel2: "#1B1629", deep: "#2A1F4D",
    bg: "#08070D", text: "#F3F1FF", hot: "#FF8A2A", accent: "#A98BFF", sub: "#8D8AA6",
  },
  fonts: {
    display: { family: "Anton", faces: [{ weight: 400, url: "/assets/fonts/anton/anton-latin-400-normal.woff2" }] },
    body: { family: "Barlow", faces: [
      { weight: 500, url: "/assets/fonts/barlow/barlow-latin-500-normal.woff2" },
      { weight: 800, url: "/assets/fonts/barlow/barlow-latin-800-normal.woff2" } ] },
  },
  look: { grain: 0.07, vignette: 0.72 },
  sound: "unreal-actually",
  caption: {
    font: "body", weight: 800, size: 68, lineHeight: 1.16,
    color: "#F3F1FF", keyColor: "#FF8A2A",
    backing: "rgba(8,7,13,0.80)", padX: 24, padY: 4, radius: 16,
    // caption box in px: text centred between left and (1080 - right); bottom edge measured from the top (band y 62-76 %)
    left: 70, right: 130, bottomY: 1452,
    maxLineChars: 24,
  },
  safe: { top: 154, bottom: 1536, right: 950 },
};
