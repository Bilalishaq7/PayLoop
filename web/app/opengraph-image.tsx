import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PayLoop invoice preview";

// Default social card for links that do not carry their own image, such as
// /pay/[id]. Purely text based so it needs no logo asset or remote font.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: 80,
          background: "#0b1220",
          color: "#f8fafc",
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
            background: "#6d5efc",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          P
        </div>
        <div style={{ display: "flex", fontSize: 86, fontWeight: 700 }}>
          PayLoop
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#cbd5e1" }}>
          Invoice. Get paid in crypto, cash out in Naira.
        </div>
      </div>
    ),
    size
  );
}
