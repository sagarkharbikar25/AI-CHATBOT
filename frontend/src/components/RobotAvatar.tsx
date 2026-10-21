import React, { useEffect, useRef, useState } from 'react';
import type { CallState } from '../types';

interface RobotAvatarProps {
  state: CallState;
  audioLevel?: number; // 0.0 to 1.0
  size?: number;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  state,
  audioLevel = 0,
  size = 220,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthPhase, setMouthPhase] = useState(0);

  // Natural blinking timer
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3800 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Speech animation loop for mouth/energy waves
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setMouthPhase((prev) => (prev + 0.15) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    if (state === 'speaking') {
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [state]);

  // Load image and chroma-key the solid cyan background to transparent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = '/bot_avatar.png';
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const w = size;
      const h = size;
      canvas.width = w;
      canvas.height = h;

      // Temporary canvas to process pixels
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(img, 0, 0);
      const imgData = offCtx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;

      // Sample corner color (solid cyan background in reference image)
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean color distance from background
        const dist = Math.sqrt(
          (r - bgR) ** 2 +
          (g - bgG) ** 2 +
          (b - bgB) ** 2
        );

        if (dist < 42) {
          data[i + 3] = 0; // Fully transparent
        } else if (dist < 65) {
          // Antialiased edge
          const factor = (dist - 42) / (65 - 42);
          data[i + 3] = Math.floor(factor * 255);
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(offCanvas, 0, 0, w, h);
    };
  }, [size]);

  // Dynamic visual parameters based on callState & audioLevel
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';

  // Dynamic glow color
  const glowColor = isSpeaking
    ? 'rgba(255, 42, 85, 0.65)'
    : isListening
    ? 'rgba(0, 229, 255, 0.65)'
    : isThinking
    ? 'rgba(255, 176, 32, 0.65)'
    : 'rgba(0, 229, 255, 0.35)';

  const eyeColor = isSpeaking
    ? '#FF2A55'
    : isThinking
    ? '#FFB020'
    : '#00E5FF';

  // Voice scale bounce reacting to audioLevel
  const audioBounce = isSpeaking ? 1 + audioLevel * 0.08 : isListening ? 1 + audioLevel * 0.04 : 1;

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size + 30 }}
    >
      {/* Ambient Audio/Status Aura */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-300 blur-2xl"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: glowColor,
          opacity: 0.4 + (audioLevel * 0.4),
          transform: `translate(-50%, -50%) scale(${1 + audioLevel * 0.2})`,
        }}
      />

      {/* Floating Levitation Container (Animated 3D Bobbing Physics) */}
      <div
        className="relative z-10 transition-transform duration-75"
        style={{
          animation: 'bot-levitate 3.6s ease-in-out infinite',
          transform: `scale(${audioBounce})`,
        }}
      >
        {/* Robot Chassis Canvas */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="relative z-10 block pointer-events-none"
          style={{ filter: `drop-shadow(0 10px 20px rgba(0,0,0,0.6))` }}
        />

        {/* Dynamic Glowing Digital OLED Visor Overlay (Eyes & Facial Expressions) */}
        <div
          className="absolute z-20 pointer-events-none flex items-center justify-center"
          style={{
            top: `${size * 0.375}px`,
            left: `${size * 0.355}px`,
            width: `${size * 0.29}px`,
            height: `${size * 0.11}px`,
          }}
        >
          {isThinking ? (
            /* Thinking / Synthesizing Expression: Rotating Cyber Scan Rings */
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: eyeColor, borderTopColor: 'transparent' }}
              />
              <div
                className="w-4 h-4 rounded-full border-2 border-b-transparent animate-spin"
                style={{ borderColor: eyeColor, borderBottomColor: 'transparent', animationDirection: 'reverse' }}
              />
            </div>
          ) : isBlinking ? (
            /* Blinking State: Sleek closed eye slits */
            <div className="flex items-center justify-between w-full px-2">
              <span
                className="h-1 w-5 rounded-full transition-all"
                style={{ background: eyeColor, boxShadow: `0 0 12px ${eyeColor}` }}
              />
              <span
                className="h-1 w-5 rounded-full transition-all"
                style={{ background: eyeColor, boxShadow: `0 0 12px ${eyeColor}` }}
              />
            </div>
          ) : isSpeaking ? (
            /* Speaking State: Animated cheerful expressive curved arcs reacting to voice */
            <div className="flex flex-col items-center justify-center w-full">
              <div className="flex items-center justify-between w-full px-1">
                {/* Left Animated Eye Arc */}
                <svg
                  width={size * 0.13}
                  height={size * 0.08}
                  viewBox="0 0 32 20"
                  fill="none"
                  style={{ filter: `drop-shadow(0 0 10px ${eyeColor})` }}
                >
                  <path
                    d={`M 4 16 Q 16 ${4 - Math.sin(mouthPhase) * 6} 28 16`}
                    stroke={eyeColor}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Right Animated Eye Arc */}
                <svg
                  width={size * 0.13}
                  height={size * 0.08}
                  viewBox="0 0 32 20"
                  fill="none"
                  style={{ filter: `drop-shadow(0 0 10px ${eyeColor})` }}
                >
                  <path
                    d={`M 4 16 Q 16 ${4 - Math.sin(mouthPhase + 0.5) * 6} 28 16`}
                    stroke={eyeColor}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Dynamic Sound Wave Pulse Below Eyes */}
              <div className="flex items-center gap-1 mt-1">
                <span
                  className="w-1 rounded-full transition-all"
                  style={{
                    height: 3 + audioLevel * 8,
                    background: eyeColor,
                    boxShadow: `0 0 6px ${eyeColor}`,
                  }}
                />
                <span
                  className="w-1 rounded-full transition-all"
                  style={{
                    height: 5 + audioLevel * 14,
                    background: eyeColor,
                    boxShadow: `0 0 8px ${eyeColor}`,
                  }}
                />
                <span
                  className="w-1 rounded-full transition-all"
                  style={{
                    height: 3 + audioLevel * 8,
                    background: eyeColor,
                    boxShadow: `0 0 6px ${eyeColor}`,
                  }}
                />
              </div>
            </div>
          ) : isListening ? (
            /* Listening State: Attentive rounded eyes curious and tracking audio */
            <div className="flex items-center justify-between w-full px-1.5">
              <div
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  background: eyeColor,
                  boxShadow: `0 0 14px ${eyeColor}`,
                  transform: `scale(${1 + audioLevel * 0.25})`,
                }}
              />
              <div
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  background: eyeColor,
                  boxShadow: `0 0 14px ${eyeColor}`,
                  transform: `scale(${1 + audioLevel * 0.25})`,
                }}
              />
            </div>
          ) : (
            /* Idle / Standby State: Signature friendly smiling arcs (^ ^) */
            <div className="flex items-center justify-between w-full px-1">
              <svg
                width={size * 0.13}
                height={size * 0.08}
                viewBox="0 0 32 20"
                fill="none"
                style={{ filter: `drop-shadow(0 0 10px ${eyeColor})` }}
              >
                <path
                  d="M 4 15 Q 16 3 28 15"
                  stroke={eyeColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                width={size * 0.13}
                height={size * 0.08}
                viewBox="0 0 32 20"
                fill="none"
                style={{ filter: `drop-shadow(0 0 10px ${eyeColor})` }}
              >
                <path
                  d="M 4 15 Q 16 3 28 15"
                  stroke={eyeColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Floating Dynamic Shadow on Console Base */}
      <div
        className="w-24 h-3 rounded-full bg-black/60 blur-md pointer-events-none transition-all duration-300"
        style={{
          animation: 'bot-shadow 3.6s ease-in-out infinite',
        }}
      />
    </div>
  );
};
