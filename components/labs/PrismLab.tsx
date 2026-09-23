import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Sparkles } from 'lucide-react';

// VIBGYOR wavelength colors for dispersion
const SPECTRUM = [
  { name: 'Violet', color: '#7C3AED', n: 1.532 },
  { name: 'Indigo', color: '#4F46E5', n: 1.528 },
  { name: 'Blue',   color: '#2563EB', n: 1.524 },
  { name: 'Green',  color: '#16A34A', n: 1.519 },
  { name: 'Yellow', color: '#EAB308', n: 1.517 },
  { name: 'Orange', color: '#EA580C', n: 1.514 },
  { name: 'Red',    color: '#DC2626', n: 1.512 },
];

interface ReadingRow {
  srNo: number;
  i: number;
  r1: number;
  r2: number;
  e: number;
  delta: number;
}

export default function PrismLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const A = 60; // Prism angle in degrees
  const N_GLASS = 1.52; // Refractive index (crown glass)

  const simState = useRef({
    incidentAngle: 45, // degrees
    showDispersion: false,
    isDraggingRay: false,
    dragStartY: 0,
    time: 0,
  });

  const [uiState, setUiState] = useState({
    incidentAngle: 45,
    r1: 0, r2: 0, e: 0, delta: 0,
    isTIR: false,
    minDeviation: 0,
    showDispersion: false,
  });

  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [activeTab, setActiveTab] = useState<'graph' | 'table' | 'theory'>('graph');

  const computeRefraction = useCallback((i_deg: number, n: number = N_GLASS) => {
    const i_rad = (i_deg * Math.PI) / 180;
    const sinR1 = Math.sin(i_rad) / n;
    if (Math.abs(sinR1) > 1) return { r1: 0, r2: 0, e: 0, delta: 0, isTIR: true };
    const r1 = Math.asin(sinR1) * (180 / Math.PI);
    const r2 = A - r1;
    const sinE = n * Math.sin((r2 * Math.PI) / 180);
    if (sinE > 1) return { r1, r2, e: 0, delta: 0, isTIR: true };
    const e = Math.asin(sinE) * (180 / Math.PI);
    const delta = i_deg + e - A;
    return { r1, r2, e, delta, isTIR: false };
  }, []);

  const syncUI = useCallback(() => {
    const s = simState.current;
    const { r1, r2, e, delta, isTIR } = computeRefraction(s.incidentAngle);
    const Dm = 2 * Math.asin(N_GLASS * Math.sin((A / 2) * (Math.PI / 180))) * (180 / Math.PI) - A;
    setUiState({
      incidentAngle: s.incidentAngle,
      r1: Number(r1.toFixed(1)), r2: Number(r2.toFixed(1)),
      e: Number(e.toFixed(1)), delta: Number(delta.toFixed(1)),
      isTIR, minDeviation: Number(Dm.toFixed(1)),
      showDispersion: s.showDispersion,
    });
  }, [computeRefraction]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = simState.current;
    const W = canvas.width;
    const H = canvas.height;
    s.time += 0.04;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Dot grid
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 15; x < W; x += 22) {
      for (let y = 15; y < H; y += 22) {
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Bench shadow
    const bSh = ctx.createLinearGradient(0, H - 40, 0, H);
    bSh.addColorStop(0, 'rgba(0,0,0,0)');
    bSh.addColorStop(1, 'rgba(0,0,0,0.03)');
    ctx.fillStyle = bSh;
    ctx.fillRect(0, H - 40, W, 40);

    // ── Prism Geometry ──
    const cx = W / 2;
    const cy = H / 2 + 20;
    const side = 200; // pixels per prism side
    const h = side * Math.sqrt(3) / 2;

    // Vertices: apex at top, base at bottom
    const apex = { x: cx, y: cy - h / 2 };
    const bLeft = { x: cx - side / 2, y: cy + h / 2 };
    const bRight = { x: cx + side / 2, y: cy + h / 2 };

    // ── Glass Prism Body ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 12;

    // Glass fill gradient
    const glassGrad = ctx.createLinearGradient(bLeft.x, bLeft.y, bRight.x, apex.y);
    glassGrad.addColorStop(0, 'rgba(186,230,253,0.35)');
    glassGrad.addColorStop(0.3, 'rgba(125,211,252,0.2)');
    glassGrad.addColorStop(0.6, 'rgba(56,189,248,0.12)');
    glassGrad.addColorStop(1, 'rgba(186,230,253,0.3)');

    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(bLeft.x, bLeft.y);
    ctx.lineTo(bRight.x, bRight.y);
    ctx.closePath();
    ctx.fillStyle = glassGrad;
    ctx.fill();

    // Glass edges
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(14,165,233,0.4)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Left edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(apex.x + 3, apex.y + 4);
    ctx.lineTo(bLeft.x + 3, bLeft.y - 2);
    ctx.stroke();

    // Prism angle label
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillText(`A = ${A}°`, apex.x, apex.y - 12);

    // Refractive index label
    ctx.fillStyle = '#64748B';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`n = ${N_GLASS}`, cx, cy + 10);
    ctx.restore();

    // ── Refraction Computation ──
    const i_deg = s.incidentAngle;
    const { r1, r2, e, delta, isTIR } = computeRefraction(i_deg);

    // Left face (apex→bLeft): face normal points inward-left
    // The left face goes from apex to bLeft
    const leftFaceAngle = Math.atan2(bLeft.y - apex.y, bLeft.x - apex.x); // angle of left face edge
    const leftNormalAngle = leftFaceAngle + Math.PI / 2; // outward normal to left face

    // Hit point on left face (midway)
    const hitFrac = 0.5;
    const hitX = apex.x + hitFrac * (bLeft.x - apex.x);
    const hitY = apex.y + hitFrac * (bLeft.y - apex.y);

    // Normal line at hit point (dashed, outward)
    ctx.save();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const nLen = 80;
    ctx.moveTo(hitX - Math.cos(leftNormalAngle) * nLen, hitY - Math.sin(leftNormalAngle) * nLen);
    ctx.lineTo(hitX + Math.cos(leftNormalAngle) * nLen, hitY + Math.sin(leftNormalAngle) * nLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // Normal label
    ctx.fillStyle = '#64748B';
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N₁', hitX - Math.cos(leftNormalAngle) * (nLen + 10), hitY - Math.sin(leftNormalAngle) * (nLen + 10));
    ctx.restore();

    // ── Incident Ray ──
    const incidentRayAngle = leftNormalAngle + (i_deg * Math.PI) / 180;
    const rayLen = 250;

    ctx.save();
    ctx.strokeStyle = '#F59E0B'; // amber incident ray
    ctx.lineWidth = 3;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(hitX - Math.cos(incidentRayAngle) * rayLen, hitY - Math.sin(incidentRayAngle) * rayLen);
    ctx.lineTo(hitX, hitY);
    ctx.stroke();

    // Angle of incidence arc
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    const arcR = 30;
    const normStartAngle = leftNormalAngle + Math.PI; // inward normal direction
    ctx.beginPath();
    ctx.arc(hitX, hitY, arcR, normStartAngle, incidentRayAngle, i_deg < 0);
    ctx.stroke();

    ctx.fillStyle = '#B45309';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const iLabelAngle = (normStartAngle + incidentRayAngle) / 2;
    ctx.fillText(`i=${i_deg}°`, hitX - Math.cos(iLabelAngle) * (arcR + 16), hitY - Math.sin(iLabelAngle) * (arcR + 16));
    ctx.restore();

    if (!isTIR) {
      // ── Refracted Ray Inside Prism ──
      const refractedAngleInside = leftNormalAngle + Math.PI - (r1 * Math.PI) / 180;

      // Find hit on right face (apex→bRight)
      const rightFaceAngle = Math.atan2(bRight.y - apex.y, bRight.x - apex.x);
      const rightNormalAngle = rightFaceAngle - Math.PI / 2;

      // Compute where refracted ray hits right face
      // Parametric intersection
      const dx = Math.cos(refractedAngleInside);
      const dy = Math.sin(refractedAngleInside);

      // Right face line: apex to bRight
      const rx1 = apex.x, ry1 = apex.y, rx2 = bRight.x, ry2 = bRight.y;
      const denom = dx * (ry2 - ry1) - dy * (rx2 - rx1);
      let hitX2 = hitX, hitY2 = hitY;
      if (Math.abs(denom) > 0.001) {
        const t = ((rx1 - hitX) * (ry2 - ry1) - (ry1 - hitY) * (rx2 - rx1)) / denom;
        hitX2 = hitX + t * dx;
        hitY2 = hitY + t * dy;
      }

      // Draw dispersion or single color
      const colors = s.showDispersion ? SPECTRUM : [{ name: 'White', color: '#F59E0B', n: N_GLASS }];

      colors.forEach((spec, ci) => {
        let refAngle: number;
        let emergAngle: number;
        let devAngle: number;

        if (s.showDispersion) {
          const res = computeRefraction(i_deg, spec.n);
          if (res.isTIR) return;
          const rInside = leftNormalAngle + Math.PI - (res.r1 * Math.PI) / 180;
          refAngle = rInside;
          emergAngle = rightNormalAngle - (res.e * Math.PI) / 180;
          devAngle = res.delta;
        } else {
          refAngle = refractedAngleInside;
          emergAngle = rightNormalAngle - (e * Math.PI) / 180;
          devAngle = delta;
        }

        // Recompute hit on right face per color
        const cdx = Math.cos(refAngle);
        const cdy = Math.sin(refAngle);
        const cd = cdx * (ry2 - ry1) - cdy * (rx2 - rx1);
        let hx2 = hitX, hy2 = hitY;
        if (Math.abs(cd) > 0.001) {
          const ct = ((rx1 - hitX) * (ry2 - ry1) - (ry1 - hitY) * (rx2 - rx1)) / cd;
          hx2 = hitX + ct * cdx;
          hy2 = hitY + ct * cdy;
        }

        ctx.save();
        // Internal refracted ray
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = s.showDispersion ? 2 : 3;
        ctx.globalAlpha = s.showDispersion ? 0.7 : 1;
        ctx.beginPath();
        ctx.moveTo(hitX, hitY);
        ctx.lineTo(hx2, hy2);
        ctx.stroke();

        // Emergent ray
        ctx.lineWidth = s.showDispersion ? 2.5 : 3;
        ctx.globalAlpha = 1;
        ctx.shadowColor = spec.color;
        ctx.shadowBlur = s.showDispersion ? 4 : 6;
        ctx.beginPath();
        ctx.moveTo(hx2, hy2);
        ctx.lineTo(hx2 + Math.cos(emergAngle) * 280, hy2 + Math.sin(emergAngle) * 280);
        ctx.stroke();

        // Color label for dispersion
        if (s.showDispersion) {
          const lx = hx2 + Math.cos(emergAngle) * 220;
          const ly = hy2 + Math.sin(emergAngle) * 220;
          ctx.fillStyle = spec.color;
          ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(spec.name, lx + 4, ly + 3);
        }
        ctx.restore();
      });

      // Normal at right face
      ctx.save();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hitX2 - Math.cos(rightNormalAngle) * nLen, hitY2 - Math.sin(rightNormalAngle) * nLen);
      ctx.lineTo(hitX2 + Math.cos(rightNormalAngle) * nLen, hitY2 + Math.sin(rightNormalAngle) * nLen);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#64748B';
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N₂', hitX2 + Math.cos(rightNormalAngle) * (nLen + 10), hitY2 + Math.sin(rightNormalAngle) * (nLen + 10));
      ctx.restore();

      // Deviation angle visual
      if (!s.showDispersion) {
        ctx.save();
        // Extend incident ray forward (undeviated)
        ctx.strokeStyle = 'rgba(245,158,11,0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hitX, hitY);
        ctx.lineTo(hitX + Math.cos(incidentRayAngle) * 350, hitY + Math.sin(incidentRayAngle) * 350);
        ctx.stroke();
        ctx.setLineDash([]);

        // δ label
        ctx.fillStyle = '#DC2626';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`δ = ${delta.toFixed(1)}°`, hitX2 + 40, hitY2 - 20);
        ctx.restore();
      }
    } else {
      // TIR Warning
      ctx.save();
      ctx.fillStyle = '#FEF3C7';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(245,158,11,0.3)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 180, 30, 360, 36, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ Total Internal Reflection — No Emergent Ray', W / 2, 52);
      ctx.restore();
    }

    // ── Light source indicator (left side) ──
    ctx.save();
    const srcX = hitX - Math.cos(incidentRayAngle) * rayLen;
    const srcY = hitY - Math.sin(incidentRayAngle) * rayLen;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(srcX, srcY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(srcX, srcY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0F172A';
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Light Source', srcX, srcY + 20);
    ctx.restore();
  }, [computeRefraction]);

  useEffect(() => {
    let running = true;
    const loop = () => { if (!running) return; draw(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    simState.current.isDraggingRay = true;
    simState.current.dragStartY = y;
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = simState.current;
    if (!s.isDraggingRay) { canvas.style.cursor = 'ns-resize'; return; }
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const dy = y - s.dragStartY;
    s.incidentAngle = Math.max(20, Math.min(80, s.incidentAngle + dy * 0.15));
    s.dragStartY = y;
    syncUI();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    simState.current.isDraggingRay = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  const addReading = () => {
    const { r1, r2, e, delta, isTIR } = computeRefraction(uiState.incidentAngle);
    if (isTIR || readings.length >= 8) return;
    setReadings(prev => [...prev, { srNo: prev.length + 1, i: uiState.incidentAngle, r1: Number(r1.toFixed(1)), r2: Number(r2.toFixed(1)), e: Number(e.toFixed(1)), delta: Number(delta.toFixed(1)) }]);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col p-4 md:p-6 select-none font-sans">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-5 py-3.5 bg-[#111827] border border-sky-500/20 rounded-2xl shadow-xl shadow-sky-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-sky-500/30">🔺</div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">Glass Prism — Refraction & Minimum Deviation</h1>
            <p className="text-xs text-slate-400">Karnataka PUC Physics Practicals • Snell's Law & Dispersion (A = 60°, n = 1.52)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-slate-900/90 rounded-xl border border-slate-700/60 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Deviation:</span>
            <span className={`font-mono font-bold ${uiState.isTIR ? 'text-amber-400' : 'text-emerald-400'}`}>{uiState.isTIR ? 'TIR' : `${uiState.delta.toFixed(1)}°`}</span>
          </div>
          <div className="px-3.5 py-1.5 bg-sky-950/40 rounded-xl border border-sky-500/40 flex items-center gap-2 text-xs">
            <span className="text-sky-300 font-medium">D_min:</span>
            <span className="text-cyan-300 font-mono font-bold text-sm">{uiState.minDeviation.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-900/60 border border-slate-800 rounded-2xl p-3 overflow-hidden shadow-2xl">
        <div className="w-full max-w-5xl aspect-[960/480] relative rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-white">
          <canvas ref={canvasRef} width={960} height={480} style={{ width: '100%', height: '100%', touchAction: 'none' }} className="block select-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
        </div>
        <div className="w-full max-w-5xl mt-2 px-2 flex justify-between items-center text-xs text-slate-400">
          <span>💡 Drag vertically anywhere on the canvas to change the angle of incidence.</span>
          <button onClick={() => { simState.current.showDispersion = !simState.current.showDispersion; syncUI(); }} className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors">
            <Sparkles size={14} /> {uiState.showDispersion ? 'Single Ray' : 'Show Dispersion (VIBGYOR)'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Angle of Incidence (i)</span>
              <span className="font-mono text-xs font-bold text-sky-400">{uiState.incidentAngle.toFixed(0)}°</span>
            </div>
            <input type="range" min="20" max="80" step="1" value={uiState.incidentAngle} onChange={ev => { simState.current.incidentAngle = parseFloat(ev.target.value); syncUI(); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => { simState.current.incidentAngle = 48.6; syncUI(); }} className="py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-bold">Set to D_min (≈49°)</button>
              <button onClick={() => { simState.current.incidentAngle = 45; simState.current.showDispersion = false; syncUI(); }} className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-1"><RotateCcw size={13} /> Reset</button>
            </div>
          </div>

          <div className="bg-[#111827] border border-sky-500/30 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs uppercase tracking-wider text-sky-400 font-bold mb-3">📐 Live Refraction Readings</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ l: 'i (incid.)', v: `${uiState.incidentAngle.toFixed(0)}°`, c: 'text-amber-300' },
                { l: 'r₁ (refr. 1)', v: `${uiState.r1}°`, c: 'text-sky-300' },
                { l: 'r₂ (refr. 2)', v: `${uiState.r2}°`, c: 'text-cyan-300' },
                { l: 'e (emerg.)', v: `${uiState.e}°`, c: 'text-rose-300' },
                { l: 'δ (deviat.)', v: uiState.isTIR ? 'TIR' : `${uiState.delta}°`, c: 'text-emerald-300' },
                { l: 'D_min', v: `${uiState.minDeviation}°`, c: 'text-sky-200' }].map((item, idx) => (
                <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">{item.l}</span>
                  <span className={`text-sm font-mono font-bold ${item.c}`}>{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 text-xs">
              <button onClick={() => setActiveTab('graph')} className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'graph' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'}`}>i–δ Graph</button>
              <button onClick={() => setActiveTab('table')} className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'}`}>Observations ({readings.length})</button>
              <button onClick={() => setActiveTab('theory')} className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'theory' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'}`}>Theory</button>
            </div>
            <div className="flex gap-2">
              <button onClick={addReading} disabled={uiState.isTIR || readings.length >= 8} className="py-1 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-40 shadow-md shadow-sky-500/20"><Plus size={14} /> Record ({readings.length}/8)</button>
              <button onClick={() => setReadings([])} disabled={readings.length === 0} className="py-1 px-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-lg text-xs border border-slate-700 disabled:opacity-30"><Trash2 size={13} /></button>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex-1">
            {activeTab === 'graph' ? (
              <div className="w-full h-52 bg-slate-900/90 rounded-xl border border-slate-800 p-2 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 190">
                  {[50, 100, 150].map(y => (<line key={y} x1="50" y1={y} x2="380" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />))}
                  {[110, 170, 230, 290, 350].map(x => (<line key={x} x1={x} y1="20" x2={x} y2="170" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />))}
                  <line x1="50" y1="170" x2="380" y2="170" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="50" y2="170" stroke="#94A3B8" strokeWidth="1.5" />
                  <text x="380" y="185" fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">i (°) →</text>
                  <text x="40" y="20" fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">δ ↑</text>

                  {/* Theoretical i-δ curve */}
                  <path d={(() => {
                    let d = '';
                    for (let i = 25; i <= 75; i += 1) {
                      const res = computeRefraction(i);
                      if (res.isTIR) continue;
                      const px = 50 + ((i - 20) / 60) * 330;
                      const py = 170 - (res.delta / 60) * 150;
                      d += (d === '' ? 'M' : 'L') + `${px},${py}`;
                    }
                    return d;
                  })()} fill="none" stroke="rgba(14,165,233,0.4)" strokeWidth="2" />

                  {/* Min deviation line */}
                  <line x1="50" y1={170 - (uiState.minDeviation / 60) * 150} x2="380" y2={170 - (uiState.minDeviation / 60) * 150} stroke="rgba(16,185,129,0.4)" strokeWidth="1" strokeDasharray="4 2" />
                  <text x="385" y={170 - (uiState.minDeviation / 60) * 150 + 3} fill="#10B981" fontSize="8" fontFamily="JetBrains Mono">D_min</text>

                  {readings.map((r, idx) => {
                    const px = 50 + ((r.i - 20) / 60) * 330;
                    const py = 170 - (r.delta / 60) * 150;
                    return <circle key={idx} cx={px} cy={py} r="4.5" fill="#0EA5E9" stroke="#FFF" strokeWidth="1.5" />;
                  })}
                </svg>
              </div>
            ) : activeTab === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr><th className="py-1.5 px-2">#</th><th className="py-1.5 px-2 font-mono">i (°)</th><th className="py-1.5 px-2 font-mono">r₁ (°)</th><th className="py-1.5 px-2 font-mono">r₂ (°)</th><th className="py-1.5 px-2 font-mono">e (°)</th><th className="py-1.5 px-2 font-mono">δ (°)</th></tr>
                  </thead>
                  <tbody>
                    {readings.length === 0 ? (<tr><td colSpan={6} className="text-center py-4 text-slate-500">No readings yet.</td></tr>) :
                      readings.map(r => (<tr key={r.srNo} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                        <td className="py-1 px-2 text-slate-400">{r.srNo}</td>
                        <td className="py-1 px-2 font-mono text-amber-300">{r.i}°</td>
                        <td className="py-1 px-2 font-mono">{r.r1}°</td>
                        <td className="py-1 px-2 font-mono">{r.r2}°</td>
                        <td className="py-1 px-2 font-mono text-rose-300">{r.e}°</td>
                        <td className="py-1 px-2 font-mono text-emerald-400 font-bold">{r.delta}°</td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
                <div className="text-sky-400 font-bold mb-1">🔬 Prism Refraction:</div>
                <div>• Snell's Law: n₁ sin i = n₂ sin r₁</div>
                <div>• Prism Relation: r₁ + r₂ = A (prism angle)</div>
                <div>• Deviation: δ = i + e − A</div>
                <div>• Minimum Deviation: D_m when i = e (symmetric passage)</div>
                <div>• Refractive Index: n = sin((A + D_m)/2) / sin(A/2)</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
