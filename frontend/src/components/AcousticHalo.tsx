import React, { useEffect, useRef } from 'react';
import type { CallState } from '../types';

interface AcousticHaloProps {
  state: CallState;
  audioLevel?: number; // 0.0 to 1.0
  size?: number;
}

export const AcousticHalo: React.FC<AcousticHaloProps> = ({
  state,
  audioLevel = 0,
  size = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.32;

      // Color scheme according to state
      let primaryColor = 'rgba(0, 245, 160, '; // Mint
      let secondaryColor = 'rgba(0, 217, 245, '; // Cyan
      let glowColor = 'rgba(0, 245, 160, 0.4)';

      if (state === 'listening') {
        primaryColor = 'rgba(0, 217, 245, ';
        secondaryColor = 'rgba(139, 92, 246, ';
        glowColor = 'rgba(0, 217, 245, 0.4)';
      } else if (state === 'thinking') {
        primaryColor = 'rgba(255, 176, 32, ';
        secondaryColor = 'rgba(255, 77, 109, ';
        glowColor = 'rgba(255, 176, 32, 0.4)';
      } else if (state === 'idle' || state === 'ended') {
        primaryColor = 'rgba(148, 163, 184, ';
        secondaryColor = 'rgba(71, 85, 105, ';
        glowColor = 'rgba(148, 163, 184, 0.15)';
      }

      // Outer radial glow
      const radialGrad = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.5,
        centerX, centerY, baseRadius * 1.5 + audioLevel * 35
      );
      radialGrad.addColorStop(0, primaryColor + (0.15 + audioLevel * 0.3) + ')');
      radialGrad.addColorStop(1, 'rgba(7, 10, 17, 0)');

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.6 + audioLevel * 35, 0, Math.PI * 2);
      ctx.fill();

      // Multi-layered organic sine waves
      const waveCount = state === 'speaking' || state === 'listening' ? 3 : 1;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const points = 64;
        const waveSpeed = (w + 1) * 0.03;
        const waveAmp = (state === 'speaking' || state === 'listening' ? 12 + audioLevel * 28 : 3) / (w + 1);

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const harmonic = Math.sin(angle * (5 + w) + phase * waveSpeed) * waveAmp;
          const r = baseRadius + harmonic + (w * 4);
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.strokeStyle = (w % 2 === 0 ? primaryColor : secondaryColor) + (0.7 - w * 0.2) + ')';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        ctx.stroke();
      }

      // Center core orb
      const coreGrad = ctx.createRadialGradient(
        centerX - 8, centerY - 8, 4,
        centerX, centerY, baseRadius * 0.55
      );
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.3, primaryColor + '0.8)');
      coreGrad.addColorStop(1, primaryColor + '0.1)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * (0.45 + audioLevel * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 25;
      ctx.shadowColor = glowColor;
      ctx.fill();

      phase += 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, size]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="transition-transform duration-300"
      />
    </div>
  );
};
