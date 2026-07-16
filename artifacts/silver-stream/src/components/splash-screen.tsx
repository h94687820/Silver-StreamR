import { useEffect, useState } from "react";

// Shows once per browser session
const SPLASH_KEY = "silver_stream_splash_shown";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    // Phase 1: eagle builds up (1.6s)
    const t1 = setTimeout(() => setPhase("hold"), 1600);
    // Phase 2: hold (0.8s)
    const t2 = setTimeout(() => setPhase("out"), 2400);
    // Phase 3: fade out complete → notify parent
    const t3 = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      onDone();
    }, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg, #1a2035 0%, #242d45 50%, #1a2035 100%)",
        transition: "opacity 0.7s ease",
        opacity: phase === "out" ? 0 : 1,
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Subtle background shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(180,190,220,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Eagle container */}
      <div
        style={{
          position: "relative",
          width: 200,
          height: 200,
          marginBottom: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Glow ring that pulses in */}
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200,210,240,0.12) 0%, transparent 70%)",
            animation: "splashGlow 2s ease-in-out infinite alternate",
          }}
        />

        {/* Eagle SVG — builds up via clip-path reveal + scale */}
        <div
          style={{
            animation: phase === "in" ? "eagleBuild 1.5s cubic-bezier(0.22,1,0.36,1) forwards" : undefined,
            transform: phase === "in" ? undefined : "scale(1)",
          }}
        >
          <EagleSVG />
        </div>
      </div>

      {/* Welcome text — fades in after eagle */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: 0,
          right: 0,
          textAlign: "center",
          padding: "0 32px",
          animation: "textFadeIn 0.8s ease 1.8s both",
        }}
      >
        <p
          style={{
            color: "rgba(200,210,235,0.9)",
            fontSize: 14,
            letterSpacing: "0.08em",
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            lineHeight: 1.7,
          }}
        >
          Welcome to our app;<br />thank you for visiting.
        </p>
        {/* thin silver divider */}
        <div
          style={{
            margin: "10px auto 0",
            width: 40,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(200,210,240,0.5), transparent)",
          }}
        />
      </div>

      <style>{`
        @keyframes eagleBuild {
          0%   { opacity: 0; transform: scale(0.6) translateY(20px); filter: blur(8px); }
          40%  { opacity: 0.7; filter: blur(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes textFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashGlow {
          from { opacity: 0.6; transform: scale(0.9); }
          to   { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes wingLeft {
          0%   { opacity: 0; transform: translateX(30px) scaleX(0.3); }
          100% { opacity: 1; transform: translateX(0) scaleX(1); }
        }
        @keyframes wingRight {
          0%   { opacity: 0; transform: translateX(-30px) scaleX(0.3); }
          100% { opacity: 1; transform: translateX(0) scaleX(1); }
        }
        @keyframes headDrop {
          0%   { opacity: 0; transform: translateY(-20px) scale(0.7); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* SVG eagle — half-face silhouette matching the brand image */
function EagleSVG() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head — drops in first */}
      <g style={{ animation: "headDrop 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both" }}>
        {/* Crown / top of head */}
        <path
          d="M80 18 C68 18 58 24 52 34 C48 40 46 48 46 56 C46 66 50 74 56 80 C60 84 65 87 70 88 L80 90 L80 18Z"
          fill="url(#eagleGrad)"
        />
        {/* Right side flat edge (half face) */}
        <rect x="80" y="18" width="2" height="72" fill="rgba(200,210,240,0.3)" rx="1" />
      </g>

      {/* Beak — slides in from right */}
      <g style={{ animation: "wingLeft 0.5s cubic-bezier(0.22,1,0.36,1) 0.5s both" }}>
        <path
          d="M56 72 C52 76 46 82 44 90 C42 96 46 98 50 96 C56 93 62 88 65 82 Z"
          fill="url(#eagleGrad)"
        />
        {/* Beak tip */}
        <path
          d="M44 90 C40 94 38 100 42 102 C46 104 52 100 56 95 L50 96 Z"
          fill="url(#eagleGrad)"
        />
      </g>

      {/* Eye */}
      <g style={{ animation: "headDrop 0.4s ease 0.8s both" }}>
        <ellipse cx="62" cy="52" rx="6" ry="5" fill="#1a2035" />
        <ellipse cx="62" cy="52" rx="3.5" ry="3" fill="rgba(10,15,30,0.9)" />
        {/* Eye gleam */}
        <circle cx="64" cy="50.5" r="1" fill="rgba(255,255,255,0.5)" />
        {/* Brow */}
        <path d="M56 46 C59 43 65 43 68 45" stroke="rgba(30,40,60,0.8)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>

      {/* Feathers / beard — fade in last */}
      <g style={{ animation: "textFadeIn 0.6s ease 0.9s both" }}>
        <path
          d="M60 88 C57 92 55 97 53 102 C51 107 53 110 56 108 C59 106 62 101 64 96 Z"
          fill="url(#eagleGrad)"
          opacity="0.9"
        />
        <path
          d="M64 90 C62 95 61 101 60 107 C59 112 62 114 65 111 C68 108 69 102 69 96 Z"
          fill="url(#eagleGrad)"
          opacity="0.85"
        />
        <path
          d="M69 91 C68 97 68 103 68 109 C68 114 71 115 73 112 C75 109 75 103 74 97 Z"
          fill="url(#eagleGrad)"
          opacity="0.8"
        />
        <path
          d="M74 90 C74 96 75 102 76 108 C77 113 80 113 80 108 L80 90 Z"
          fill="url(#eagleGrad)"
          opacity="0.75"
        />
      </g>

      {/* Silver shimmer overlay */}
      <g style={{ animation: "textFadeIn 1s ease 1.2s both" }}>
        <path
          d="M68 20 C66 30 65 50 66 70 C67 80 70 86 74 88 L76 88 C72 86 69 79 68 70 C67 50 68 30 70 20 Z"
          fill="url(#shimmerGrad)"
          opacity="0.5"
        />
      </g>

      <defs>
        <linearGradient id="eagleGrad" x1="44" y1="18" x2="80" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e8ecf5" />
          <stop offset="50%" stopColor="#c8d4e8" />
          <stop offset="100%" stopColor="#a0aec0" />
        </linearGradient>
        <linearGradient id="shimmerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function useShouldShowSplash() {
  // Show splash only once per session (not on every navigation)
  return !sessionStorage.getItem(SPLASH_KEY);
}
