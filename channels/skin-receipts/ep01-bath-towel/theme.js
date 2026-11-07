// THEME: the only place that knows this channel's look ("Skin Receipts"). Reusable by every Skin Receipts episode: swap nothing but the script.
// Clean Receipt-white world, Navy type, Verified Teal / Myth Rose / Slate verdict colours, a range of skin tones.
window.THEME = {
  brand: "Skin Receipts",
  colors: {
    receipt: "#FBFAF6", navy: "#1B2440", teal: "#0B7270", rose: "#B4475A", slate: "#5A6275",
    skin: ["#F1D3BE", "#D9A47F", "#A86F4C", "#6B4330", "#3E271C"],
    paper: "#FFFFFF", cotton: "#EFECE4", slateSoft: "#C9CED8",
    // keys used by the shared film toolkit
    abyss: "#FBFAF6", bg: "#FBFAF6", text: "#1B2440", hot: "#0B7270", accent: "#0B7270", sub: "#5A6275",
  },
  fonts: {
    display: { family: "Albert Sans", faces: [{ weight: 400, url: "/assets/fonts/albert-sans/albert-sans-latin-400-normal.woff2" }, { weight: 700, url: "/assets/fonts/albert-sans/albert-sans-latin-700-normal.woff2" }] },
    body: { family: "Albert Sans", faces: [] },
    mono: { family: "Courier Prime", faces: [{ weight: 400, url: "/assets/fonts/courier-prime/courier-prime-latin-400-normal.woff2" }, { weight: 700, url: "/assets/fonts/courier-prime/courier-prime-latin-700-normal.woff2" }] },
  },
  look: { grain: 0.03, vignette: 0.02, vig: 0.02, hal: 0 },
  sound: "skin-receipts",
  caption: {
    font: "body", weight: 700, size: 66, lineHeight: 1.16,
    color: "#1B2440", keyColor: "#0B7270",
    backing: "rgba(251,250,246,0.90)", padX: 22, padY: 4, radius: 16,
    left: 70, right: 130, bottomY: 1452,
    maxLineChars: 24,
  },
  safe: { top: 154, bottom: 1536, right: 950 },
};
