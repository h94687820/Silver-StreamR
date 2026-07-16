import { useEffect, useState } from "react";

const SPLASH_KEY = "silver_stream_splash_shown";

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
        background: "linear-gradient(170deg, #13192b 0%, #1b2540 55%, #13192b 100%)",
        transition: "opacity 0.75s ease",
        opacity: phase === "out" ? 0 : 1,
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Radial glow behind eagle */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(130,158,225,0.10) 0%, transparent 70%)",
          animation: "glowPulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Eagle image with build-up animation */}
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          animation: "eagleReveal 2s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        {/* The eagle image — clip reveals it from left to right */}
        <img
          src={`${import.meta.env.BASE_URL}eagle-logo.jpeg`}
          alt="Eagle"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: 32,
            animation: "eagleFloat 4s ease-in-out 2s infinite",
          }}
        />

        {/* Silver shimmer overlay that sweeps across */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 32,
            background:
              "linear-gradient(115deg, transparent 30%, rgba(200,215,255,0.18) 50%, transparent 70%)",
            backgroundSize: "250% 100%",
            animation: "shimmerSweep 2.5s ease 0.8s infinite",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* App name */}
      <p
        style={{
          marginTop: 22,
          color: "rgba(195,212,248,0.80)",
          fontSize: 11,
          letterSpacing: "0.28em",
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
              "linear-gradient(90deg, transparent, rgba(160,185,238,0.5), transparent)",
          }}
        />
        <p
          style={{
            color: "rgba(155,180,228,0.62)",
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
          0%   { opacity: 0; transform: scale(0.5) translateY(22px); filter: blur(16px) brightness(1.4); }
          40%  { opacity: 0.85; filter: blur(3px) brightness(1.2); }
          70%  { transform: scale(1.04) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0) brightness(1); }
        }
        @keyframes eagleFloat {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-7px); }
        }
        @keyframes shimmerSweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.6; transform: scale(0.95); }
          50%     { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(9px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function useShouldShowSplash() {
  return !sessionStorage.getItem(SPLASH_KEY);
}
