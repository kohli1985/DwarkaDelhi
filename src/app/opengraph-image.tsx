import { ImageResponse } from "next/og";

// Default OG image for any route that doesn't define its own — applies
// automatically per Next's file convention. WhatsApp is the main sharing
// channel for this site (per the product brief), so this is deliberately
// simple and legible at the small size WhatsApp renders link previews at:
// big wordmark, no fine print.
export const alt = "DelhiDwarka — Local Services for Dwarka, Delhi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#c2410c",
              color: "white",
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#1c1917" }}>
            DelhiDwarka
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "#57534e" }}>
          Local Services for Dwarka, Delhi
        </div>
      </div>
    ),
    { ...size },
  );
}
