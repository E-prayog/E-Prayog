import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Eye, HelpCircle } from 'lucide-react';

type ObjectType = 'candle' | 'arrow' | 'letterF';

interface ObservationRow {
  srNo: number;
  objectType: string;
  u: number;
  v_calc: number;
  v_measured: number;
  f_calc: number;
  magnification: number;
  nature: string;
}

export default function ConcaveMirrorLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Optical bench physical setup
  // Total bench length: 100 cm
  // Mirror fixed at 85 cm mark
  // Focal length: f = 15 cm (Radius of curvature R = 30 cm)
  const BENCH_LENGTH = 100; // cm
  const MIRROR_BENCH_POS = 85.0; // cm mark on bench
  const FOCAL_LENGTH = 15.0; // cm (magnitude)

  // Internal physical state in ref
  const simState = useRef({
    candleBenchPos: 45.0, // cm mark on bench (so u = 85 - 45 = 40 cm)
    screenBenchPos: 61.0, // cm mark on bench (dragged by student)
    objectType: 'candle' as ObjectType,
    showRays: true,
    activeDrag: null as 'candle' | 'screen' | null,
    dragOffset: 0,
    time: 0,
    rayDashOffset: 0,
  });

  // UI state for React shell
  const [uiState, setUiState] = useState({
    candleBenchPos: 45.0,
    screenBenchPos: 61.0,
    objectType: 'candle' as ObjectType,
    showRays: true,
    u: 40.0,
    v_calc: 24.0,
    v_bench_ideal: 61.0,
    magnification: -0.6,
    isReal: true,
    isFocusSharp: false,
    nature: 'Real, Inverted, Diminished',
  });

  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [activeTab, setActiveTab] = useState<'controls' | 'table' | 'theory'>('controls');

  // Compute optical formula values
  const computeOptics = useCallback(() => {
    const s = simState.current;
    // Sign convention: Light goes from left to right towards mirror.
    // Mirror is at MIRROR_BENCH_POS.
    // Object is to the left of mirror: u is negative in Cartesian, but distance d_u = MIRROR_BENCH_POS - candleBenchPos
    const d_u = Math.max(2.0, MIRROR_BENCH_POS - s.candleBenchPos);
    const u_cartesian = -d_u;
    const f_cartesian = -FOCAL_LENGTH;

    // Mirror formula: 1/v + 1/u = 1/f => 1/v = 1/f - 1/u => v = (u * f) / (u - f)
    let v_cartesian = (u_cartesian * f_cartesian) / (u_cartesian - f_cartesian);
    const isReal = v_cartesian < 0;

    // Distance of real image from mirror (towards left)
    const d_v = isReal ? -v_cartesian : v_cartesian;
    const idealScreenBenchPos = isReal ? MIRROR_BENCH_POS - d_v : -1;

    // Magnification m = -v/u
    const m = -v_cartesian / u_cartesian;

    // Check focus sharpness: screen is close to ideal image position
    const isFocusSharp = isReal && Math.abs(s.screenBenchPos - idealScreenBenchPos) < 0.6;

    let nature = '';
    if (d_u > 2 * FOCAL_LENGTH + 0.5) {
      nature = 'Real, Inverted, Diminished';
    } else if (Math.abs(d_u - 2 * FOCAL_LENGTH) <= 0.5) {
      nature = 'Real, Inverted, Same Size';
    } else if (d_u > FOCAL_LENGTH + 0.5 && d_u < 2 * FOCAL_LENGTH) {
      nature = 'Real, Inverted, Magnified';
    } else if (Math.abs(d_u - FOCAL_LENGTH) <= 0.5) {
      nature = 'Real, Inverted, at Infinity';
    } else {
      nature = 'Virtual, Erect, Magnified (Behind Mirror)';
    }

    return {
      d_u,
      d_v: Math.min(200, Math.abs(d_v)),
      idealScreenBenchPos,
      m,
      isReal,
      isFocusSharp,
      nature,
    };
  }, []);

  const syncUI = useCallback(() => {
    const s = simState.current;
    const { d_u, d_v, idealScreenBenchPos, m, isReal, isFocusSharp, nature } = computeOptics();

    setUiState({
      candleBenchPos: Number(s.candleBenchPos.toFixed(1)),
      screenBenchPos: Number(s.screenBenchPos.toFixed(1)),
      objectType: s.objectType,
      showRays: s.showRays,
      u: Number(d_u.toFixed(1)),
      v_calc: Number(d_v.toFixed(1)),
      v_bench_ideal: Number(idealScreenBenchPos.toFixed(1)),
      magnification: Number(m.toFixed(2)),
      isReal,
      isFocusSharp,
      nature,
    });
  }, [computeOptics]);

  // Main Canvas Rendering Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = simState.current;
    const W = canvas.width;
    const H = canvas.height;

    s.time += 0.05;
    s.rayDashOffset = (s.rayDashOffset - 0.8) % 20;

    const { d_u, d_v, idealScreenBenchPos, m, isReal, isFocusSharp } = computeOptics();

    // ── 1. Lab Bench Background ──
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let x = 15; x < W; x += 22) {
      for (let y = 15; y < H; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Coordinate Mapping ──
    // Bench rail runs from benchXStart (5cm mark) to benchXEnd (95cm mark)
    const benchXStart = 70;
    const benchXEnd = W - 70;
    const benchW = benchXEnd - benchXStart;
    const benchY = H / 2 + 65; // Height of the bench rails

    const cmToPx = (benchCm: number) => {
      const clamped = Math.max(0, Math.min(BENCH_LENGTH, benchCm));
      return benchXStart + (clamped / BENCH_LENGTH) * benchW;
    };

    const pxToCm = (px: number) => {
      const norm = (px - benchXStart) / benchW;
      return Math.max(0, Math.min(BENCH_LENGTH, norm * BENCH_LENGTH));
    };

    const mirrorX = cmToPx(MIRROR_BENCH_POS);
    const candleX = cmToPx(s.candleBenchPos);
    const screenX = cmToPx(s.screenBenchPos);
    const idealImageX = cmToPx(idealScreenBenchPos);
    const focusX = cmToPx(MIRROR_BENCH_POS - FOCAL_LENGTH);
    const centerCurvX = cmToPx(MIRROR_BENCH_POS - 2 * FOCAL_LENGTH);

    const principalAxisY = benchY - 110; // Optical axis height
    const objHeight = 50; // Object height in px

    // ── 2. Optical Bench 3D Dual Rails ──
    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 10;

    // Bench Wooden Base Bed
    const bedGrad = ctx.createLinearGradient(benchXStart - 20, benchY, benchXStart - 20, benchY + 36);
    bedGrad.addColorStop(0, '#CBD5E1');
    bedGrad.addColorStop(0.3, '#E2E8F0');
    bedGrad.addColorStop(0.7, '#94A3B8');
    bedGrad.addColorStop(1, '#64748B');

    ctx.fillStyle = bedGrad;
    ctx.beginPath();
    ctx.roundRect(benchXStart - 20, benchY + 8, benchW + 40, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dual Stainless Steel Polished Rails
    const railY1 = benchY;
    const railY2 = benchY + 12;

    [railY1, railY2].forEach(ry => {
      const railGrad = ctx.createLinearGradient(0, ry - 3, 0, ry + 5);
      railGrad.addColorStop(0, '#FFFFFF');
      railGrad.addColorStop(0.5, '#CBD5E1');
      railGrad.addColorStop(1, '#475569');
      ctx.fillStyle = railGrad;
      ctx.beginPath();
      ctx.roundRect(benchXStart - 15, ry - 3, benchW + 30, 7, 2);
      ctx.fill();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // Metre Scale Painted Along Rails (0 to 100 cm)
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0F172A';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let cm = 0; cm <= 100; cm += 2) {
      const mx = cmToPx(cm);
      const isMajor = cm % 10 === 0;
      const isHalf = cm % 5 === 0;
      const tickH = isMajor ? 8 : isHalf ? 5 : 3;

      ctx.lineWidth = isMajor ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(mx, benchY + 22);
      ctx.lineTo(mx, benchY + 22 + tickH);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(`${cm}`, mx, benchY + 34);
      }
    }
    ctx.restore();

    // ── 3. Principal Optical Axis Line ──
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(benchXStart - 20, principalAxisY);
    ctx.lineTo(mirrorX + 60, principalAxisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cardinal Points on Principal Axis: F, C, P
    const drawPoint = (px: number, label: string, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, principalAxisY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, principalAxisY + 16);
    };

    drawPoint(mirrorX, 'P (Pole)', '#0EA5E9');
    drawPoint(focusX, 'F (Focus: 15cm)', '#10B981');
    drawPoint(centerCurvX, 'C (Curvature: 30cm)', '#6366F1');
    ctx.restore();

    // ── 4. Concave Mirror Mount at mirrorX ──
    ctx.save();
    // Upright Stand Base Rider on bench
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    const standGrad = ctx.createLinearGradient(mirrorX - 16, benchY, mirrorX + 16, benchY);
    standGrad.addColorStop(0, '#64748B');
    standGrad.addColorStop(0.5, '#CBD5E1');
    standGrad.addColorStop(1, '#334155');

    // Heavy cast iron rider on rail
    ctx.fillStyle = standGrad;
    ctx.beginPath();
    ctx.roundRect(mirrorX - 14, benchY - 14, 28, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Upright vertical rod
    ctx.fillRect(mirrorX - 4, principalAxisY - 10, 8, benchY - principalAxisY - 4);

    // Circular Concave Mirror Frame
    const mirrorRadius = 60;
    const arcRadius = 140;

    // Mirror back shell (Silvered Concave)
    ctx.beginPath();
    ctx.arc(mirrorX + arcRadius - 4, principalAxisY, arcRadius, Math.PI * 0.82, Math.PI * 1.18);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Polished Front Reflective Surface
    ctx.beginPath();
    ctx.arc(mirrorX + arcRadius, principalAxisY, arcRadius, Math.PI * 0.82, Math.PI * 1.18);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Silver coating hatched teeth on back of mirror
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 0;
    for (let a = Math.PI * 0.83; a <= Math.PI * 1.17; a += 0.04) {
      const sx = mirrorX + arcRadius - 4 + Math.cos(a) * arcRadius;
      const sy = principalAxisY + Math.sin(a) * arcRadius;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 6, sy + (sy > principalAxisY ? 4 : -4));
      ctx.stroke();
    }

    // Mirror label badge
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONCAVE MIRROR (f = -15 cm)', mirrorX, benchY - 22);
    ctx.restore();

    // ── 5. Draggable Object Rider (Candle / Arrow / Letter F) ──
    ctx.save();
    // Stand Rider on Rail
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = s.activeDrag === 'candle' ? '#0EA5E9' : '#475569';
    ctx.beginPath();
    ctx.roundRect(candleX - 12, benchY - 12, 24, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Vertical Stand Rod
    ctx.fillStyle = '#64748B';
    ctx.fillRect(candleX - 3, principalAxisY, 6, benchY - principalAxisY - 12);

    // Render Object Above Axis
    const objTipY = principalAxisY - objHeight;

    if (s.objectType === 'candle') {
      // Wax Candle Cylinder
      const waxGrad = ctx.createLinearGradient(candleX - 8, principalAxisY, candleX + 8, principalAxisY);
      waxGrad.addColorStop(0, '#FEF3C7');
      waxGrad.addColorStop(0.5, '#FDE68A');
      waxGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = waxGrad;
      ctx.beginPath();
      ctx.roundRect(candleX - 7, principalAxisY - 34, 14, 34, 2);
      ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.stroke();

      // Candle Wick
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(candleX, principalAxisY - 34);
      ctx.lineTo(candleX, principalAxisY - 40);
      ctx.stroke();

      // Flickering Animated Flame
      const flicker = Math.sin(s.time * 9) * 2;
      const flameH = 16 + flicker;
      const flameW = 8 + Math.cos(s.time * 7) * 1.5;

      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 18;

      const flameGrad = ctx.createRadialGradient(
        candleX,
        principalAxisY - 44,
        2,
        candleX,
        principalAxisY - 44,
        flameH
      );
      flameGrad.addColorStop(0, '#FFFFFF');
      flameGrad.addColorStop(0.2, '#FEF08A');
      flameGrad.addColorStop(0.6, '#F59E0B');
      flameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(candleX, principalAxisY - 44, flameW / 2, flameH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.objectType === 'arrow') {
      // Upright Luminous Arrow
      ctx.strokeStyle = '#0EA5E9';
      ctx.fillStyle = '#0EA5E9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(candleX, principalAxisY);
      ctx.lineTo(candleX, objTipY);
      ctx.stroke();

      // Arrow Head
      ctx.beginPath();
      ctx.moveTo(candleX, objTipY - 4);
      ctx.lineTo(candleX - 8, objTipY + 10);
      ctx.lineTo(candleX + 8, objTipY + 10);
      ctx.closePath();
      ctx.fill();
    } else if (s.objectType === 'letterF') {
      // Letter "F" object
      ctx.fillStyle = '#0EA5E9';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('F', candleX, principalAxisY - 4);
    }

    // Object Label
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`OBJECT (u = ${d_u.toFixed(1)} cm)`, candleX, benchY - 18);
    ctx.restore();

    // ── 6. Principal Rays (Ray Optics) ──
    if (s.showRays) {
      ctx.save();
      const tipY = objTipY;

      // Ray 1: Parallel to Axis -> Reflects through F [Sky Blue #0EA5E9]
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = s.rayDashOffset;

      // Incident ray
      ctx.beginPath();
      ctx.moveTo(candleX, tipY);
      ctx.lineTo(mirrorX, tipY);
      ctx.stroke();

      // Reflected ray through F
      const slope1 = (tipY - principalAxisY) / (mirrorX - focusX);
      ctx.beginPath();
      ctx.moveTo(mirrorX, tipY);
      ctx.lineTo(mirrorX - 450, tipY - slope1 * 450);
      ctx.stroke();

      // Ray 2: Through C -> Reflects back on itself [Red #EF4444]
      ctx.strokeStyle = '#EF4444';
      const slope2 = (tipY - principalAxisY) / (candleX - centerCurvX);
      const mirrorHitY2 = principalAxisY + slope2 * (mirrorX - centerCurvX);

      ctx.beginPath();
      ctx.moveTo(candleX, tipY);
      ctx.lineTo(mirrorX, mirrorHitY2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mirrorX, mirrorHitY2);
      ctx.lineTo(mirrorX - 450, mirrorHitY2 - slope2 * 450);
      ctx.stroke();

      // Ray 3: Through F -> Reflects Parallel to Axis [Green #10B981]
      ctx.strokeStyle = '#10B981';
      const slope3 = (tipY - principalAxisY) / (candleX - focusX);
      const mirrorHitY3 = principalAxisY + slope3 * (mirrorX - focusX);

      ctx.beginPath();
      ctx.moveTo(candleX, tipY);
      ctx.lineTo(mirrorX, mirrorHitY3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mirrorX, mirrorHitY3);
      ctx.lineTo(mirrorX - 450, mirrorHitY3);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── 7. Draggable Screen Rider & Image Formation ──
    ctx.save();
    // Screen Stand Base Rider on Rail
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = isFocusSharp ? '#10B981' : s.activeDrag === 'screen' ? '#0EA5E9' : '#64748B';
    ctx.beginPath();
    ctx.roundRect(screenX - 12, benchY - 12, 24, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screen vertical stand rod
    ctx.fillStyle = '#475569';
    ctx.fillRect(screenX - 3, principalAxisY - 50, 6, benchY - principalAxisY + 38);

    // Screen White Card Surface
    const screenW = 24;
    const screenH = 90;
    const screenY = principalAxisY - screenH / 2;

    const screenGrad = ctx.createLinearGradient(screenX - screenW / 2, screenY, screenX + screenW / 2, screenY);
    screenGrad.addColorStop(0, '#FFFFFF');
    screenGrad.addColorStop(0.5, '#F8FAFC');
    screenGrad.addColorStop(1, '#E2E8F0');

    ctx.fillStyle = screenGrad;
    ctx.beginPath();
    ctx.roundRect(screenX - screenW / 2, screenY, screenW, screenH, 3);
    ctx.fill();

    // Glowing Focus Ring when in sharp focus
    if (isFocusSharp) {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 12;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    // Image Projected on Screen (Real vs Defocused Blur)
    if (isReal && idealScreenBenchPos > 0) {
      const distFromFocusCm = Math.abs(s.screenBenchPos - idealScreenBenchPos);
      const imgHeight = Math.abs(objHeight * m);

      // Blur radius increases with distance from focus
      const blurAlpha = Math.max(0.15, Math.min(1.0, 1.0 - distFromFocusCm * 0.08));
      const blurRadiusPx = distFromFocusCm * 2.5;

      ctx.save();
      ctx.translate(screenX, principalAxisY);
      ctx.scale(1, -1); // Inverted real image!

      if (s.objectType === 'candle') {
        // Inverted Flame Image on screen
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 6 + blurRadiusPx;
        ctx.globalAlpha = blurAlpha;

        const imgFlameH = 14 * Math.abs(m) + blurRadiusPx;
        const imgFlameW = 8 * Math.abs(m) + blurRadiusPx;

        const flameGrad = ctx.createRadialGradient(0, 20 * Math.abs(m), 1, 0, 20 * Math.abs(m), imgFlameH);
        flameGrad.addColorStop(0, '#FFFFFF');
        flameGrad.addColorStop(0.3, '#FEF08A');
        flameGrad.addColorStop(0.8, '#F59E0B');
        flameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.ellipse(0, 20 * Math.abs(m), imgFlameW / 2, imgFlameH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.objectType === 'arrow') {
        ctx.strokeStyle = `rgba(14, 165, 233, ${blurAlpha})`;
        ctx.fillStyle = `rgba(14, 165, 233, ${blurAlpha})`;
        ctx.lineWidth = 3 + blurRadiusPx * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, imgHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, imgHeight + 4);
        ctx.lineTo(-6, imgHeight - 8);
        ctx.lineTo(6, imgHeight - 8);
        ctx.closePath();
        ctx.fill();
      } else if (s.objectType === 'letterF') {
        ctx.fillStyle = `rgba(14, 165, 233, ${blurAlpha})`;
        ctx.font = `bold ${Math.round(44 * Math.abs(m))}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('F', 0, imgHeight);
      }
      ctx.restore();
    }

    // Screen Label
    ctx.fillStyle = isFocusSharp ? '#10B981' : '#0F172A';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SCREEN (${s.screenBenchPos.toFixed(1)} cm)`, screenX, benchY - 18);
    ctx.restore();

    // ── 8. Virtual Image Display when u < f ──
    if (!isReal) {
      const virtImageX = mirrorX + cmToPx(d_v) - benchXStart;
      const virtHeight = objHeight * Math.abs(m);

      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.setLineDash([4, 4]);

      // Erect dashed virtual image behind mirror
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(virtImageX, principalAxisY);
      ctx.lineTo(virtImageX, principalAxisY - virtHeight);
      ctx.stroke();

      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VIRTUAL IMAGE (Behind Mirror)', virtImageX, principalAxisY - virtHeight - 8);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── 9. On-Canvas Status Banner ──
    if (isFocusSharp) {
      ctx.save();
      ctx.fillStyle = '#DCFCE7';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 130, 24, 260, 34, 17);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#15803D';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ Sharp Real Image in Focus!', W / 2, 45);
      ctx.restore();
    }
  }, [computeOptics]);

  // RequestAnimationFrame Loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // Pointer Interaction Handlers for Dragging Candle / Screen
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const s = simState.current;
    const benchXStart = 70;
    const benchXEnd = canvas.width - 70;
    const benchW = benchXEnd - benchXStart;

    const cmToPx = (cm: number) => benchXStart + (cm / BENCH_LENGTH) * benchW;
    const candleX = cmToPx(s.candleBenchPos);
    const screenX = cmToPx(s.screenBenchPos);
    const benchY = canvas.height / 2 + 65;

    // Check click on Candle Rider
    if (Math.abs(x - candleX) < 22 && y >= benchY - 140 && y <= benchY + 30) {
      s.activeDrag = 'candle';
      s.dragOffset = x - candleX;
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    // Check click on Screen Rider
    if (Math.abs(x - screenX) < 22 && y >= benchY - 140 && y <= benchY + 30) {
      s.activeDrag = 'screen';
      s.dragOffset = x - screenX;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const s = simState.current;
    const benchXStart = 70;
    const benchXEnd = canvas.width - 70;
    const benchW = benchXEnd - benchXStart;
    const pxToCm = (px: number) => Math.max(5, Math.min(MIRROR_BENCH_POS - 2, ((px - benchXStart) / benchW) * BENCH_LENGTH));

    if (s.activeDrag === 'candle') {
      s.candleBenchPos = pxToCm(x - s.dragOffset);
      syncUI();
    } else if (s.activeDrag === 'screen') {
      s.screenBenchPos = pxToCm(x - s.dragOffset);
      syncUI();
    } else {
      const cmToPx = (cm: number) => benchXStart + (cm / BENCH_LENGTH) * benchW;
      const candleX = cmToPx(s.candleBenchPos);
      const screenX = cmToPx(s.screenBenchPos);
      const benchY = canvas.height / 2 + 65;

      if (
        (Math.abs(x - candleX) < 22 || Math.abs(x - screenX) < 22) &&
        y >= benchY - 140 &&
        y <= benchY + 30
      ) {
        canvas.style.cursor = 'ew-resize';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simState.current;
    if (s.activeDrag) {
      s.activeDrag = null;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Preset Position Selector
  const applyPreset = (objDistance: number) => {
    simState.current.candleBenchPos = MIRROR_BENCH_POS - objDistance;
    const { idealScreenBenchPos } = computeOptics();
    if (idealScreenBenchPos > 0) {
      simState.current.screenBenchPos = idealScreenBenchPos;
    }
    syncUI();
  };

  // Add Reading to Observation Table
  const recordObservation = () => {
    const { d_u, d_v, m, isReal, nature } = computeOptics();
    const measured_v = Math.abs(MIRROR_BENCH_POS - simState.current.screenBenchPos);
    const f_calc = (d_u * measured_v) / (d_u + measured_v);

    const newRow: ObservationRow = {
      srNo: observations.length + 1,
      objectType: uiState.objectType,
      u: Number(d_u.toFixed(1)),
      v_calc: Number(d_v.toFixed(1)),
      v_measured: Number(measured_v.toFixed(1)),
      f_calc: Number(f_calc.toFixed(2)),
      magnification: Number(m.toFixed(2)),
      nature,
    };
    setObservations(prev => [...prev.slice(-7), newRow]);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col p-4 md:p-6 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-5 py-3.5 bg-[#111827] border border-sky-500/20 rounded-2xl shadow-xl shadow-sky-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-sky-500/30">
            🔍
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Concave Mirror — Image Formation & Focal Length
            </h1>
            <p className="text-xs text-slate-400">
              Karnataka PUC Physics Practicals • Optical Bench (1/v + 1/u = 1/f)
            </p>
          </div>
        </div>

        {/* Header Live Status Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-slate-900/90 rounded-xl border border-slate-700/60 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Image Nature:</span>
            <span className="text-emerald-400 font-semibold">{uiState.nature}</span>
          </div>

          <div className="px-3.5 py-1.5 bg-sky-950/40 rounded-xl border border-sky-500/40 flex items-center gap-2 text-xs">
            <span className="text-sky-300 font-medium">u / v:</span>
            <span className="text-cyan-300 font-mono font-bold text-sm">
              {uiState.u.toFixed(1)} cm / {uiState.v_calc.toFixed(1)} cm
            </span>
          </div>
        </div>
      </div>

      {/* Main Simulation Canvas Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-900/60 border border-slate-800 rounded-2xl p-3 overflow-hidden shadow-2xl">
        <div className="w-full max-w-5xl aspect-[960/480] relative rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-white">
          <canvas
            ref={canvasRef}
            width={960}
            height={480}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            className="block select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {/* Quick Instructions Overlay */}
        <div className="w-full max-w-5xl mt-2 px-2 flex justify-between items-center text-xs text-slate-400">
          <span>💡 Drag the Object (Candle) and Screen along the optical bench to form sharp real images.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                simState.current.showRays = !simState.current.showRays;
                syncUI();
              }}
              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Eye size={14} /> {uiState.showRays ? 'Hide Rays' : 'Show Rays'}
            </button>
            <span className="text-slate-500">Mirror at 85.0 cm • f = 15.0 cm</span>
          </div>
        </div>
      </div>

      {/* Controls & Readings Dashboard */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Object Presets & Object Type (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Object Type Selector */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2.5">
              Select Object Type
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'candle', label: '🕯️ Candle Flame' },
                { id: 'arrow', label: '⬆️ Physics Arrow' },
                { id: 'letterF', label: '🔤 Letter "F"' },
              ].map(obj => {
                const isSelected = uiState.objectType === obj.id;
                return (
                  <button
                    key={obj.id}
                    onClick={() => {
                      simState.current.objectType = obj.id as ObjectType;
                      syncUI();
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-md shadow-sky-950/40'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/70 hover:text-slate-200'
                    }`}
                  >
                    <span>{obj.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Position Presets */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Standard Presets</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset(45)}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
              >
                Beyond C (u = 45 cm)
              </button>
              <button
                onClick={() => applyPreset(30)}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
              >
                At C (u = 30 cm)
              </button>
              <button
                onClick={() => applyPreset(22)}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
              >
                Between C & F (u = 22 cm)
              </button>
              <button
                onClick={() => applyPreset(10)}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
              >
                Inside F (u = 10 cm, Virtual)
              </button>
            </div>

            <button
              onClick={() => {
                simState.current.candleBenchPos = 45.0;
                simState.current.screenBenchPos = 61.0;
                syncUI();
              }}
              className="mt-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={13} /> Reset Bench
            </button>
          </div>
        </div>

        {/* Right Column: Measurements Card & Observation Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Live Optics Card */}
          <div className="bg-[#111827] border border-sky-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <span>📐</span> Live Optical Measurements
              </h3>
              <button
                onClick={recordObservation}
                disabled={!uiState.isReal}
                className="py-1 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-40 shadow-md shadow-sky-500/20"
              >
                <Plus size={14} /> Record Observation
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Object Dist (u)</span>
                <span className="text-base font-mono font-bold text-sky-300">{uiState.u.toFixed(1)} cm</span>
                <span className="text-[10px] text-slate-500 block">from mirror</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Image Dist (v)</span>
                <span className="text-base font-mono font-bold text-cyan-300">{uiState.v_calc.toFixed(1)} cm</span>
                <span className="text-[10px] text-slate-500 block">calculated</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Magnification (m)</span>
                <span className="text-base font-mono font-bold text-emerald-300">{uiState.magnification.toFixed(2)}×</span>
                <span className="text-[10px] text-slate-500 block">-v / u</span>
              </div>

              <div className="bg-sky-950/50 border border-sky-500/40 rounded-xl p-2.5">
                <span className="text-[11px] text-sky-300 font-semibold block mb-1">Focal Length (f)</span>
                <span className="text-base font-mono font-bold text-sky-200">15.0 cm</span>
                <span className="text-[10px] text-sky-400/80 block">fixed concave</span>
              </div>
            </div>
          </div>

          {/* Tabbed Observation Table & Theory */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex-1">
            <div className="flex gap-2 border-b border-slate-800 pb-2 mb-3 text-xs">
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'controls' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mirror Formula & Ray Rules
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Observation Table ({observations.length})
              </button>
            </div>

            {activeTab === 'controls' ? (
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 font-mono">
                  <div className="text-sky-400 font-bold mb-1">🔬 Mirror Formula:</div>
                  <div>• Formula: 1/v + 1/u = 1/f  ⇒  f = (u × v) / (u + v)</div>
                  <div>• Magnification: m = −v / u = Image Height / Object Height</div>
                  <div>• Radius of Curvature: R = 2f = 30.0 cm</div>
                  <div>• Cartesian Signs: Concave mirror has negative focal length (f &lt; 0). Real images are formed in front of mirror (v &lt; 0).</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-2">#</th>
                      <th className="py-1.5 px-2 font-mono">u (cm)</th>
                      <th className="py-1.5 px-2 font-mono">v (cm)</th>
                      <th className="py-1.5 px-2 font-mono">Calc f (cm)</th>
                      <th className="py-1.5 px-2 font-mono">m</th>
                      <th className="py-1.5 px-2">Image Nature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-slate-500">
                          No observations recorded yet. Align screen to sharp focus and click "Record Observation".
                        </td>
                      </tr>
                    ) : (
                      observations.map(row => (
                        <tr key={row.srNo} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                          <td className="py-1 px-2 text-slate-400">{row.srNo}</td>
                          <td className="py-1 px-2 font-mono">{row.u.toFixed(1)}</td>
                          <td className="py-1 px-2 font-mono text-cyan-300">{row.v_measured.toFixed(1)}</td>
                          <td className="py-1 px-2 font-mono text-emerald-400 font-bold">{row.f_calc.toFixed(2)}</td>
                          <td className="py-1 px-2 font-mono">{row.magnification.toFixed(2)}</td>
                          <td className="py-1 px-2 text-slate-300">{row.nature}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
