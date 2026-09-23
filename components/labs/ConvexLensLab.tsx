import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Eye } from 'lucide-react';

type ObjectType = 'candle' | 'arrow' | 'letterF';

interface ObservationRow {
  srNo: number;
  u: number;
  v_calc: number;
  v_measured: number;
  f_calc: number;
  magnification: number;
  nature: string;
}

export default function ConvexLensLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const BENCH_LENGTH = 100;
  const LENS_BENCH_POS = 50.0;
  const FOCAL_LENGTH = 15.0;

  const simState = useRef({
    candleBenchPos: 20.0,
    screenBenchPos: 75.0,
    objectType: 'candle' as ObjectType,
    showRays: true,
    activeDrag: null as 'candle' | 'screen' | null,
    dragOffset: 0,
    time: 0,
    rayDashOffset: 0,
  });

  const [uiState, setUiState] = useState({
    candleBenchPos: 20.0,
    screenBenchPos: 75.0,
    objectType: 'candle' as ObjectType,
    showRays: true,
    u: 30.0,
    v_calc: 30.0,
    magnification: -1.0,
    isReal: true,
    isFocusSharp: false,
    nature: 'Real, Inverted, Same Size',
  });

  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [activeTab, setActiveTab] = useState<'controls' | 'table'>('controls');

  const computeOptics = useCallback(() => {
    const s = simState.current;
    const d_u = Math.max(2.0, LENS_BENCH_POS - s.candleBenchPos);
    const u_cart = -d_u;
    // Thin lens formula: 1/v - 1/u = 1/f  =>  v = (u*f)/(u+f)
    const v_cart = (u_cart * FOCAL_LENGTH) / (u_cart + FOCAL_LENGTH);
    const isReal = v_cart > 0;
    const d_v = Math.abs(v_cart);
    const idealScreenBenchPos = isReal ? LENS_BENCH_POS + d_v : -1;
    const m = v_cart / u_cart;
    const isFocusSharp = isReal && Math.abs(s.screenBenchPos - idealScreenBenchPos) < 0.6;

    let nature = '';
    if (!isReal) {
      nature = 'Virtual, Erect, Magnified';
    } else if (d_u > 2 * FOCAL_LENGTH + 0.5) {
      nature = 'Real, Inverted, Diminished';
    } else if (Math.abs(d_u - 2 * FOCAL_LENGTH) <= 0.5) {
      nature = 'Real, Inverted, Same Size';
    } else if (d_u > FOCAL_LENGTH + 0.5) {
      nature = 'Real, Inverted, Magnified';
    } else if (Math.abs(d_u - FOCAL_LENGTH) <= 0.5) {
      nature = 'Image at Infinity';
    } else {
      nature = 'Virtual, Erect, Magnified';
    }

    return { d_u, d_v: Math.min(200, d_v), idealScreenBenchPos, m, isReal, isFocusSharp, nature };
  }, []);

  const syncUI = useCallback(() => {
    const s = simState.current;
    const { d_u, d_v, m, isReal, isFocusSharp, nature } = computeOptics();
    setUiState({
      candleBenchPos: Number(s.candleBenchPos.toFixed(1)),
      screenBenchPos: Number(s.screenBenchPos.toFixed(1)),
      objectType: s.objectType,
      showRays: s.showRays,
      u: Number(d_u.toFixed(1)),
      v_calc: Number(d_v.toFixed(1)),
      magnification: Number(m.toFixed(2)),
      isReal,
      isFocusSharp,
      nature,
    });
  }, [computeOptics]);

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

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Dot grid
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 15; x < W; x += 22) {
      for (let y = 15; y < H; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Coordinate mapping
    const benchXStart = 70;
    const benchXEnd = W - 70;
    const benchW = benchXEnd - benchXStart;
    const benchY = H / 2 + 65;

    const cmToPx = (cm: number) => benchXStart + (Math.max(0, Math.min(BENCH_LENGTH, cm)) / BENCH_LENGTH) * benchW;

    const lensX = cmToPx(LENS_BENCH_POS);
    const candleX = cmToPx(s.candleBenchPos);
    const screenX = cmToPx(s.screenBenchPos);
    const f1X = cmToPx(LENS_BENCH_POS - FOCAL_LENGTH);
    const f2X = cmToPx(LENS_BENCH_POS + FOCAL_LENGTH);
    const twoF1X = cmToPx(LENS_BENCH_POS - 2 * FOCAL_LENGTH);
    const twoF2X = cmToPx(LENS_BENCH_POS + 2 * FOCAL_LENGTH);

    const principalAxisY = benchY - 110;
    const objHeight = 50;

    // ── Optical Bench Dual Rails ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 10;

    const bedGrad = ctx.createLinearGradient(0, benchY, 0, benchY + 36);
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

    [benchY, benchY + 12].forEach(ry => {
      const rg = ctx.createLinearGradient(0, ry - 3, 0, ry + 5);
      rg.addColorStop(0, '#FFFFFF');
      rg.addColorStop(0.5, '#CBD5E1');
      rg.addColorStop(1, '#475569');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.roundRect(benchXStart - 15, ry - 3, benchW + 30, 7, 2);
      ctx.fill();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // Scale markings
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
      if (isMajor) ctx.fillText(`${cm}`, mx, benchY + 34);
    }
    ctx.restore();

    // ── Principal Axis ──
    ctx.save();
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(benchXStart - 20, principalAxisY);
    ctx.lineTo(benchXEnd + 20, principalAxisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cardinal points
    const drawPt = (px: number, label: string, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, principalAxisY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, principalAxisY + 16);
    };

    drawPt(lensX, 'O', '#0EA5E9');
    drawPt(f1X, 'F₁', '#10B981');
    drawPt(f2X, 'F₂', '#10B981');
    drawPt(twoF1X, '2F₁', '#6366F1');
    drawPt(twoF2X, '2F₂', '#6366F1');
    ctx.restore();

    // ── Convex Lens Mount ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    // Stand rider
    const standGrad = ctx.createLinearGradient(lensX - 16, 0, lensX + 16, 0);
    standGrad.addColorStop(0, '#64748B');
    standGrad.addColorStop(0.5, '#CBD5E1');
    standGrad.addColorStop(1, '#334155');
    ctx.fillStyle = standGrad;
    ctx.beginPath();
    ctx.roundRect(lensX - 14, benchY - 14, 28, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Vertical rod
    ctx.fillStyle = '#64748B';
    ctx.fillRect(lensX - 3, principalAxisY - 65, 6, benchY - principalAxisY + 51);

    // Biconvex Lens Shape (glass look)
    const lensH = 120;
    const lensBulge = 18;

    // Lens body glow aura
    const auraGrad = ctx.createRadialGradient(lensX, principalAxisY, 10, lensX, principalAxisY, 80);
    auraGrad.addColorStop(0, 'rgba(56,189,248,0.08)');
    auraGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(lensX, principalAxisY, 80, 0, Math.PI * 2);
    ctx.fill();

    // Draw biconvex lens
    ctx.beginPath();
    ctx.moveTo(lensX, principalAxisY - lensH / 2);
    ctx.bezierCurveTo(
      lensX - lensBulge, principalAxisY - lensH / 4,
      lensX - lensBulge, principalAxisY + lensH / 4,
      lensX, principalAxisY + lensH / 2
    );
    ctx.bezierCurveTo(
      lensX + lensBulge, principalAxisY + lensH / 4,
      lensX + lensBulge, principalAxisY - lensH / 4,
      lensX, principalAxisY - lensH / 2
    );
    ctx.closePath();

    const lensGrad = ctx.createLinearGradient(lensX - lensBulge, 0, lensX + lensBulge, 0);
    lensGrad.addColorStop(0, 'rgba(186,230,253,0.55)');
    lensGrad.addColorStop(0.3, 'rgba(125,211,252,0.3)');
    lensGrad.addColorStop(0.5, 'rgba(56,189,248,0.15)');
    lensGrad.addColorStop(0.7, 'rgba(125,211,252,0.3)');
    lensGrad.addColorStop(1, 'rgba(186,230,253,0.55)');
    ctx.fillStyle = lensGrad;
    ctx.fill();
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(14,165,233,0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Arrow tips on lens
    ctx.fillStyle = '#0EA5E9';
    // Top arrow
    ctx.beginPath();
    ctx.moveTo(lensX, principalAxisY - lensH / 2 - 6);
    ctx.lineTo(lensX - 6, principalAxisY - lensH / 2 + 4);
    ctx.lineTo(lensX + 6, principalAxisY - lensH / 2 + 4);
    ctx.closePath();
    ctx.fill();
    // Bottom arrow
    ctx.beginPath();
    ctx.moveTo(lensX, principalAxisY + lensH / 2 + 6);
    ctx.lineTo(lensX - 6, principalAxisY + lensH / 2 - 4);
    ctx.lineTo(lensX + 6, principalAxisY + lensH / 2 - 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText('CONVEX LENS (f = 15 cm)', lensX, benchY - 22);
    ctx.restore();

    // ── Draggable Object ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = s.activeDrag === 'candle' ? '#0EA5E9' : '#475569';
    ctx.beginPath();
    ctx.roundRect(candleX - 12, benchY - 12, 24, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.fillRect(candleX - 3, principalAxisY, 6, benchY - principalAxisY - 12);

    const objTipY = principalAxisY - objHeight;

    if (s.objectType === 'candle') {
      const waxGrad = ctx.createLinearGradient(candleX - 8, 0, candleX + 8, 0);
      waxGrad.addColorStop(0, '#FEF3C7');
      waxGrad.addColorStop(0.5, '#FDE68A');
      waxGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = waxGrad;
      ctx.beginPath();
      ctx.roundRect(candleX - 7, principalAxisY - 34, 14, 34, 2);
      ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.stroke();

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(candleX, principalAxisY - 34);
      ctx.lineTo(candleX, principalAxisY - 40);
      ctx.stroke();

      const flicker = Math.sin(s.time * 9) * 2;
      const flameH = 16 + flicker;
      const flameW = 8 + Math.cos(s.time * 7) * 1.5;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 18;
      const fGrad = ctx.createRadialGradient(candleX, principalAxisY - 44, 2, candleX, principalAxisY - 44, flameH);
      fGrad.addColorStop(0, '#FFFFFF');
      fGrad.addColorStop(0.2, '#FEF08A');
      fGrad.addColorStop(0.6, '#F59E0B');
      fGrad.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.ellipse(candleX, principalAxisY - 44, flameW / 2, flameH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.objectType === 'arrow') {
      ctx.strokeStyle = '#0EA5E9';
      ctx.fillStyle = '#0EA5E9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(candleX, principalAxisY);
      ctx.lineTo(candleX, objTipY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(candleX, objTipY - 4);
      ctx.lineTo(candleX - 8, objTipY + 10);
      ctx.lineTo(candleX + 8, objTipY + 10);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#0EA5E9';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('F', candleX, principalAxisY - 4);
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText(`OBJECT (u = ${d_u.toFixed(1)} cm)`, candleX, benchY - 18);
    ctx.restore();

    // ── Principal Rays ──
    if (s.showRays && d_u > FOCAL_LENGTH) {
      ctx.save();
      const tipY = principalAxisY - objHeight;

      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = s.rayDashOffset;
      ctx.lineWidth = 1.8;

      // Ray 1: Parallel to axis → refracts through F₂ [Sky Blue]
      ctx.strokeStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.moveTo(candleX, tipY);
      ctx.lineTo(lensX, tipY);
      ctx.stroke();
      const slope1 = (tipY - principalAxisY) / (lensX - f2X);
      ctx.beginPath();
      ctx.moveTo(lensX, tipY);
      ctx.lineTo(lensX + 450, tipY + slope1 * 450);
      ctx.stroke();

      // Ray 2: Through optical centre → straight [Red]
      ctx.strokeStyle = '#EF4444';
      const slope2 = (tipY - principalAxisY) / (candleX - lensX);
      ctx.beginPath();
      ctx.moveTo(candleX, tipY);
      ctx.lineTo(lensX + 450, principalAxisY + slope2 * (lensX + 450 - candleX));
      ctx.stroke();

      // Ray 3: Through F₁ → refracts parallel [Green]
      ctx.strokeStyle = '#10B981';
      const slope3 = (tipY - principalAxisY) / (candleX - f1X);
      const hitY3 = principalAxisY + slope3 * (lensX - f1X);
      ctx.beginPath();
      ctx.moveTo(candleX, tipY);
      ctx.lineTo(lensX, hitY3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lensX, hitY3);
      ctx.lineTo(lensX + 450, hitY3);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Draggable Screen ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = isFocusSharp ? '#10B981' : s.activeDrag === 'screen' ? '#0EA5E9' : '#64748B';
    ctx.beginPath();
    ctx.roundRect(screenX - 12, benchY - 12, 24, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(screenX - 3, principalAxisY - 50, 6, benchY - principalAxisY + 38);

    const screenW = 24;
    const screenH = 90;
    const screenY = principalAxisY - screenH / 2;
    const sGrad = ctx.createLinearGradient(screenX - screenW / 2, 0, screenX + screenW / 2, 0);
    sGrad.addColorStop(0, '#FFFFFF');
    sGrad.addColorStop(0.5, '#F8FAFC');
    sGrad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.roundRect(screenX - screenW / 2, screenY, screenW, screenH, 3);
    ctx.fill();

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

    // Image on screen
    if (isReal && idealScreenBenchPos > 0) {
      const distFocus = Math.abs(s.screenBenchPos - idealScreenBenchPos);
      const imgH = Math.abs(objHeight * m);
      const blurAlpha = Math.max(0.15, Math.min(1.0, 1.0 - distFocus * 0.08));
      const blurR = distFocus * 2.5;

      ctx.save();
      ctx.translate(screenX, principalAxisY);
      ctx.scale(1, -1);

      if (s.objectType === 'candle') {
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 6 + blurR;
        ctx.globalAlpha = blurAlpha;
        const ifH = 14 * Math.abs(m) + blurR;
        const ifW = 8 * Math.abs(m) + blurR;
        const fg = ctx.createRadialGradient(0, 20 * Math.abs(m), 1, 0, 20 * Math.abs(m), ifH);
        fg.addColorStop(0, '#FFFFFF');
        fg.addColorStop(0.3, '#FEF08A');
        fg.addColorStop(0.8, '#F59E0B');
        fg.addColorStop(1, 'rgba(220,38,38,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.ellipse(0, 20 * Math.abs(m), ifW / 2, ifH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.objectType === 'arrow') {
        ctx.strokeStyle = `rgba(14,165,233,${blurAlpha})`;
        ctx.fillStyle = `rgba(14,165,233,${blurAlpha})`;
        ctx.lineWidth = 3 + blurR * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, imgH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, imgH + 4);
        ctx.lineTo(-6, imgH - 8);
        ctx.lineTo(6, imgH - 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(14,165,233,${blurAlpha})`;
        ctx.font = `bold ${Math.round(44 * Math.abs(m))}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.scale(-1, 1);
        ctx.fillText('F', 0, imgH);
      }
      ctx.restore();
    }

    ctx.fillStyle = isFocusSharp ? '#10B981' : '#0F172A';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText(`SCREEN (${s.screenBenchPos.toFixed(1)} cm)`, screenX, benchY - 18);
    ctx.restore();

    // Virtual image (when u < f)
    if (!isReal) {
      const virtX = cmToPx(LENS_BENCH_POS - d_v);
      const virtH = objHeight * Math.abs(m);
      ctx.save();
      ctx.strokeStyle = 'rgba(56,189,248,0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(virtX, principalAxisY);
      ctx.lineTo(virtX, principalAxisY - virtH);
      ctx.stroke();
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(56,189,248,0.8)';
      ctx.fillText('VIRTUAL IMAGE', virtX, principalAxisY - virtH - 8);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Focus banner
    if (isFocusSharp) {
      ctx.save();
      ctx.fillStyle = '#DCFCE7';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(16,185,129,0.3)';
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

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const s = simState.current;
    const bXS = 70, bXE = canvas.width - 70, bW = bXE - bXS, bY = canvas.height / 2 + 65;
    const cmToPx = (cm: number) => bXS + (cm / BENCH_LENGTH) * bW;
    const cX = cmToPx(s.candleBenchPos);
    const sX = cmToPx(s.screenBenchPos);

    if (Math.abs(x - cX) < 22 && y >= bY - 140 && y <= bY + 30) {
      s.activeDrag = 'candle'; s.dragOffset = x - cX; canvas.setPointerCapture(e.pointerId); return;
    }
    if (Math.abs(x - sX) < 22 && y >= bY - 140 && y <= bY + 30) {
      s.activeDrag = 'screen'; s.dragOffset = x - sX; canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const s = simState.current;
    const bXS = 70, bW = canvas.width - 140;
    const pxToCm = (px: number) => Math.max(5, Math.min(95, ((px - bXS) / bW) * BENCH_LENGTH));

    if (s.activeDrag === 'candle') {
      s.candleBenchPos = Math.min(LENS_BENCH_POS - 2, pxToCm(x - s.dragOffset));
      syncUI();
    } else if (s.activeDrag === 'screen') {
      s.screenBenchPos = Math.max(LENS_BENCH_POS + 2, pxToCm(x - s.dragOffset));
      syncUI();
    } else {
      const cmToPx = (cm: number) => bXS + (cm / BENCH_LENGTH) * bW;
      const cX = cmToPx(s.candleBenchPos), sX = cmToPx(s.screenBenchPos), bY = canvas.height / 2 + 65;
      canvas.style.cursor = (Math.abs(x - cX) < 22 || Math.abs(x - sX) < 22) && y >= bY - 140 && y <= bY + 30 ? 'ew-resize' : 'default';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simState.current;
    if (s.activeDrag) {
      s.activeDrag = null;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    }
  };

  const applyPreset = (objDist: number) => {
    simState.current.candleBenchPos = LENS_BENCH_POS - objDist;
    const { idealScreenBenchPos } = computeOptics();
    if (idealScreenBenchPos > 0) simState.current.screenBenchPos = idealScreenBenchPos;
    syncUI();
  };

  const recordObs = () => {
    const { d_u, d_v, m, isReal, nature } = computeOptics();
    const measV = Math.abs(simState.current.screenBenchPos - LENS_BENCH_POS);
    const fCalc = (d_u * measV) / (d_u + measV);
    setObservations(prev => [...prev.slice(-7), {
      srNo: prev.length + 1, u: Number(d_u.toFixed(1)), v_calc: Number(d_v.toFixed(1)),
      v_measured: Number(measV.toFixed(1)), f_calc: Number(fCalc.toFixed(2)),
      magnification: Number(m.toFixed(2)), nature
    }]);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col p-4 md:p-6 select-none font-sans">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-5 py-3.5 bg-[#111827] border border-sky-500/20 rounded-2xl shadow-xl shadow-sky-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-sky-500/30">🔭</div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">Convex Lens — Image Formation & Focal Length</h1>
            <p className="text-xs text-slate-400">Karnataka PUC Physics Practicals • Thin Lens Formula (1/v − 1/u = 1/f)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-slate-900/90 rounded-xl border border-slate-700/60 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Nature:</span>
            <span className="text-emerald-400 font-semibold">{uiState.nature}</span>
          </div>
          <div className="px-3.5 py-1.5 bg-sky-950/40 rounded-xl border border-sky-500/40 flex items-center gap-2 text-xs">
            <span className="text-sky-300 font-medium">u / v:</span>
            <span className="text-cyan-300 font-mono font-bold text-sm">{uiState.u.toFixed(1)} / {uiState.v_calc.toFixed(1)} cm</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-900/60 border border-slate-800 rounded-2xl p-3 overflow-hidden shadow-2xl">
        <div className="w-full max-w-5xl aspect-[960/480] relative rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-white">
          <canvas ref={canvasRef} width={960} height={480} style={{ width: '100%', height: '100%', touchAction: 'none' }} className="block select-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
        </div>
        <div className="w-full max-w-5xl mt-2 px-2 flex justify-between items-center text-xs text-slate-400">
          <span>💡 Drag the Object and Screen along the optical bench to form sharp real images.</span>
          <button onClick={() => { simState.current.showRays = !simState.current.showRays; syncUI(); }} className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors">
            <Eye size={14} /> {uiState.showRays ? 'Hide Rays' : 'Show Rays'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2.5">Object Type</span>
            <div className="grid grid-cols-3 gap-2">
              {([{ id: 'candle', l: '🕯️ Candle' }, { id: 'arrow', l: '⬆️ Arrow' }, { id: 'letterF', l: '🔤 Letter F' }] as const).map(o => (
                <button key={o.id} onClick={() => { simState.current.objectType = o.id; syncUI(); }} className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${uiState.objectType === o.id ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60' : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/70'}`}>{o.l}</button>
              ))}
            </div>
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-2.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Standard Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {[{ l: 'Beyond 2F₁ (u=40)', d: 40 }, { l: 'At 2F₁ (u=30)', d: 30 }, { l: 'Between F & 2F (u=22)', d: 22 }, { l: 'Inside F₁ (u=10)', d: 10 }].map(p => (
                <button key={p.d} onClick={() => applyPreset(p.d)} className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200">{p.l}</button>
              ))}
            </div>
            <button onClick={() => { simState.current.candleBenchPos = 20; simState.current.screenBenchPos = 75; syncUI(); }} className="mt-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"><RotateCcw size={13} /> Reset</button>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="bg-[#111827] border border-sky-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase tracking-wider text-sky-400 font-bold">📐 Live Measurements</h3>
              <button onClick={recordObs} disabled={!uiState.isReal} className="py-1 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-40 shadow-md shadow-sky-500/20"><Plus size={14} /> Record</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Object u</span>
                <span className="text-base font-mono font-bold text-sky-300">{uiState.u.toFixed(1)} cm</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Image v</span>
                <span className="text-base font-mono font-bold text-cyan-300">{uiState.v_calc.toFixed(1)} cm</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Magnification</span>
                <span className="text-base font-mono font-bold text-emerald-300">{uiState.magnification.toFixed(2)}×</span>
              </div>
              <div className="bg-sky-950/50 border border-sky-500/40 rounded-xl p-2.5">
                <span className="text-[11px] text-sky-300 font-semibold block mb-1">Focal Length</span>
                <span className="text-base font-mono font-bold text-sky-200">15.0 cm</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex-1">
            <div className="flex gap-2 border-b border-slate-800 pb-2 mb-3 text-xs">
              <button onClick={() => setActiveTab('controls')} className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'controls' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'}`}>Lens Formula</button>
              <button onClick={() => setActiveTab('table')} className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'}`}>Observations ({observations.length})</button>
            </div>
            {activeTab === 'controls' ? (
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
                <div className="text-sky-400 font-bold mb-1">🔬 Thin Lens Formula:</div>
                <div>• 1/v − 1/u = 1/f  ⇒  f = (u × v) / (v − u)</div>
                <div>• Magnification: m = v / u = Image Height / Object Height</div>
                <div>• Sign Convention (New Cartesian): u is −ve (left of lens), v is +ve for real images</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr><th className="py-1.5 px-2">#</th><th className="py-1.5 px-2 font-mono">u (cm)</th><th className="py-1.5 px-2 font-mono">v (cm)</th><th className="py-1.5 px-2 font-mono">f calc</th><th className="py-1.5 px-2 font-mono">m</th><th className="py-1.5 px-2">Nature</th></tr>
                  </thead>
                  <tbody>
                    {observations.length === 0 ? (<tr><td colSpan={6} className="text-center py-4 text-slate-500">No observations yet.</td></tr>) :
                      observations.map(r => (
                        <tr key={r.srNo} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                          <td className="py-1 px-2 text-slate-400">{r.srNo}</td>
                          <td className="py-1 px-2 font-mono">{r.u.toFixed(1)}</td>
                          <td className="py-1 px-2 font-mono text-cyan-300">{r.v_measured.toFixed(1)}</td>
                          <td className="py-1 px-2 font-mono text-emerald-400 font-bold">{r.f_calc.toFixed(2)}</td>
                          <td className="py-1 px-2 font-mono">{r.magnification.toFixed(2)}</td>
                          <td className="py-1 px-2 text-slate-300">{r.nature}</td>
                        </tr>))}
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
