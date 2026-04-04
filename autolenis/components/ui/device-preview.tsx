"use client"

import { type ReactNode } from "react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DevicePreviewProps {
  /** Device frame style */
  type?: "laptop" | "tablet" | "iphone" | "android"
  /** Content rendered inside the device screen */
  children: ReactNode
  /** Wrapper className */
  className?: string
  /** Inner screen className */
  screenClassName?: string
  /** Enable 3D perspective tilt */
  tilt?: boolean
  /**
   * When true the tilt engages only at `sm:` and above (flat on mobile).
   * Ignored when `tilt` is false.
   */
  responsiveTilt?: boolean
  /** Optional subtle glow behind the device */
  glow?: boolean
  /**
   * Custom CSS animation name override. Expected values:
   * `device-float-phone-left`, `device-float-phone-right`,
   * `device-float-laptop`, `device-float-tablet`
   */
  animationName?: string
  /** Custom animation delay (CSS time value, e.g. "0.6s") for stagger effects */
  animationDelay?: string
}

/* ------------------------------------------------------------------ */
/*  DevicePreview — premium device mockup with responsive treatment    */
/* ------------------------------------------------------------------ */

export function DevicePreview({
  type = "laptop",
  children,
  className = "",
  screenClassName = "",
  tilt = true,
  responsiveTilt = false,
  glow = false,
  animationName,
  animationDelay,
}: DevicePreviewProps) {
  if (type === "tablet") {
    return (
      <TabletFrame
        className={className}
        screenClassName={screenClassName}
        tilt={tilt}
        responsiveTilt={responsiveTilt}
        glow={glow}
      >
        {children}
      </TabletFrame>
    )
  }

  if (type === "iphone") {
    return (
      <IPhoneFrame
        className={className}
        screenClassName={screenClassName}
        tilt={tilt}
        glow={glow}
        animationName={animationName}
        animationDelay={animationDelay}
      >
        {children}
      </IPhoneFrame>
    )
  }

  if (type === "android") {
    return (
      <AndroidPhoneFrame
        className={className}
        screenClassName={screenClassName}
        tilt={tilt}
        glow={glow}
        animationName={animationName}
        animationDelay={animationDelay}
      >
        {children}
      </AndroidPhoneFrame>
    )
  }

  return (
    <LaptopFrame
      className={className}
      screenClassName={screenClassName}
      tilt={tilt}
      glow={glow}
    >
      {children}
    </LaptopFrame>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared material constants                                          */
/* ------------------------------------------------------------------ */

/** Multi-layer aluminum gradient — mimics brushed anodized surface */
const ALUMINUM_BODY =
  "linear-gradient(160deg, #f5f5f7 0%, #ececee 8%, #e2e2e6 18%, #d8d8dc 32%, #e0e0e4 46%, #d6d6da 60%, #dcdce0 74%, #e4e4e8 86%, #f0f0f2 100%)"

/** Darker space-gray aluminum variant for Android */
const ALUMINUM_BODY_DARK =
  "linear-gradient(160deg, #dcdce0 0%, #d4d4d8 12%, #cacace 26%, #c8c8cc 40%, #d0d0d4 54%, #c6c6ca 68%, #ccccd0 82%, #d6d6da 100%)"

/** Top-edge specular streak */
const SPECULAR_TOP =
  "linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.0) 15%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0.0) 85%, transparent 96%)"

/** Left/right edge catchlight */
const SPECULAR_LEFT =
  "linear-gradient(180deg, transparent 4%, rgba(255,255,255,0.55) 25%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.55) 75%, transparent 96%)"

const SPECULAR_RIGHT =
  "linear-gradient(180deg, transparent 4%, rgba(255,255,255,0.40) 25%, rgba(255,255,255,0.60) 50%, rgba(255,255,255,0.40) 75%, transparent 96%)"

/** Screen glass sheen — subtle diagonal highlight across the display */
const GLASS_SHEEN =
  "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 40%, transparent 60%)"

/* ------------------------------------------------------------------ */
/*  LaptopFrame — MacBook-accurate lid + keyboard base                 */
/* ------------------------------------------------------------------ */

function LaptopFrame({
  children,
  className,
  screenClassName,
  tilt,
  glow,
}: Omit<DevicePreviewProps, "type" | "responsiveTilt">) {
  return (
    <div
      className={`relative w-full select-none ${className}`}
      style={{ perspective: tilt ? "1600px" : "none" }}
    >
      {/* Ambient glow */}
      {glow && (
        <div
          className="absolute inset-0 -z-10 scale-[0.80] rounded-[48px] blur-[56px] pointer-events-none"
          style={{
            opacity: 0.09,
            background:
              "radial-gradient(ellipse at center, var(--brand-purple), transparent 72%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Floating tilt wrapper */}
      <div
        style={{
          animation: tilt
            ? "device-float-laptop 5s cubic-bezier(0.45, 0, 0.55, 1) infinite"
            : "none",
          transformStyle: "preserve-3d",
          willChange: tilt ? "transform" : "auto",
        }}
      >
        {/* ============================================================ */}
        {/*  DISPLAY LID                                                 */}
        {/* ============================================================ */}
        <div
          className="relative rounded-t-[10px] sm:rounded-t-[14px]"
          style={{
            background: ALUMINUM_BODY,
            /* Multi-layer shadow: outer drop + inset rim lights */
            boxShadow: [
              "0 -1px 0 rgba(255,255,255,0.70) inset",   /* top rim */
              "1px 0 0 rgba(255,255,255,0.35) inset",    /* left rim */
              "-1px 0 0 rgba(255,255,255,0.25) inset",   /* right rim */
              "0 2px 0 rgba(0,0,0,0.07)",                /* lid bottom edge shadow */
              "0 28px 56px -14px rgba(0,0,0,0.22)",      /* main drop shadow */
              "0 10px 24px -8px rgba(0,0,0,0.12)",       /* close diffuse */
              "0 0 0 0.5px rgba(0,0,0,0.06)",            /* hairline border */
            ].join(", "),
            padding: "3px 3px 0 3px",
          }}
        >
          {/* Top edge specular streak */}
          <div
            className="absolute top-0 left-[6%] right-[6%] h-[1px] rounded-full pointer-events-none"
            style={{ background: SPECULAR_TOP }}
            aria-hidden="true"
          />
          {/* Left edge catchlight */}
          <div
            className="absolute top-[4%] bottom-[4%] left-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_LEFT }}
            aria-hidden="true"
          />
          {/* Right edge catchlight */}
          <div
            className="absolute top-[4%] bottom-[4%] right-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_RIGHT }}
            aria-hidden="true"
          />

          {/* Apple logo indent — subtle debossed oval */}
          <div
            className="absolute top-[10px] left-1/2 -translate-x-1/2 pointer-events-none"
            aria-hidden="true"
            style={{
              width: "14px",
              height: "17px",
              background: "rgba(0,0,0,0.00)",
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.04), inset 0 0.5px 0 rgba(255,255,255,0.4)",
              borderRadius: "2px 2px 3px 3px",
              opacity: 0.5,
            }}
          />

          {/* Black display glass */}
          <div
            className="relative overflow-hidden rounded-t-[8px] sm:rounded-t-[11px]"
            style={{ background: "#050508" }}
          >
            {/* Top bezel with camera notch housing */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: "16px" }}
              aria-hidden="true"
            >
              {/* Camera housing — slightly raised rectangle */}
              <div
                style={{
                  width: "52px",
                  height: "12px",
                  background: "#050508",
                  borderRadius: "0 0 5px 5px",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
              >
                {/* Mic dot */}
                <div
                  style={{
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    background: "#161618",
                    boxShadow: "0 0 0 0.5px rgba(255,255,255,0.06)",
                  }}
                />
                {/* Camera lens — realistic lens ring */}
                <div
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 35%, #2a2a2e 0%, #0e0e10 60%, #050508 100%)",
                    boxShadow: "0 0 0 0.75px rgba(255,255,255,0.10), 0 0 0 1.5px rgba(0,0,0,0.6), inset 0 0.5px 0 rgba(255,255,255,0.06)",
                  }}
                />
                {/* Green activity dot — off */}
                <div
                  style={{
                    width: "2px",
                    height: "2px",
                    borderRadius: "50%",
                    background: "#0c1a10",
                    boxShadow: "0 0 0 0.5px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            </div>

            {/* Screen content */}
            <div
              className={`relative overflow-hidden bg-background flex flex-col ${screenClassName}`}
              style={{ margin: "0 2px 2px 2px", borderRadius: "2px" }}
            >
              {/* Glass sheen overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{ background: GLASS_SHEEN }}
                aria-hidden="true"
              />
              {children}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  HINGE — thin machined band connecting lid to body           */}
        {/* ============================================================ */}
        <div
          aria-hidden="true"
          style={{
            height: "4px",
            margin: "0 1px",
            background:
              "linear-gradient(180deg, #c8c8cc 0%, #d8d8dc 40%, #d0d0d4 70%, #c6c6ca 100%)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.10), 0 -0.5px 0 rgba(255,255,255,0.35) inset",
          }}
        />

        {/* ============================================================ */}
        {/*  KEYBOARD BASE — aluminum slab with subtle texture           */}
        {/* ============================================================ */}
        <div
          aria-hidden="true"
          className="relative"
          style={{
            height: "22px",
            borderRadius: "0 0 8px 8px",
            background:
              "linear-gradient(180deg, #e0e0e4 0%, #d8d8dc 30%, #d2d2d6 60%, #ccccd0 100%)",
            borderRight: "1px solid rgba(200,200,210,0.55)",
            borderBottom: "1px solid rgba(200,200,210,0.55)",
            borderLeft: "1px solid rgba(200,200,210,0.55)",
            boxShadow: [
              "0 6px 16px -5px rgba(0,0,0,0.14)",
              "0 2px 6px -2px rgba(0,0,0,0.08)",
              "0 1px 0 rgba(255,255,255,0.55) inset",
            ].join(", "),
          }}
        >
          {/* Keyboard surface texture hint */}
          <div
            style={{
              position: "absolute",
              top: "3px",
              left: "10%",
              right: "10%",
              height: "10px",
              borderRadius: "2px",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.05) 100%)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.3) inset, 0 -0.5px 0 rgba(0,0,0,0.05) inset",
            }}
          />
          {/* Trackpad */}
          <div
            style={{
              position: "absolute",
              bottom: "3px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "22%",
              height: "6px",
              borderRadius: "3px",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.06) 100%)",
              boxShadow:
                "0 0 0 0.5px rgba(0,0,0,0.06), 0 0.5px 0 rgba(255,255,255,0.25) inset",
            }}
          />
          {/* Bottom edge highlight */}
          <div
            style={{
              position: "absolute",
              bottom: "0",
              left: "8%",
              right: "8%",
              height: "1px",
              borderRadius: "999px",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            }}
          />
          {/* Front lip indent (opening notch) */}
          <div
            style={{
              position: "absolute",
              bottom: "0",
              left: "50%",
              transform: "translateX(-50%)",
              width: "14%",
              height: "3px",
              borderRadius: "2px 2px 0 0",
              background: "rgba(0,0,0,0.05)",
              boxShadow: "0 -0.5px 0 rgba(255,255,255,0.2) inset",
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TabletFrame — iPad Pro with precision-machined aluminum shell       */
/* ------------------------------------------------------------------ */

function TabletFrame({
  children,
  className,
  screenClassName,
  tilt,
  responsiveTilt,
  glow,
}: Omit<DevicePreviewProps, "type">) {
  const useCssTilt = tilt && responsiveTilt

  return (
    <div
      className={`relative w-full select-none ${className}`}
      style={{ perspective: tilt ? "1800px" : "none" }}
    >
      {glow && (
        <div
          className="absolute inset-0 -z-10 scale-[0.82] rounded-[48px] blur-[60px] pointer-events-none"
          style={{
            opacity: 0.07,
            background:
              "radial-gradient(ellipse at center, var(--brand-purple), transparent 72%)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        {...(useCssTilt ? { "data-device-tilt": "" } : {})}
        style={{
          ...(!useCssTilt
            ? {
                animation: tilt
                  ? "device-float-tablet 5s cubic-bezier(0.45, 0, 0.55, 1) infinite"
                  : "none",
              }
            : {}),
          transformStyle: "preserve-3d",
          willChange: tilt ? "transform" : "auto",
        }}
      >
        {/* Outer aluminum shell */}
        <div
          className="relative"
          style={{
            borderRadius: "16px",
            background: ALUMINUM_BODY,
            boxShadow: [
              "0 -1px 0 rgba(255,255,255,0.65) inset",
              "1px 0 0 rgba(255,255,255,0.30) inset",
              "-1px 0 0 rgba(255,255,255,0.22) inset",
              "0 1px 0 rgba(0,0,0,0.07)",
              "0 24px 52px -14px rgba(0,0,0,0.20)",
              "0 10px 24px -8px rgba(0,0,0,0.10)",
              "0 0 0 0.5px rgba(0,0,0,0.05)",
            ].join(", "),
            padding: "3px",
          }}
        >
          {/* Edge highlights */}
          <div
            className="absolute top-0 left-[5%] right-[5%] h-[1px] rounded-full pointer-events-none"
            style={{ background: SPECULAR_TOP }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[4%] bottom-[4%] left-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_LEFT }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[4%] bottom-[4%] right-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_RIGHT }}
            aria-hidden="true"
          />

          {/* Speaker grilles — left & right */}
          <div
            className="absolute left-[3px] top-1/2 -translate-y-1/2 flex flex-col gap-[2px] pointer-events-none"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: "1.5px",
                  height: "4px",
                  borderRadius: "1px",
                  background: "rgba(0,0,0,0.12)",
                  boxShadow: "0 0.5px 0 rgba(255,255,255,0.25) inset",
                }}
              />
            ))}
          </div>
          <div
            className="absolute right-[3px] top-1/2 -translate-y-1/2 flex flex-col gap-[2px] pointer-events-none"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: "1.5px",
                  height: "4px",
                  borderRadius: "1px",
                  background: "rgba(0,0,0,0.12)",
                  boxShadow: "0 0.5px 0 rgba(255,255,255,0.25) inset",
                }}
              />
            ))}
          </div>

          {/* Top button */}
          <div
            className="absolute top-[3px] right-[22%] pointer-events-none"
            aria-hidden="true"
            style={{
              width: "10%",
              height: "2px",
              borderRadius: "0 0 2px 2px",
              background:
                "linear-gradient(180deg, #c8c8cc, #d8d8dc)",
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.08)",
            }}
          />

          {/* Display glass */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "13px",
              background: "#040406",
            }}
          >
            {/* Top bezel with front camera */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: "10px" }}
              aria-hidden="true"
            >
              {/* Camera — TrueDepth system */}
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 35%, #2a2a2e 0%, #0e0e10 65%, #040406 100%)",
                  boxShadow:
                    "0 0 0 0.75px rgba(255,255,255,0.10), 0 0 0 1.5px rgba(0,0,0,0.6)",
                }}
              />
            </div>

            {/* Screen content */}
            <div
              className={`relative overflow-hidden bg-background flex flex-col ${screenClassName}`}
              style={{ margin: "0 2px 2px 2px", borderRadius: "2px" }}
            >
              {/* Glass sheen overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{ background: GLASS_SHEEN }}
                aria-hidden="true"
              />
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  IPhoneFrame — Titanium-finish iPhone with Dynamic Island           */
/* ------------------------------------------------------------------ */

function IPhoneFrame({
  children,
  className,
  screenClassName,
  tilt,
  glow,
  animationName,
  animationDelay,
}: Omit<DevicePreviewProps, "type" | "responsiveTilt">) {
  return (
    /* Fixed width + explicit padding so the protruding buttons are never clipped */
    /* 240 px ≈ iPhone 15 Pro Max proportions (6.7" display, 19.5:9 ratio) */
    <div
      className={`relative select-none ${className}`}
      style={{
        width: "240px",
        paddingLeft: "6px",
        paddingRight: "6px",
        perspective: tilt ? "1200px" : "none",
      }}
    >
      {glow && (
        <div
          className="absolute inset-0 -z-10 scale-[0.82] rounded-[48px] blur-[50px] pointer-events-none"
          style={{
            opacity: 0.07,
            background:
              "radial-gradient(ellipse at center, var(--brand-purple), transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        style={{
          animation: tilt
            ? `${animationName ?? "device-float-phone-left"} 5s cubic-bezier(0.45, 0, 0.55, 1) infinite`
            : "none",
          animationDelay: animationDelay ?? "0s",
          transformStyle: "preserve-3d",
          willChange: tilt ? "transform" : "auto",
          position: "relative",
        }}
      >
        {/* Titanium outer frame — squared-off edges like iPhone 15 Pro */}
        <div
          className="relative"
          style={{
            background:
              "linear-gradient(160deg, #f2f2f4 0%, #e8e8ea 10%, #dedee0 22%, #d6d6d8 35%, #dcdcde 50%, #d4d4d6 65%, #dadada 80%, #eeeeef 100%)",
            borderRadius: "32px",
            boxShadow: [
              "0 -1px 0 rgba(255,255,255,0.60) inset",
              "1px 0 0 rgba(255,255,255,0.30) inset",
              "-1px 0 0 rgba(255,255,255,0.22) inset",
              "0 0 0 0.75px rgba(0,0,0,0.08)",
              "0 28px 56px -14px rgba(0,0,0,0.22)",
              "0 12px 24px -8px rgba(0,0,0,0.12)",
            ].join(", "),
            padding: "3px",
          }}
        >
          {/* Edge specular highlights */}
          <div
            className="absolute top-0 left-[12%] right-[12%] h-[1px] rounded-full pointer-events-none"
            style={{ background: SPECULAR_TOP }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[8%] bottom-[8%] left-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_LEFT }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[8%] bottom-[8%] right-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_RIGHT }}
            aria-hidden="true"
          />

          {/* Display glass — ceramic shield */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "30px",
              background: "#040406",
            }}
          >
            {/* Top bezel with Dynamic Island */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: "20px" }}
              aria-hidden="true"
            >
              {/* Dynamic Island pill — wide enough to show camera + sensor */}
              <div
                style={{
                  width: "60px",
                  height: "14px",
                  background: "#040406",
                  borderRadius: "14px",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.06), inset 0 0.5px 0 rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {/* Front-facing camera lens */}
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 36% 36%, #252528 0%, #0c0c0e 65%, #040406 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.10), 0 0 0 2px rgba(0,0,0,0.55), inset 0 0.5px 0 rgba(255,255,255,0.08)",
                  }}
                />
                {/* Proximity / LiDAR dot */}
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 40% 40%, #18181c, #0a0a0c)",
                    boxShadow: "0 0 0 0.75px rgba(255,255,255,0.07)",
                  }}
                />
              </div>
            </div>

            {/* Screen content */}
            <div
              className={`relative overflow-hidden bg-background flex flex-col ${screenClassName}`}
              style={{
                margin: "0 2px 2px 2px",
                borderRadius: "4px 4px 28px 28px",
                aspectRatio: "9 / 19.5",
              }}
            >
              {/* Glass sheen */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{ background: GLASS_SHEEN }}
                aria-hidden="true"
              />
              {children}
            </div>

            {/* Bottom home indicator bar */}
            <div
              aria-hidden="true"
              style={{
                height: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "3px",
                  borderRadius: "2px",
                  background: "rgba(255,255,255,0.18)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ---- Physical side buttons ---- */}
        {/* Power / side button — right */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            right: "-2px",
            top: "24%",
            width: "3px",
            height: "18%",
            borderRadius: "0 2px 2px 0",
            background:
              "linear-gradient(180deg, #ccccd0 0%, #dcdce0 35%, #d4d4d8 65%, #c8c8cc 100%)",
            boxShadow: "1.5px 0 0 rgba(0,0,0,0.10), -0.5px 0 0 rgba(255,255,255,0.25) inset",
          }}
        />
        {/* Mute / Action button — left, shorter */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            left: "-2px",
            top: "17%",
            width: "3px",
            height: "7%",
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(180deg, #ccccd0, #dcdce0, #ccccd0)",
            boxShadow: "-1.5px 0 0 rgba(0,0,0,0.10), 0.5px 0 0 rgba(255,255,255,0.22) inset",
          }}
        />
        {/* Volume up — left */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            left: "-2px",
            top: "28%",
            width: "3px",
            height: "11%",
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(180deg, #ccccd0, #dcdce0, #ccccd0)",
            boxShadow: "-1.5px 0 0 rgba(0,0,0,0.10), 0.5px 0 0 rgba(255,255,255,0.22) inset",
          }}
        />
        {/* Volume down — left */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            left: "-2px",
            top: "43%",
            width: "3px",
            height: "11%",
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(180deg, #ccccd0, #dcdce0, #ccccd0)",
            boxShadow: "-1.5px 0 0 rgba(0,0,0,0.10), 0.5px 0 0 rgba(255,255,255,0.22) inset",
          }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AndroidPhoneFrame — Premium flagship (Galaxy-style matte glass)    */
/* ------------------------------------------------------------------ */

function AndroidPhoneFrame({
  children,
  className,
  screenClassName,
  tilt,
  glow,
  animationName,
  animationDelay,
}: Omit<DevicePreviewProps, "type" | "responsiveTilt">) {
  return (
    /* Same fixed width as IPhoneFrame — 240 px ≈ Galaxy S24 Ultra (6.8" display) */
    <div
      className={`relative select-none ${className}`}
      style={{
        width: "240px",
        paddingLeft: "6px",
        paddingRight: "6px",
        perspective: tilt ? "1200px" : "none",
      }}
    >
      {glow && (
        <div
          className="absolute inset-0 -z-10 scale-[0.82] rounded-[48px] blur-[50px] pointer-events-none"
          style={{
            opacity: 0.07,
            background:
              "radial-gradient(ellipse at center, var(--brand-cyan), transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}

      <div
        style={{
          animation: tilt
            ? `${animationName ?? "device-float-phone-right"} 5s cubic-bezier(0.45, 0, 0.55, 1) infinite`
            : "none",
          animationDelay: animationDelay ?? "0s",
          transformStyle: "preserve-3d",
          willChange: tilt ? "transform" : "auto",
          position: "relative",
        }}
      >
        {/* Armored aluminum frame — darker, slightly squarer than iPhone */}
        <div
          className="relative"
          style={{
            background: ALUMINUM_BODY_DARK,
            borderRadius: "26px",
            boxShadow: [
              "0 -1px 0 rgba(255,255,255,0.50) inset",
              "1px 0 0 rgba(255,255,255,0.25) inset",
              "-1px 0 0 rgba(255,255,255,0.18) inset",
              "0 0 0 0.75px rgba(0,0,0,0.09)",
              "0 28px 56px -14px rgba(0,0,0,0.24)",
              "0 12px 24px -8px rgba(0,0,0,0.12)",
            ].join(", "),
            padding: "3px",
          }}
        >
          {/* Edge specular highlights */}
          <div
            className="absolute top-0 left-[10%] right-[10%] h-[1px] rounded-full pointer-events-none"
            style={{ background: SPECULAR_TOP }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[6%] bottom-[6%] left-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_LEFT }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[6%] bottom-[6%] right-0 w-[1px] pointer-events-none"
            style={{ background: SPECULAR_RIGHT }}
            aria-hidden="true"
          />

          {/* Display glass — Gorilla Glass Victus */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "24px",
              background: "#040406",
            }}
          >
            {/* Top bezel with centered punch-hole camera */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: "20px" }}
              aria-hidden="true"
            >
              {/* Punch-hole camera — centered, larger ring for visibility */}
              <div
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 35%, #252528 0%, #0c0c0e 60%, #040406 100%)",
                  boxShadow:
                    "0 0 0 1.5px rgba(255,255,255,0.10), 0 0 0 3px rgba(0,0,0,0.55), 0 0 6px rgba(0,0,0,0.35)",
                }}
              />
            </div>

            {/* Screen content */}
            <div
              className={`relative overflow-hidden bg-background flex flex-col ${screenClassName}`}
              style={{
                margin: "0 2px 2px 2px",
                borderRadius: "2px 2px 22px 22px",
                aspectRatio: "9 / 19.5",
              }}
            >
              {/* Matte glass sheen — slightly different angle from iPhone */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background:
                    "linear-gradient(140deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 45%, transparent 65%)",
                }}
                aria-hidden="true"
              />
              {children}
            </div>

            {/* Bottom navigation bar hint */}
            <div
              aria-hidden="true"
              style={{
                height: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              {/* Android nav pill */}
              <div
                style={{
                  width: "28px",
                  height: "3px",
                  borderRadius: "2px",
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ---- Physical side buttons ---- */}
        {/* Power button — right side */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            right: "-2px",
            top: "28%",
            width: "3px",
            height: "13%",
            borderRadius: "0 2px 2px 0",
            background:
              "linear-gradient(180deg, #bababf 0%, #cacace 35%, #c2c2c6 65%, #b8b8bc 100%)",
            boxShadow: "1.5px 0 0 rgba(0,0,0,0.11), -0.5px 0 0 rgba(255,255,255,0.20) inset",
          }}
        />
        {/* Volume up — left */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            left: "-2px",
            top: "26%",
            width: "3px",
            height: "11%",
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(180deg, #bababf, #cacace, #bababf)",
            boxShadow: "-1.5px 0 0 rgba(0,0,0,0.11), 0.5px 0 0 rgba(255,255,255,0.18) inset",
          }}
        />
        {/* Volume down — left */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            left: "-2px",
            top: "40%",
            width: "3px",
            height: "11%",
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(180deg, #bababf, #cacace, #bababf)",
            boxShadow: "-1.5px 0 0 rgba(0,0,0,0.11), 0.5px 0 0 rgba(255,255,255,0.18) inset",
          }}
        />
      </div>
    </div>
  )
}
