import { useEffect, useState } from "react";

const SPLASH_KEY = "silver_stream_splash_shown";

// Match the outer dark ring of the eagle-splash.png
const BG = "#0d0f15";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 2400);
    const t2 = setTimeout(() => setPhase("out"), 3200);
    const t3 = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      onDone();
    }, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BG,
        transition: "opacity 0.75s ease",
        opacity: phase === "out" ? 0 : 1,
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(160,180,230,0.08) 0%, transparent 70%)",
          animation: "glowPulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Eagle image */}
      <div
        style={{
          position: "relative",
          width: 280,
          height: 280,
          borderRadius: "30%",
          overflow: "hidden",
          animation: "eagleReveal 2s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}eagle-splash.png`}
          alt="Eagle"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            animation: "eagleFloat 4s ease-in-out 2s infinite",
          }}
        />

        {/* Silver shimmer sweep */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, transparent 30%, rgba(200,215,255,0.15) 50%, transparent 70%)",
            backgroundSize: "250% 100%",
            animation: "shimmerSweep 2.8s ease 1s infinite",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* App name */}
      <p
        style={{
          marginTop: 20,
          color: "rgba(195,210,248,0.75)",
          fontSize: 11,
          letterSpacing: "0.30em",
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          textTransform: "uppercase",
          animation: "fadeUp 0.8s ease 1.8s both",
        }}
      >
        Silver Stream
      </p>

      {/* Welcome text */}
      <div
        style={{
          position: "absolute",
          bottom: "9%",
          left: 0,
          right: 0,
          textAlign: "center",
          padding: "0 40px",
          animation: "fadeUp 0.8s ease 2.2s both",
        }}
      >
        <div
          style={{
            width: 28,
            height: 1,
            margin: "0 auto 14px",
            background:
              "linear-gradient(90deg, transparent, rgba(160,185,238,0.45), transparent)",
          }}
        />
        <p
          style={{
            color: "rgba(155,178,228,0.58)",
            fontSize: 12,
            letterSpacing: "0.06em",
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            lineHeight: 1.9,
          }}
        >
          Welcome to our app
          <br />
          thank you for visiting
        </p>
      </div>

      <style>{`
        @keyframes eagleReveal {
          0%   { opacity: 0; transform: scale(0.55) translateY(20px); filter: blur(14px) brightness(1.3); }
          40%  { opacity: 0.9; filter: blur(2px) brightness(1.15); }
          70%  { transform: scale(1.04) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0) brightness(1); }
        }
        @keyframes eagleFloat {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-8px); }
        }
        @keyframes shimmerSweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.5; transform: scale(0.93); }
          50%     { opacity: 1;   transform: scale(1.07); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function useShouldShowSplash() {
  return !sessionStorage.getItem(SPLASH_KEY);
}
