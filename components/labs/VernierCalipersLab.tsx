import React, { useEffect, useRef, useState, useCallback } from 'react';

// Object parameters
const OBJECTS = {
  cylinder: { diameter: 2.34, label: 'Cylinder', color: '#D97706' },
  block: { diameter: 1.87, label: 'Block', color: '#94A3B8' },
  sphere: { diameter: 3.15, label: 'Sphere', color: '#F59E0B' },
};

export default function VernierCalipersLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  
  // Physics and interaction state stored in refs to avoid closure staleness in rAF
  const simState = useRef({
    jawPos: 0, // cm
    objectType: 'cylinder' as keyof typeof OBJECTS,
    isLocked: false,
    isDragging: false,
    dragStartX: 0,
    startJawPos: 0,
    hoverLock: false,
  });

  // UI state for React shell
  const [uiState, setUiState] = useState({
    jawPos: 0,
    objectType: 'cylinder' as keyof typeof OBJECTS,
    isLocked: false,
    msr: 0,
    vsd: 0,
    total: 0
  });

  const updateUI = useCallback(() => {
    const s = simState.current;
    
    // Calculate readings
    const msr = Math.floor(s.jawPos * 10) / 10;
    
    let bestVsd = 0;
    let minDiff = Infinity;
    for (let i = 0; i <= 10; i++) {
      const vX = s.jawPos * 10 + i * 0.9;
      const nearestMainX = Math.round(vX);
      const diff = Math.abs(vX - nearestMainX);
      if (diff < minDiff) {
        minDiff = diff;
        bestVsd = i;
      }
    }
    
    const total = msr + bestVsd * 0.01;
    
    setUiState({
      jawPos: s.jawPos,
      objectType: s.objectType,
      isLocked: s.isLocked,
      msr,
      vsd: bestVsd,
      total
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = simState.current;
    const width = 960;
    const height = 520;
    const pxPerCm = 100;
    const pxPerMm = pxPerCm / 10;
    const zeroX = 250;
    const mainBarY = 220;
    
    // Clear and draw background
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y < height; y += 20) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    // Bench bottom edge
    const benchGradient = ctx.createLinearGradient(0, height - 60, 0, height);
    benchGradient.addColorStop(0, 'rgba(0,0,0,0)');
    benchGradient.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = benchGradient;
    ctx.fillRect(0, height - 60, width, 60);
    
    const objDiameterCm = OBJECTS[s.objectType].diameter;
    const jawPx = s.jawPos * pxPerCm;
    
    // Draw Object
    ctx.save();
    const objW = objDiameterCm * pxPerCm;
    const objH = Math.min(objW, 80);
    const objX = zeroX + objW / 2;
    const objY = mainBarY + 50;

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    ctx.translate(objX, objY);
    if (s.objectType === 'cylinder') {
      const grad = ctx.createLinearGradient(-objW/2, -objH/2, objW/2, objH/2);
      grad.addColorStop(0, '#D97706');
      grad.addColorStop(1, '#B45309');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-objW/2, -objH/2, objW, objH, 8);
      ctx.fill();
    } else if (s.objectType === 'block') {
      const grad = ctx.createLinearGradient(-objW/2, -objH/2, objW/2, objH/2);
      grad.addColorStop(0, '#94A3B8');
      grad.addColorStop(1, '#64748B');
      ctx.fillStyle = grad;
      ctx.fillRect(-objW/2, -objH/2, objW, objH);
    } else if (s.objectType === 'sphere') {
      const grad = ctx.createRadialGradient(-objW/6, -objW/6, objW/10, 0, 0, objW/2);
      grad.addColorStop(0, '#FCD34D');
      grad.addColorStop(0.3, '#F59E0B');
      grad.addColorStop(1, '#92400E');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, objW/2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Contact Glow
    const isTouching = Math.abs(s.jawPos - objDiameterCm) < 0.02;
    if (isTouching) {
      ctx.save();
      ctx.shadowColor = 'rgba(14,165,233,0.8)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(zeroX, objY - 30); ctx.lineTo(zeroX, objY + 30);
      ctx.moveTo(zeroX + jawPx, objY - 30); ctx.lineTo(zeroX + jawPx, objY + 30);
      ctx.stroke();
      ctx.restore();
    }

    // --- Caliper Drawing Functions ---
    const drawMainScaleBar = () => {
      const barX = zeroX - 40;
      const barY = mainBarY;
      const barW = 750;
      const barH = 44;
      
      const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
      grad.addColorStop(0, '#F1F5F9');
      grad.addColorStop(0.5, '#CBD5E1');
      grad.addColorStop(1, '#94A3B8');
      
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();
      ctx.stroke();

      // Inner groove
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(barX + 10, barY + 22, barW - 20, 10);

      // Main scale markings
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'center';
      ctx.font = '9px "JetBrains Mono", monospace';
      
      for (let i = 0; i <= 150; i++) {
        const mx = zeroX + i * pxPerMm;
        let h = 6;
        if (i % 10 === 0) h = 14;
        else if (i % 5 === 0) h = 10;
        
        ctx.fillRect(mx - 0.5, barY, 1, h);
        
        if (i % 10 === 0) {
          ctx.fillText((i / 10).toString(), mx, barY + h + 12);
        }
      }
    };

    const drawFixedJaw = () => {
      const grad = ctx.createLinearGradient(zeroX - 30, 0, zeroX, 0);
      grad.addColorStop(0, '#CBD5E1');
      grad.addColorStop(1, '#94A3B8');
      
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;

      // Lower fixed jaw
      ctx.beginPath();
      ctx.moveTo(zeroX - 30, mainBarY + 44);
      ctx.lineTo(zeroX, mainBarY + 44);
      ctx.lineTo(zeroX, mainBarY + 110);
      ctx.lineTo(zeroX - 10, mainBarY + 110);
      ctx.lineTo(zeroX - 30, mainBarY + 70);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Upper fixed jaw
      ctx.beginPath();
      ctx.moveTo(zeroX - 30, mainBarY);
      ctx.lineTo(zeroX, mainBarY);
      ctx.lineTo(zeroX, mainBarY - 35);
      ctx.lineTo(zeroX - 10, mainBarY - 35);
      ctx.lineTo(zeroX - 30, mainBarY - 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const drawMovableJaw = (jx: number) => {
      const blockX = zeroX + jx;
      const blockW = 110;
      const blockY = mainBarY - 4;
      const blockH = 52;
      
      const grad = ctx.createLinearGradient(0, blockY, 0, blockY + blockH);
      grad.addColorStop(0, '#F1F5F9');
      grad.addColorStop(0.5, '#CBD5E1');
      grad.addColorStop(1, '#94A3B8');
      
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;
      
      // Sliding block
      ctx.beginPath();
      ctx.roundRect(blockX, blockY, blockW, blockH, 3);
      ctx.fill();
      ctx.stroke();

      // Lower movable jaw
      ctx.beginPath();
      ctx.moveTo(blockX, mainBarY + 44);
      ctx.lineTo(blockX + 30, mainBarY + 44);
      ctx.lineTo(blockX + 30, mainBarY + 70);
      ctx.lineTo(blockX + 10, mainBarY + 110);
      ctx.lineTo(blockX, mainBarY + 110);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Upper movable jaw
      ctx.beginPath();
      ctx.moveTo(blockX, mainBarY);
      ctx.lineTo(blockX + 30, mainBarY);
      ctx.lineTo(blockX + 30, mainBarY - 15);
      ctx.lineTo(blockX + 10, mainBarY - 35);
      ctx.lineTo(blockX, mainBarY - 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lock screw
      ctx.save();
      ctx.translate(blockX + 25, blockY - 8);
      ctx.fillStyle = s.hoverLock ? '#CBD5E1' : '#94A3B8';
      ctx.beginPath();
      ctx.roundRect(-8, -4, 16, 8, 2);
      ctx.fill();
      ctx.stroke();
      if (s.isLocked) ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-6, -1, 12, 2);
      ctx.fillRect(-1, -6, 2, 12);
      ctx.restore();

      // Thumbwheel
      ctx.fillStyle = '#64748B';
      ctx.fillRect(blockX + blockW - 15, blockY + blockH, 15, 8);
      ctx.fillStyle = '#475569';
      for (let i = 0; i < 15; i += 3) {
        ctx.fillRect(blockX + blockW - 15 + i, blockY + blockH, 1, 8);
      }
      
      // Depth rod
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(zeroX + 710, mainBarY + 15, jx, 10);
      ctx.strokeRect(zeroX + 710, mainBarY + 15, jx, 10);

      // Vernier scale markings & calculation
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'center';
      ctx.font = '8px "JetBrains Mono", monospace';
      
      let bestVsd = 0;
      let minDiff = Infinity;
      for (let i = 0; i <= 10; i++) {
        const vX = s.jawPos * 10 + i * 0.9;
        const nearestMainX = Math.round(vX);
        const diff = Math.abs(vX - nearestMainX);
        if (diff < minDiff) {
          minDiff = diff;
          bestVsd = i;
        }
      }

      for (let i = 0; i <= 10; i++) {
        const vx = blockX + i * 9;
        const isBest = (i === bestVsd);
        
        ctx.save();
        if (isBest) {
          ctx.fillStyle = '#0EA5E9';
          ctx.shadowColor = '#0EA5E9';
          ctx.shadowBlur = 4;
        }
        
        let h = 8;
        if (i % 5 === 0) h = 12;
        
        ctx.fillRect(vx - 0.5, blockY + blockH - h, 1, h);
        
        if (i === 0 || i === 5 || i === 10) {
          ctx.fillText(i.toString(), vx, blockY + blockH - h - 4);
        }
        ctx.restore();
      }
    };

    drawMainScaleBar();
    drawFixedJaw();
    drawMovableJaw(jawPx);

    // --- Magnified Loupe ---
    const drawLoupe = () => {
      const cx = 150;
      const cy = 120;
      const r = 75;
      
      ctx.save();
      // Loupe border
      const borderGrad = ctx.createRadialGradient(cx, cy, r - 5, cx, cy, r + 5);
      borderGrad.addColorStop(0, '#94A3B8');
      borderGrad.addColorStop(0.5, '#F8FAFC');
      borderGrad.addColorStop(1, '#475569');
      ctx.lineWidth = 6;
      ctx.strokeStyle = borderGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Clip area
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Zoom transform centered on vernier zero
      const targetX = zeroX + jawPx;
      const targetY = mainBarY + 30;
      const zoom = 3;
      
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-targetX, -targetY);

      // Re-draw scale area
      drawMainScaleBar();
      drawMovableJaw(jawPx);

      ctx.restore();

      // Glass shine
      ctx.save();
      const shineGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      shineGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
      shineGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
      shineGrad.addColorStop(1, 'rgba(200,220,255,0.1)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawLoupe();

    // --- Reading Panel on Canvas ---
    const drawReadingPanel = () => {
      const px = width - 220;
      const py = 30;
      const pw = 190;
      const ph = 140;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 8);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('READING', px + pw/2, py + 20);

      // Calculations again for panel
      const msr = Math.floor(s.jawPos * 10) / 10;
      let bestVsd = 0;
      let minDiff = Infinity;
      for (let i = 0; i <= 10; i++) {
        const vX = s.jawPos * 10 + i * 0.9;
        const nearestMainX = Math.round(vX);
        const diff = Math.abs(vX - nearestMainX);
        if (diff < minDiff) {
          minDiff = diff;
          bestVsd = i;
        }
      }
      const lc = 0.01;
      const total = msr + bestVsd * lc;

      const labels = ['MSR:', 'VSD:', 'LC:', 'Total:'];
      const values = [`${msr.toFixed(1)} cm`, `${bestVsd}`, `${lc.toFixed(2)} cm`, `${total.toFixed(2)} cm`];

      ctx.textAlign = 'left';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      for(let i=0; i<4; i++) {
        ctx.fillStyle = '#475569';
        ctx.fillText(labels[i], px + 20, py + 50 + i * 22);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = i === 3 ? '#10B981' : '#0EA5E9';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText(values[i], px + pw - 20, py + 50 + i * 22);
        ctx.textAlign = 'left';
      }

      ctx.restore();
    };
    drawReadingPanel();

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = 960 * dpr;
      canvas.height = 520 * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Normalize coordinates based on scaling
    const scaleX = 960 / rect.width;
    const scaleY = 520 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const s = simState.current;
    const pxPerCm = 100;
    const zeroX = 250;
    const blockX = zeroX + s.jawPos * pxPerCm;
    const blockY = 216;
    const blockW = 110;
    const blockH = 52;

    // Check if clicking lock screw
    const screwX = blockX + 25;
    const screwY = blockY - 8;
    if (Math.abs(x - screwX) < 15 && Math.abs(y - screwY) < 15) {
      s.isLocked = !s.isLocked;
      updateUI();
      return;
    }

    if (s.isLocked) return;

    if (x >= blockX && x <= blockX + blockW && y >= blockY && y <= blockY + blockH + 90) {
      s.isDragging = true;
      s.dragStartX = x;
      s.startJawPos = s.jawPos;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 520 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const s = simState.current;
    
    // Hover logic for lock screw
    const pxPerCm = 100;
    const zeroX = 250;
    const blockX = zeroX + s.jawPos * pxPerCm;
    const screwX = blockX + 25;
    const screwY = 216 - 8;
    const isHoverScrew = Math.abs(x - screwX) < 15 && Math.abs(y - screwY) < 15;
    
    if (isHoverScrew !== s.hoverLock) {
      s.hoverLock = isHoverScrew;
    }

    if (s.isDragging) {
      const dx = x - s.dragStartX;
      let newPosCm = s.startJawPos + dx / pxPerCm;
      
      const objDiameter = OBJECTS[s.objectType].diameter;
      
      // Snapping near object
      if (Math.abs(newPosCm - objDiameter) < 0.1 && newPosCm < objDiameter + 0.1) {
        newPosCm = objDiameter;
      }
      
      // Clamp values
      if (newPosCm < objDiameter) newPosCm = objDiameter; // Cannot crush object
      if (newPosCm < 0) newPosCm = 0;
      if (newPosCm > 10) newPosCm = 10; // Max scale

      s.jawPos = newPosCm;
      canvas.style.cursor = 'grabbing';
      
      // Throttle React updates somewhat during drag if needed, but here we just update
      updateUI();
    } else {
      const isOverJaw = x >= blockX && x <= blockX + 110 && y >= 216 && y <= 350;
      if (isHoverScrew) canvas.style.cursor = 'pointer';
      else if (isOverJaw && !s.isLocked) canvas.style.cursor = 'grab';
      else canvas.style.cursor = 'default';
    }
  };

  const handlePointerUp = () => {
    const s = simState.current;
    if (s.isDragging) {
      s.isDragging = false;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';
      updateUI();
    }
  };

  const reset = () => {
    simState.current.jawPos = 10;
    simState.current.isLocked = false;
    updateUI();
  };

  const setObj = (type: keyof typeof OBJECTS) => {
    simState.current.objectType = type;
    simState.current.jawPos = Math.max(simState.current.jawPos, OBJECTS[type].diameter);
    updateUI();
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#070A0F] text-slate-200 flex flex-col font-sans p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-4 py-3 bg-[#0F172A] border border-cyan-500/20 rounded-xl shadow-lg shadow-cyan-900/10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <span>📏</span> Vernier Calipers
        </h1>
        <div className="px-4 py-1.5 bg-slate-900 rounded-lg border border-slate-700/50 flex gap-4 text-sm">
          <span className="text-slate-400">Status: <span className={uiState.isLocked ? "text-amber-500" : "text-emerald-400"}>{uiState.isLocked ? "LOCKED" : "UNLOCKED"}</span></span>
          <span className="text-slate-400">Total: <span className="text-cyan-400 font-mono font-bold">{uiState.total.toFixed(2)} cm</span></span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-grow flex flex-col items-center justify-center relative bg-slate-900/50 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-2xl">
        <div className="w-full max-w-5xl aspect-[960/520] relative rounded-xl overflow-hidden ring-1 ring-white/10 shadow-black/50 shadow-2xl bg-white">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            className="block select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>

      {/* Controls & Readings */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Objects Selector */}
        <div className="bg-[#0F172A] border border-cyan-500/20 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Select Object</h3>
          <div className="flex gap-2">
            {(Object.keys(OBJECTS) as Array<keyof typeof OBJECTS>).map(k => (
              <button
                key={k}
                onClick={() => setObj(k)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${uiState.objectType === k ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'}`}
              >
                {OBJECTS[k].label}
              </button>
            ))}
          </div>
          <div className="mt-auto pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-800">
            <span>True Diameter:</span>
            <span className="font-mono text-slate-300">{OBJECTS[uiState.objectType].diameter.toFixed(2)} cm</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#0F172A] border border-cyan-500/20 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Controls</h3>
          <div className="grid grid-cols-2 gap-3 flex-grow">
            <button
              onClick={() => { simState.current.isLocked = !simState.current.isLocked; updateUI(); }}
              className={`flex items-center justify-center gap-2 rounded-lg border ${uiState.isLocked ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'} transition-all`}
            >
              {uiState.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 transition-all"
            >
              🔄 Reset
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">
            Drag the movable jaw to measure.
          </p>
        </div>

        {/* Readings */}
        <div className="bg-[#0F172A] border border-cyan-500/20 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Measurement</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-slate-800/50 rounded p-2 flex justify-between">
              <span className="text-slate-500">MSR</span>
              <span className="font-mono text-cyan-400">{uiState.msr.toFixed(1)}</span>
            </div>
            <div className="bg-slate-800/50 rounded p-2 flex justify-between">
              <span className="text-slate-500">VSD</span>
              <span className="font-mono text-cyan-400">{uiState.vsd}</span>
            </div>
            <div className="bg-slate-800/50 rounded p-2 flex justify-between">
              <span className="text-slate-500">LC</span>
              <span className="font-mono text-slate-400">0.01</span>
            </div>
            <div className="bg-cyan-950/50 border border-cyan-900 rounded p-2 flex justify-between font-bold">
              <span className="text-cyan-600">Total</span>
              <span className="font-mono text-emerald-400">{uiState.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
