// THEME: the only place that knows this channel's look ("Pan Theory"). Swap this file to restyle an episode.
window.THEME = {
  brand: "Pan Theory",
  colors: {
    countertop: "#F7F1E6", cast: "#1F1D1B", tomato: "#B53A25", herb: "#3A7235", butter: "#F3C54B",
    // derived tones (tints of the palette only)
    carrot: "#E0701E", crumb: "#E9DFCB", stone: "#CFC4B0",
    abyss: "#F7F1E6", bg: "#F7F1E6", text: "#1F1D1B", hot: "#B53A25", accent: "#3A7235", sub: "#6B6256",
  },
  fonts: {
    display: { family: "Rubik", faces: [{ weight: 500, url: "/assets/fonts/rubik/rubik-latin-500-normal.woff2" }, { weight: 800, url: "/assets/fonts/rubik/rubik-latin-800-normal.woff2" }] },
    body: { family: "Nunito", faces: [{ weight: 400, url: "/assets/fonts/nunito/nunito-latin-400-normal.woff2" }, { weight: 800, url: "/assets/fonts/nunito/nunito-latin-800-normal.woff2" }] },
  },
  look: { grain: 0.035, vig: 0.22, hal: 0.2 },
  sound: "pan-theory",
  caption: {
    font: "body", weight: 800, size: 66, lineHeight: 1.14,
    color: "#1F1D1B", keyColor: "#B53A25",
    backing: "rgba(247,241,230,0.93)", padX: 22, padY: 4, radius: 18,
    left: 70, right: 130, bottomY: 1500,
    maxLineChars: 25,
  },
  safe: { top: 154, bottom: 1536, right: 950 },
};
