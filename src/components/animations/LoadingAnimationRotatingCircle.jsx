"use client";

import { LOADING } from "@/config/design";
import usePageLoad from "@/hooks/usePageLoad";

/**
 * Loading screen — all constants come from LOADING in src/config/design.js.
 *
 * The word set on the circle, its size/tracking, the ring geometry, colours and
 * the three animation speeds are editable there. CSS-only, painted at full
 * opacity in the SSR HTML, so it is visible before hydration.
 *
 * IMPORTANT: `isLoading` is honoured. This component is a fixed, full-screen
 * overlay (z-index 99999); rendering it unconditionally hid the whole app —
 * that is exactly what stranded the home page on "LOADING" forever. Callers
 * that render it conditionally can keep doing so; callers that pass a flag
 * (the layout used to) now get a real on/off switch.
 *
 * `holdsGate` mirrors LoadingAnimation: while a PAGE shows this loader it can
 * hold the shell-wide page-load gate. A global instance should pass
 * `holdsGate={false}` so it never waits on itself.
 */
export default function LoadingAnimationRotatingCircle({ isLoading = true, holdsGate = true }) {
  usePageLoad(Boolean(isLoading) && holdsGate);

  if (!isLoading) return null;

  const { text, ariaLabel, colors, sizes, timings } = LOADING;

  return (
    <div className="dj-load" role="status" aria-live="polite" aria-label={ariaLabel}>
      <style>{`
        .dj-load{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:${colors.background};color:${colors.ink};cursor:wait}
        .dj-load__mark{position:relative;width:${sizes.box}px;height:${sizes.box}px;display:grid;place-items:center}
        .dj-load__ring{position:absolute;inset:${sizes.ringInset}px;border-radius:50%;border:1px solid ${colors.ring}}
        .dj-load__arc{position:absolute;inset:0;animation:djSpin ${timings.arc} linear infinite}
        .dj-load__arc text{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;font-size:${sizes.text}px;letter-spacing:${sizes.tracking};fill:${colors.ink}}
        .dj-load__core{position:absolute;width:${sizes.core}px;height:${sizes.core}px;border-radius:50%;border:1px solid ${colors.core};animation:djSpin ${timings.core} linear infinite reverse}
        .dj-load__core::after{content:"";position:absolute;top:-2.5px;left:50%;width:${sizes.dot}px;height:${sizes.dot}px;border-radius:50%;background:${colors.ink};transform:translateX(-50%)}
        .dj-load__dot{position:absolute;width:${sizes.dot}px;height:${sizes.dot}px;border-radius:50%;background:${colors.ink};animation:djPulse ${timings.dot} ease-in-out infinite}
        @keyframes djSpin{to{transform:rotate(360deg)}}
        @keyframes djPulse{0%,100%{opacity:.22;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
        @media (prefers-reduced-motion: reduce){.dj-load__arc,.dj-load__core,.dj-load__dot{animation:none}}
      `}</style>

      <div className="dj-load__mark">
        <div className="dj-load__ring" aria-hidden="true" />

        <svg className="dj-load__arc" viewBox={`0 0 ${sizes.box} ${sizes.box}`} aria-hidden="true">
          <defs>
            <path
              id="djLoadPath"
              d={`M${sizes.box / 2},${sizes.box / 2} m-${sizes.box / 2 - 22},0 a${sizes.box / 2 - 22},${sizes.box / 2 - 22} 0 1,1 ${sizes.box - 44},0 a${sizes.box / 2 - 22},${sizes.box / 2 - 22} 0 1,1 -${sizes.box - 44},0`}
            />
          </defs>
          <text>
            <textPath href="#djLoadPath" startOffset="0">
              {text}
            </textPath>
          </text>
        </svg>

        <div className="dj-load__core" aria-hidden="true" />
        <div className="dj-load__dot" aria-hidden="true" />
      </div>
    </div>
  );
}
