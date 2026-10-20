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

    // Persistent floating particles
    const particles = Array.from({ length: 24 }, (_, i) => ({
      angle: (i / 24) * Math.PI * 2,
      distance: 0.65 + Math.random() * 0.45,
      speed: 0.008 + Math.random() * 0.012,
      size: 1.5 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.7,
    }));

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.28;

      // Color paletting
      let primaryHex = '#00F5A0';
      let r1 = 0, g1 = 245, b1 = 160;
      let r2 = 0, g2 = 217, b2 = 245;

      if (state === 'listening') {
        primaryHex = '#00D9F5';
        r1 = 0; g1 = 217; b1 = 245;
        r2 = 139; g2 = 92; b2 = 246;
      } else if (state === 'thinking') {
        primaryHex = '#FFB020';
        r1 = 255; g1 = 176; b1 = 32;
        r2 = 255; g2 = 77; b2 = 109;
      } else if (state === 'idle') {
        primaryHex = '#00F5A0';
        r1 = 0; g1 = 245; b1 = 160;
        r2 = 0; g2 = 217; b2 = 245;
      } else if (state === 'ended') {
        primaryHex = '#94A3B8';
        r1 = 148; g1 = 163; b1 = 184;
        r2 = 100; g2 = 116; b2 = 139;
      }

      const activeAmp = state === 'speaking' || state === 'listening' ? audioLevel : 0.08;
      const pulseFactor = Math.sin(phase * 0.04) * 0.06;

      // 1. Huge ambient chromatic bloom backdrop
      const bgGlow = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.2,
        centerX, centerY, baseRadius * 2.2 + activeAmp * 40
      );
      bgGlow.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, ${0.25 + activeAmp * 0.35})`);
      bgGlow.addColorStop(0.5, `rgba(${r2}, ${g2}, ${b2}, ${0.1 + activeAmp * 0.2})`);
      bgGlow.addColorStop(1, 'rgba(5, 7, 13, 0)');

      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.3 + activeAmp * 40, 0, Math.PI * 2);
      ctx.fill();

      // 2. Circular Audio Equalizer Spectrum (32 radial spikes)
      const barCount = 36;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 + phase * 0.005;
        const barHarmonic = Math.sin(i * 3 + phase * 0.08);
        const barHeight = (4 + Math.abs(barHarmonic) * 14 + activeAmp * 32);
        
        const rInner = baseRadius * (1.1 + pulseFactor);
        const rOuter = rInner + barHeight;

        const x1 = centerX + Math.cos(angle) * rInner;
        const y1 = centerY + Math.sin(angle) * rInner;
        const x2 = centerX + Math.cos(angle) * rOuter;
        const y2 = centerY + Math.sin(angle) * rOuter;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${r2}, ${g2}, ${b2}, ${0.35 + (i % 2 === 0 ? 0.35 : 0.15)})`;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 3. Orbiting neon particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const pRadius = baseRadius * p.distance + Math.sin(p.angle * 4 + phase * 0.05) * 6;
        const px = centerX + Math.cos(p.angle) * pRadius;
        const py = centerY + Math.sin(p.angle) * pRadius;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r1}, ${g1}, ${b1}, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = primaryHex;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Multi-layered Harmonic Energy Rings
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        const points = 64;
        const ringSpeed = (ring + 1) * 0.025;
        const ringAmp = (6 + activeAmp * 20) / (ring + 1);

        for (let j = 0; j <= points; j++) {
          const theta = (j / points) * Math.PI * 2;
          const deform = Math.sin(theta * (4 + ring) + phase * ringSpeed) * ringAmp;
          const rad = baseRadius * (0.92 + ring * 0.12) + deform;
          const x = centerX + Math.cos(theta) * rad;
          const y = centerY + Math.sin(theta) * rad;

          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.strokeStyle = ring === 0 ? `rgba(${r1}, ${g1}, ${b1}, 0.85)` : `rgba(${r2}, ${g2}, ${b2}, 0.5)`;
        ctx.lineWidth = ring === 0 ? 2.5 : 1.5;
        ctx.shadowBlur = 16;
        ctx.shadowColor = primaryHex;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 5. High-gloss 3D Spherical Core
      const coreGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.25, centerY - baseRadius * 0.25, 2,
        centerX, centerY, baseRadius * 0.72
      );
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.2, `rgba(${r1}, ${g1}, ${b1}, 0.95)`);
      coreGrad.addColorStop(0.65, `rgba(${r2}, ${g2}, ${b2}, 0.6)`);
      coreGrad.addColorStop(1, 'rgba(10, 16, 30, 0.95)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * (0.62 + pulseFactor + activeAmp * 0.15), 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 30;
      ctx.shadowColor = primaryHex;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner refractive ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * (0.62 + pulseFactor + activeAmp * 0.15), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      phase += 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, size]);

  return (
    <div className="relative flex items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="transition-transform duration-300 drop-shadow-[0_0_35px_rgba(0,245,160,0.25)]"
      />
    </div>
  );
};
