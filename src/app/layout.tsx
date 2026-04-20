import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "SRN Command Center",
  description: "Real-time task dashboard with glassmorphism UI",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SRN Command" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="green" data-mode="dark">
      <body className="min-h-screen flex">

        {/* ── iOS 26 SVG filter defs — injected once, zero visual footprint ── */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
        >
          <defs>
            {/*
              lg-refract: border-lensing displacement map.
              feTurbulence generates a radial noise field;
              feDisplacementMap bends the backdrop at glass edges.
              scale="10" = subtle bend; increase for more distortion.
            */}
            <filter id="lg-refract" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.018"
                numOctaves="3"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="10"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feComposite in="displaced" in2="SourceGraphic" operator="in" />
            </filter>

            {/*
              lg-ca: chromatic aberration split — used by .ca class
              Offsets R/B channels by ±0.8px for glass edge fringing.
            */}
            <filter id="lg-ca" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
              <feOffset in="SourceGraphic" dx="0.8" dy="0" result="r" />
              <feOffset in="SourceGraphic" dx="-0.8" dy="0" result="b" />
              <feBlend in="r" in2="SourceGraphic" mode="screen" result="rb" />
              <feBlend in="rb" in2="b" mode="screen" />
            </filter>
          </defs>
        </svg>

        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}


