import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Play, Pause, Sparkles, Activity, Timer } from 'lucide-react';

interface SpringMaterial {
  name: string;
  springConstantK: number; // N/m
  naturalLengthCm: number; // cm
  color: string;
}

const SPRING_TYPES: SpringMaterial[] = [
  { name: 'Standard Steel Spring (k = 25 N/m)', springConstantK: 25.0, naturalLengthCm: 12.0, color: '#94A3B8' },
  { name: 'Soft Phosphor Bronze (k = 15 N/m)', springConstantK: 15.0, naturalLengthCm: 14.0, color: '#F59E0B' },
  { name: 'Stiff Piano Wire Spring (k = 40 N/m)', springConstantK: 40.0, naturalLengthCm: 10.0, color: '#64748B' }
];

interface HookeObservation {
  srNo: number;
  massGrams: number; // g
  loadNewtons: number; // F = mg (N)
  scaleReadingCm: number; // cm
  extensionCm: number; // delta x (cm)
  calculatedK: number; // N/m
  timeFor20OscSec?: number; // sec
  timePeriodT?: number; // sec
}

export const HookesLawLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [selectedSpringIdx, setSelectedSpringIdx] = useState<number>(0);
  const [massGrams, setMassGrams] = useState<number>(150); // 50g to 500g (in steps of 50g)
  const [isOscillating, setIsOscillating] = useState<boolean>(false);
  const [oscAmplitude, setOscAmplitude] = useState<number>(0); // cm
  
  // Stopwatch for counting oscillations
  const [stopwatchRunning, setStopwatchRunning] = useState<boolean>(false);
  const [stopwatchTime, setStopwatchTime] = useState<number>(0); // in seconds
  const [oscCount, setOscCount] = useState<number>(0);

  const [observationTable, setObservationTable] = useState<HookeObservation[]>([]);

  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const stopwatchIntervalRef = useRef<number | null>(null);

  const g = 9.8; // m/s^2
  const activeSpring = SPRING_TYPES[selectedSpringIdx];
  const k = activeSpring.springConstantK; // N/m
  const loadN = (massGrams / 1000) * g; // F = mg (N)

  // Static extension: delta_x = F / k (in meters)
  const staticExtensionM = loadN / k;
  const staticExtensionCm = staticExtensionM * 100; // in cm
  const equilibriumPositionCm = activeSpring.naturalLengthCm + staticExtensionCm;

  // Theoretical Time Period T = 2 * pi * sqrt(M / k)
  const theoreticalPeriodT = 2 * Math.PI * Math.sqrt((massGrams / 1000) / k);

  // Pluck / Displace Spring
  const handlePluckSpring = () => {
    setIsOscillating(true);
    setOscAmplitude(3.5); // 3.5 cm initial displacement
  };

  // Stopwatch controls
  const handleToggleStopwatch = () => {
    if (stopwatchRunning) {
      setStopwatchRunning(false);
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    } else {
      setStopwatchRunning(true);
    }
  };

  const handleResetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setOscCount(0);
    if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
  };

  useEffect(() => {
    if (stopwatchRunning) {
      const start = Date.now() - stopwatchTime * 1000;
      stopwatchIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        setStopwatchTime(elapsed);
        // Estimate oscillation count
        if (theoreticalPeriodT > 0) {
          setOscCount(Math.floor(elapsed / theoreticalPeriodT));
        }
      }, 50);
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchRunning, theoreticalPeriodT]);

  // Record observation
  const addObservation = () => {
    const calculatedKVal = staticExtensionCm > 0
      ? parseFloat(((loadN / staticExtensionCm) * 100).toFixed(2))
      : 0;

    const newRecord: HookeObservation = {
      srNo: observationTable.length + 1,
      massGrams,
      loadNewtons: parseFloat(loadN.toFixed(3)),
      scaleReadingCm: parseFloat(equilibriumPositionCm.toFixed(2)),
      extensionCm: parseFloat(staticExtensionCm.toFixed(2)),
      calculatedK: calculatedKVal,
      timeFor20OscSec: stopwatchTime > 0 ? parseFloat(stopwatchTime.toFixed(2)) : undefined,
      timePeriodT: stopwatchTime > 0 && oscCount > 0 ? parseFloat((stopwatchTime / oscCount).toFixed(3)) : undefined
    };

    setObservationTable([...observationTable, newRecord]);
  };

  // Render Spring Simulation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      timeRef.current += dt;
      const t = timeRef.current;

      const width = canvas.width;
      const height = canvas.height;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Dot grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      const dotSpacing = 24;
      for (let x = 0; x < width; x += dotSpacing) {
        for (let y = 0; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const benchGrad = ctx.createLinearGradient(0, 0, 0, height);
      benchGrad.addColorStop(0, 'rgba(248, 250, 252, 0.6)');
      benchGrad.addColorStop(1, 'rgba(241, 245, 249, 0.9)');
      ctx.fillStyle = benchGrad;
      ctx.fillRect(0, 0, width, height);

      // Instantaneous oscillation displacement: y_osc = Amp * exp(-gamma * t) * cos(omega * t)
      let currentDynExtensionCm = staticExtensionCm;
      if (isOscillating && oscAmplitude > 0.05) {
        const omega = Math.sqrt(k / (massGrams / 1000));
        const gamma = 0.35; // damping coefficient
        const dynDisp = oscAmplitude * Math.cos(omega * t);
        currentDynExtensionCm = staticExtensionCm + dynDisp;

        // Damping decay
        setOscAmplitude(prev => Math.max(0, prev - dt * 0.45));
        if (oscAmplitude <= 0.06) {
          setIsOscillating(false);
        }
      }

      // 1. Retort Stand & Clamp
      const standBaseX = 140;
      const standBaseY = height - 25;
      const standTopY = 40;

      // Cast iron heavy base
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(standBaseX - 70, standBaseY, 140, 18, 4);
      ctx.fill();
      ctx.restore();

      // Vertical Chrome Rod
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(standBaseX - 35, standBaseY);
      ctx.lineTo(standBaseX - 35, standTopY);
      ctx.stroke();

      // Top Clamp with Extension Arm & Hook
      const clampX = standBaseX - 35;
      const clampY = standTopY + 15;
      const hookX = standBaseX + 80;
      const hookY = clampY + 8;

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(clampX - 10, clampY - 10, 20, 20, 3);
      ctx.fill();

      // Horizontal Extension Arm
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(clampX, clampY);
      ctx.lineTo(hookX, clampY);
      ctx.stroke();

      // Suspension Ring / Hook
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(hookX, hookY, 5, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Vertical Mirror Scale (0 to 50 cm)
      const scaleX = hookX + 55;
      const scaleTopY = hookY + 10;
      const scaleHeight = 220;
      const pxPerCm = scaleHeight / 40; // 40 cm scale

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      // Mirror backing strip in the center (glass reflection)
      ctx.fillStyle = '#FEF3C7'; // pale wooden / brass frame
      ctx.fillRect(scaleX - 18, scaleTopY, 36, scaleHeight);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(scaleX - 18, scaleTopY, 36, scaleHeight);

      // Central mirror strip
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(scaleX - 4, scaleTopY + 5, 8, scaleHeight - 10);
      ctx.restore();

      // Scale Graduations (0 to 40 cm)
      ctx.fillStyle = '#0F172A';
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';

      for (let cm = 0; cm <= 40; cm += 2) {
        const yPos = scaleTopY + cm * pxPerCm;
        const isTen = cm % 10 === 0;
        const isFive = cm % 5 === 0;
        const markW = isTen ? 12 : isFive ? 8 : 4;

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = isTen ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(scaleX - 18, yPos);
        ctx.lineTo(scaleX - 18 + markW, yPos);
        ctx.stroke();

        if (isTen) {
          ctx.fillText(`${cm}`, scaleX - 20, yPos + 3);
        }
      }

      // 3. Helical Spring with 3D Shading
      const springTopY = hookY + 5;
      const currentSpringLenPx = (activeSpring.naturalLengthCm + currentDynExtensionCm) * pxPerCm;
      const springBottomY = springTopY + currentSpringLenPx;
      const numCoils = 14;
      const coilRadius = 14;

      ctx.save();
      ctx.strokeStyle = activeSpring.color;
      ctx.lineWidth = 3.2;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 4;

      // Draw realistic coiled helix
      ctx.beginPath();
      ctx.moveTo(hookX, springTopY);

      const coilStepY = (springBottomY - springTopY) / numCoils;
      for (let c = 0; c < numCoils; c++) {
        const cy = springTopY + c * coilStepY;
        // Left loop
        ctx.bezierCurveTo(
          hookX - coilRadius, cy + coilStepY * 0.25,
          hookX - coilRadius, cy + coilStepY * 0.75,
          hookX, cy + coilStepY
        );
        // Right loop
        ctx.bezierCurveTo(
          hookX + coilRadius, cy + coilStepY * 1.25,
          hookX + coilRadius, cy + coilStepY * 1.75,
          hookX, cy + coilStepY * 2
        );
        c++;
      }
      ctx.stroke();
      ctx.restore();

      // 4. Horizontal Anti-Parallax Pointer attached to bottom hook
      const pointerY = springBottomY;

      ctx.strokeStyle = '#DC2626'; // Red pointer
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hookX, pointerY);
      ctx.lineTo(scaleX - 4, pointerY); // points right to mirror scale
      ctx.stroke();

      // Pointer tip triangle
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.moveTo(scaleX - 4, pointerY);
      ctx.lineTo(scaleX - 10, pointerY - 3);
      ctx.lineTo(scaleX - 10, pointerY + 3);
      ctx.closePath();
      ctx.fill();

      // Reading badge along scale
      const currentPointerReadingCm = activeSpring.naturalLengthCm + currentDynExtensionCm;
      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.roundRect(scaleX + 22, pointerY - 9, 65, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentPointerReadingCm.toFixed(2)} cm`, scaleX + 54, pointerY + 3);

      // 5. Slotted Weights & Weight Hanger (hanging from spring bottom)
      const hangerTopY = pointerY + 8;
      const numDisks = Math.round(massGrams / 50); // 50g per disc

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Chrome Hanger Rod
      const hangerBaseY = hangerTopY + 16 + numDisks * 8;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hookX, pointerY);
      ctx.lineTo(hookX, hangerBaseY + 6);
      ctx.stroke();

      // Bottom support disc
      ctx.fillStyle = '#475569';
      ctx.fillRect(hookX - 14, hangerBaseY, 28, 5);

      // Slotted weight discs (metallic brass/chrome)
      for (let d = 0; d < numDisks; d++) {
        const diskY = hangerTopY + 10 + d * 8;
        const diskGrad = ctx.createLinearGradient(hookX - 18, diskY, hookX + 18, diskY);
        diskGrad.addColorStop(0, '#CBD5E1');
        diskGrad.addColorStop(0.3, '#F8FAFC');
        diskGrad.addColorStop(0.7, '#94A3B8');
        diskGrad.addColorStop(1, '#475569');

        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.roundRect(hookX - 18, diskY, 36, 7, 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Slot cutout
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(hookX - 2, diskY + 1, 4, 5);
      }
      ctx.restore();

      // Mass & Load Label
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${massGrams} g`, hookX, hangerBaseY + 20);
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`F = ${loadN.toFixed(2)} N`, hookX, hangerBaseY + 32);

      // 6. Canvas Header Status Banner
      const bannerW = 340;
      const bannerH = 34;
      const bannerX = width / 2 - bannerW / 2 + 120;
      const bannerY = 16;

      ctx.save();
      let bBg = 'rgba(241, 245, 249, 0.95)';
      let bBorder = '#CBD5E1';
      let bTitle = `Extension Δx = ${staticExtensionCm.toFixed(2)} cm | Load F = ${loadN.toFixed(2)} N`;
      let bSub = `Spring Constant k = (F / Δx) = ${k.toFixed(1)} N/m`;

      if (isOscillating) {
        bBg = 'rgba(236, 253, 245, 0.95)';
        bBorder = '#10B981';
        bTitle = `⚡ Oscillating: T = ${theoreticalPeriodT.toFixed(3)} s (f = ${(1/theoreticalPeriodT).toFixed(2)} Hz)`;
        bSub = `Use stopwatch below to count 20 oscillations`;
      }

      ctx.fillStyle = bBg;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
      ctx.fill();
      ctx.strokeStyle = bBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isOscillating ? '#065F46' : '#0F172A';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bTitle, bannerX + bannerW / 2, bannerY + 14);

      ctx.fillStyle = isOscillating ? '#059669' : '#64748B';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(bSub, bannerX + bannerW / 2, bannerY + 28);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    massGrams,
    selectedSpringIdx,
    isOscillating,
    oscAmplitude,
    staticExtensionCm,
    loadN,
    k,
    activeSpring,
    theoreticalPeriodT
  ]);

  // Render F vs delta x Graph Canvas
  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const ox = 45;
    const oy = height - 35;
    const gw = width - 60;
    const gh = height - 55;

    // Grid lines
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let x = ox; x <= ox + gw; x += gw / 5) {
      ctx.beginPath();
      ctx.moveTo(x, oy - gh);
      ctx.lineTo(x, oy);
      ctx.stroke();
    }
    for (let y = oy; y >= oy - gh; y -= gh / 5) {
      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + gw, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + gw + 10, oy);
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy - gh - 10);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('Extension Δx (cm) →', ox + gw, oy + 24);
    ctx.textAlign = 'left';
    ctx.fillText('↑ Load F (N)', ox - 10, 16);

    // Max ranges: Extension 25 cm, Load 5 N
    const maxExtCm = 25;
    const maxLoadN = 5.0;

    // Plot Theoretical Linear Fit Line F = k * delta_x
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);

    const endExtCm = maxExtCm;
    const endLoadN = (k * (endExtCm / 100));
    const endPx = ox + (endExtCm / maxExtCm) * gw;
    const endPy = oy - (endLoadN / maxLoadN) * gh;
    ctx.lineTo(endPx, endPy);
    ctx.stroke();

    // Plot observation points if recorded
    observationTable.forEach(obs => {
      const px = ox + (obs.extensionCm / maxExtCm) * gw;
      const py = oy - (obs.loadNewtons / maxLoadN) * gh;

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#065F46';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Current Operating Point
    const curPx = ox + (staticExtensionCm / maxExtCm) * gw;
    const curPy = oy - (loadN / maxLoadN) * gh;

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(curPx, curPy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Point badge
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(curPx + 8, curPy - 18, 90, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`(${staticExtensionCm.toFixed(1)}cm, ${loadN.toFixed(2)}N)`, curPx + 53, curPy - 6);
  }, [k, staticExtensionCm, loadN, observationTable]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 select-none">
      {/* Simulation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Hooke&apos;s Law & Helical Spring Constant
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Determine the spring constant <span className="font-semibold text-slate-700">k = F / Δx</span> using static load extension and oscillation time period <span className="font-semibold text-slate-700">T = 2π√(M/k)</span>.
          </p>
        </div>

        {/* Stopwatch Card in Header */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Timer className="w-4 h-4 text-sky-600" />
          <div className="font-mono text-xs font-bold text-slate-800">
            {stopwatchTime.toFixed(2)} s ({oscCount} osc)
          </div>
          <button
            onClick={handleToggleStopwatch}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              stopwatchRunning ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white hover:bg-sky-600'
            }`}
          >
            {stopwatchRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleResetStopwatch}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Dual Stage: Spring Visualizer & Dynamic Load-Extension Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Spring Retort Stand (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
          <canvas
            ref={canvasRef}
            width={580}
            height={310}
            className="w-full h-auto"
          />

          {/* Action Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block animate-pulse"></span>
              Pluck spring to initiate harmonic oscillation
            </span>

            <button
              onClick={handlePluckSpring}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white active:scale-95 shadow-sm transition"
            >
              Pluck / Displace Spring
            </button>
          </div>
        </div>

        {/* Right: Dynamic Load vs Extension Graph (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Load (F) vs Extension (Δx) Curve
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold">
              Slope k = {k} N/m
            </span>
          </div>

          <canvas
            ref={graphCanvasRef}
            width={420}
            height={280}
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* Parameter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Hanging Mass Slider */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Hanging Mass (M)
              </label>
              <span className="text-sm font-bold font-mono text-sky-600">{massGrams} g</span>
            </div>

            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={massGrams}
              onChange={e => setMassGrams(parseInt(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>50g</span>
              <span>250g</span>
              <span>500g</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Load Force (F = mg):</span>
            <span className="font-mono font-bold text-slate-800">{loadN.toFixed(2)} N</span>
          </div>
        </div>

        {/* Card 2: Spring Material Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Spring Material
            </label>
            <select
              value={selectedSpringIdx}
              onChange={e => setSelectedSpringIdx(parseInt(e.target.value))}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {SPRING_TYPES.map((sp, idx) => (
                <option key={sp.name} value={idx}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Spring Constant k:</span>
            <span className="font-mono font-bold text-slate-800">{activeSpring.springConstantK} N/m</span>
          </div>
        </div>

        {/* Card 3: Extension Readings */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Extension (Δx)</span>
              <span className="text-sm font-mono font-bold text-emerald-600">{staticExtensionCm.toFixed(2)} cm</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Scale Reading: {equilibriumPositionCm.toFixed(2)} cm
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Period T = 2π√(M/k):</span>
            <span className="font-mono font-bold text-slate-800">{theoreticalPeriodT.toFixed(3)} s</span>
          </div>
        </div>

        {/* Card 4: Action Button */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Data Recording
            </span>
            <div className="text-[11px] text-slate-500">
              Add current load, extension, and oscillation period to table
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={addObservation}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Reading
            </button>
          </div>
        </div>
      </div>

      {/* Observation Table & Data Analysis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Observation Table</h3>
            <p className="text-xs text-slate-500">
              Verification of Hooke&apos;s Law: <span className="font-semibold text-slate-700">F ∝ Δx</span> and Determination of Spring Constant <span className="font-semibold text-slate-700">k</span>
            </p>
          </div>

          {observationTable.length > 0 && (
            <button
              onClick={() => setObservationTable([])}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Table
            </button>
          )}
        </div>

        {observationTable.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No readings recorded yet. Vary mass, observe pointer on mirror scale, and click &quot;Record Reading&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Mass M (g)</th>
                  <th className="py-2.5 px-3">Load F = mg (N)</th>
                  <th className="py-2.5 px-3">Scale Reading (cm)</th>
                  <th className="py-2.5 px-3">Extension Δx (cm)</th>
                  <th className="py-2.5 px-3">Spring Constant k (N/m)</th>
                  <th className="py-2.5 px-3">Time for 20 Osc (s)</th>
                  <th className="py-2.5 px-3">Period T (s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observationTable.map(row => (
                  <tr key={row.srNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.srNo}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{row.massGrams}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{row.loadNewtons.toFixed(3)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.scaleReadingCm.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{row.extensionCm.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.calculatedK.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{row.timeFor20OscSec ? `${row.timeFor20OscSec} s` : '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{row.timePeriodT ? `${row.timePeriodT} s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Theoretical Formula Reference */}
        <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-sky-950">
          <div>
            <div className="font-bold text-sky-900 mb-0.5">Key Formulae:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Hooke&apos;s Law:</strong> Restoring force is directly proportional to extension: <span className="font-mono font-semibold">F = k · Δx</span>.</li>
              <li><strong>Spring Constant:</strong> <span className="font-mono font-semibold">k = F / Δx = (M · g) / Δx</span> (in N/m).</li>
              <li><strong>Oscillation Period:</strong> <span className="font-mono font-semibold">T = 2π · √(M / k)</span>.</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Hooke&apos;s Law</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">F = k · Δx</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HookesLawLab;
