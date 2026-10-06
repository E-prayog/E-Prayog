import React, { useState, useRef, useEffect, useCallback } from 'react';

type Material = 'Wood' | 'Iron' | 'Lead';
type Planet = 'Earth' | 'Moon' | 'Mars';

const GRAVITY_MAP: Record<Planet, number> = {
  Earth: 9.8,
  Moon: 1.62,
  Mars: 3.72,
};

const DAMPING_MAP: Record<Material, number> = {
  Wood: 0.004,
  Iron: 0.002,
  Lead: 0.001,
};

const BOB_COLORS: Record<Material, { main: string; shadow: string; highlight: string; radius: number }> = {
  Wood: { main: '#D97706', shadow: 'rgba(0,0,0,0.4)', highlight: '#F8FAFC', radius: 22 },
  Iron: { main: '#64748B', shadow: 'rgba(0,0,0,0.4)', highlight: '#F8FAFC', radius: 19 },
  Lead: { main: '#334155', shadow: 'rgba(0,0,0,0.4)', highlight: '#F8FAFC', radius: 18 },
};

const BASE_WIDTH = 960;
const BASE_HEIGHT = 600;
const GRAPH_HEIGHT = 160;

interface Point {
  x: number;
  y: number;
}

interface GraphDataPoint {
  time: number;
  theta: number;
}

const PendulumLab: React.FC = () => {
  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  // UI State
  const [lengthCm, setLengthCm] = useState<number>(100);
  const [planet, setPlanet] = useState<Planet>('Earth');
  const [material, setMaterial] = useState<Material>('Iron');
  const [isSwingingUI, setIsSwingingUI] = useState<boolean>(false);
  const [measuredT, setMeasuredT] = useState<number | null>(null);
  
  // Stopwatch State
  const [stopwatchRunning, setStopwatchRunning] = useState<boolean>(false);
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);

  // Simulation State (Refs for animation loop)
  const simState = useRef({
    theta: 0,
    theta0: 0,
    omega: 0,
    simStartTime: 0,
    isSwinging: false,
    isDragging: false,
    lastTime: 0,
    elapsedSinceRelease: 0,
    trail: [] as Point[],
    graphData: [] as GraphDataPoint[],
    oscillationCount: 0,
    lastThetaSign: 0,
    zeroCrossings: 0,
    stopwatchStartRealTime: 0,
  });

  // Derived physics
  const gravity = GRAVITY_MAP[planet];
  const lengthMeters = lengthCm / 100;
  const theoreticalT = 2 * Math.PI * Math.sqrt(lengthMeters / gravity);
  
  // Calculate percent error
  const percentError = measuredT ? Math.abs(measuredT - theoreticalT) / theoreticalT * 100 : null;

  // Drawing Constants
  const pivotX = BASE_WIDTH * 0.4;
  const pivotY = 70;
  // Map 10cm-200cm to pixel length. Let 100cm = 220px
  const getRopePixelLength = (cm: number) => (cm / 100) * 220;

  const resetSimulation = useCallback(() => {
    simState.current.theta = 0;
    simState.current.theta0 = 0;
    simState.current.isSwinging = false;
    simState.current.isDragging = false;
    simState.current.trail = [];
    simState.current.graphData = [];
    simState.current.oscillationCount = 0;
    simState.current.zeroCrossings = 0;
    simState.current.elapsedSinceRelease = 0;
    simState.current.lastThetaSign = 0;
    setIsSwingingUI(false);
  }, []);

  const releasePendulum = useCallback(() => {
    simState.current.isDragging = false;
    simState.current.isSwinging = true;
    simState.current.simStartTime = performance.now();
    simState.current.theta0 = simState.current.theta;
    simState.current.trail = [];
    simState.current.graphData = [];
    simState.current.oscillationCount = 0;
    simState.current.zeroCrossings = 0;
    simState.current.elapsedSinceRelease = 0;
    simState.current.lastThetaSign = Math.sign(simState.current.theta0);
    setIsSwingingUI(true);
  }, []);

  const stopPendulum = useCallback(() => {
    simState.current.isSwinging = false;
    simState.current.theta = 0;
    simState.current.theta0 = 0;
    setIsSwingingUI(false);
  }, []);

  const toggleStopwatch = useCallback(() => {
    if (stopwatchRunning) {
      setStopwatchRunning(false);
      const elapsedSec = stopwatchTime;
      const count = simState.current.oscillationCount;
      if (count > 0) {
        setMeasuredT(elapsedSec / count);
      }
    } else {
      setStopwatchRunning(true);
      setMeasuredT(null);
      setStopwatchTime(0);
      simState.current.stopwatchStartRealTime = performance.now();
      simState.current.oscillationCount = 0;
      simState.current.zeroCrossings = 0;
      simState.current.lastThetaSign = Math.sign(simState.current.theta);
    }
  }, [stopwatchRunning, stopwatchTime]);

  const resetStopwatch = useCallback(() => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setMeasuredT(null);
  }, []);

  // Update effect for parameter changes
  useEffect(() => {
    simState.current.omega = Math.sqrt(gravity / lengthMeters);
    if (simState.current.isSwinging) {
      // If parameters change while swinging, update omega and restart swing from current theta
      simState.current.theta0 = simState.current.theta;
      simState.current.simStartTime = performance.now() - simState.current.elapsedSinceRelease * 1000; 
      // Actually, better to just restart from new theta0 at t=0 to avoid jump in phase
      simState.current.simStartTime = performance.now();
      simState.current.elapsedSinceRelease = 0;
      simState.current.trail = [];
    }
  }, [gravity, lengthMeters, material]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = BASE_WIDTH * dpr;
    canvas.height = BASE_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const now = performance.now();
    const dt = (now - simState.current.lastTime) / 1000;
    simState.current.lastTime = now;

    // Physics Update
    if (simState.current.isSwinging) {
      const state = simState.current;
      state.elapsedSinceRelease = (now - state.simStartTime) / 1000;
      const t = state.elapsedSinceRelease;
      const damping = DAMPING_MAP[material];
      
      // theta = theta0 * cos(omega * t) * e^(-b * t)
      state.theta = state.theta0 * Math.cos(state.omega * t) * Math.exp(-damping * t);

      // Track oscillations
      const currentSign = Math.sign(state.theta);
      if (currentSign !== 0 && currentSign !== state.lastThetaSign && state.lastThetaSign !== 0) {
        state.zeroCrossings++;
        if (state.zeroCrossings % 2 === 0) {
          state.oscillationCount++;
        }
        state.lastThetaSign = currentSign;
      }

      // Stop condition
      if (Math.abs(state.theta) < 0.001) {
        state.isSwinging = false;
        setIsSwingingUI(false);
        state.theta = 0;
      }
    }

    if (stopwatchRunning) {
      setStopwatchTime((now - simState.current.stopwatchStartRealTime) / 1000);
    }

    const state = simState.current;
    const ropeLen = getRopePixelLength(lengthCm);
    const bobX = pivotX + ropeLen * Math.sin(state.theta);
    const bobY = pivotY + ropeLen * Math.cos(state.theta);

    // Trail Update
    if (state.isSwinging || state.isDragging) {
      state.trail.push({ x: bobX, y: bobY });
      if (state.trail.length > 120) state.trail.shift();
    } else if (state.trail.length > 0) {
      state.trail.shift();
    }

    // Graph Data Update
    if (state.isSwinging || state.isDragging) {
      const gTime = state.isSwinging ? state.elapsedSinceRelease : 0; // If dragging, time is fixed or just scrolling
      // We will just use real time for graph x-axis if we want continuous scroll, or elapsed if swinging
      const plotTime = state.isSwinging ? state.elapsedSinceRelease : performance.now() / 1000;
      state.graphData.push({ time: plotTime, theta: (state.theta * 180) / Math.PI });
      // Keep last 10 seconds of data (approx 600 frames at 60fps)
      if (state.graphData.length > 600) state.graphData.shift();
    }

    // CLEAR & BACKGROUND
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // GRID
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < BASE_WIDTH; x += 20) {
      ctx.moveTo(x, 0); ctx.lineTo(x, BASE_HEIGHT - GRAPH_HEIGHT);
    }
    for (let y = 0; y < BASE_HEIGHT - GRAPH_HEIGHT; y += 20) {
      ctx.moveTo(0, y); ctx.lineTo(BASE_WIDTH, y);
    }
    ctx.stroke();

    // LAB STAND
    // Base
    const standBaseX = pivotX - 100;
    const standBaseY = BASE_HEIGHT - GRAPH_HEIGHT - 20;
    const baseGrad = ctx.createLinearGradient(standBaseX, standBaseY, standBaseX, standBaseY + 20);
    baseGrad.addColorStop(0, '#CBD5E1');
    baseGrad.addColorStop(0.5, '#F1F5F9');
    baseGrad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(standBaseX, standBaseY, 200, 20);
    // Base details
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(standBaseX + 20, standBaseY + 10, 5, 0, Math.PI * 2);
    ctx.arc(standBaseX + 180, standBaseY + 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Vertical Pillar
    const pillarGrad = ctx.createLinearGradient(standBaseX + 90, 0, standBaseX + 110, 0);
    pillarGrad.addColorStop(0, '#94A3B8');
    pillarGrad.addColorStop(0.3, '#F1F5F9');
    pillarGrad.addColorStop(0.7, '#CBD5E1');
    pillarGrad.addColorStop(1, '#64748B');
    ctx.fillStyle = pillarGrad;
    ctx.fillRect(standBaseX + 90, pivotY - 20, 20, standBaseY - pivotY + 20);

    // Cross arm / Boss head
    ctx.fillStyle = '#334155';
    ctx.fillRect(standBaseX + 85, pivotY - 15, 30, 25);
    const armGrad = ctx.createLinearGradient(0, pivotY - 10, 0, pivotY + 5);
    armGrad.addColorStop(0, '#94A3B8');
    armGrad.addColorStop(0.5, '#F8FAFC');
    armGrad.addColorStop(1, '#64748B');
    ctx.fillStyle = armGrad;
    // Arm extending to pivotX
    ctx.fillRect(standBaseX + 115, pivotY - 8, pivotX - (standBaseX + 115) + 10, 12);
    
    // Clamp at pivot
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(pivotX - 5, pivotY - 10, 10, 15);

    // PROTRACTOR OVERLAY
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';

    for (let deg = -90; deg <= 90; deg += 5) {
      const rad = (deg * Math.PI) / 180 + Math.PI / 2;
      const inner = deg % 15 === 0 ? 85 : 95;
      ctx.beginPath();
      ctx.moveTo(inner * Math.cos(rad), inner * Math.sin(rad));
      ctx.lineTo(100 * Math.cos(rad), 100 * Math.sin(rad));
      ctx.stroke();

      if (deg % 15 === 0 && Math.abs(deg) <= 90) {
        ctx.fillText(`${Math.abs(deg)}°`, 75 * Math.cos(rad), 75 * Math.sin(rad));
      }
    }
    
    // Vertical reference line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, ropeLen + 40);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // TRAIL
    if (state.trail.length > 1) {
      for (let i = 0; i < state.trail.length - 1; i++) {
        const pt = state.trail[i];
        const alpha = (i / state.trail.length) * 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14,165,233,${alpha})`;
        ctx.fill();
      }
    }

    // DRAG ARC / ANGLE INDICATOR
    if (state.isDragging || state.isSwinging) {
      ctx.save();
      ctx.translate(pivotX, pivotY);
      const absTheta = Math.abs(state.theta);
      const currentDeg = Math.round((absTheta * 180) / Math.PI);
      
      // Arc fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const startAngle = Math.PI / 2;
      const endAngle = startAngle + state.theta;
      ctx.arc(0, 0, 50, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
      ctx.closePath();
      ctx.fillStyle = 'rgba(14,165,233,0.2)';
      ctx.fill();

      // Text
      ctx.fillStyle = '#0EA5E9';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${currentDeg}°`, 60 * Math.sin(state.theta / 2), 60 * Math.cos(state.theta / 2));
      ctx.restore();
    }

    // STRING
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // BOB SHADOW ON BENCH
    ctx.beginPath();
    // Squash vertical to make it look like ellipse shadow on floor
    ctx.ellipse(bobX, standBaseY + 10, 15, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();

    // BOB
    const bobStyle = BOB_COLORS[material];
    const r = bobStyle.radius;
    
    // Draw string attachment point
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(bobX - 3, bobY - r - 4, 6, 6);

    ctx.save();
    ctx.translate(bobX, bobY);
    // Rotating highlight based on angle gives a bit of 3D realism
    const radGrad = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.1, 0, 0, r);
    radGrad.addColorStop(0, bobStyle.highlight);
    radGrad.addColorStop(0.3, bobStyle.main);
    radGrad.addColorStop(1, bobStyle.shadow);
    
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = radGrad;
    ctx.fill();
    
    // Ambient occlusion/rim light
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // SHM VALIDITY LABELS
    const ampDeg = (Math.abs(state.isSwinging ? state.theta0 : state.theta) * 180) / Math.PI;
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    if (ampDeg > 0 && ampDeg <= 5) {
      ctx.fillStyle = '#10B981';
      ctx.fillText("SHM approximation valid ✓", BASE_WIDTH / 2, 40);
    } else if (ampDeg > 30) {
      ctx.fillStyle = '#F59E0B';
      ctx.fillText("⚠ Large angle — period increases beyond 2π√(L/g)", BASE_WIDTH / 2, 40);
    }

    // RIGHT PANEL ON CANVAS
    const panelW = 200;
    const panelH = 180;
    const panelX = BASE_WIDTH - panelW - 20;
    const panelY = 20;
    
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("Simulation State", panelX + 15, panelY + 25);
    
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText("Length:", panelX + 15, panelY + 55);
    ctx.fillText("Period T:", panelX + 15, panelY + 85);
    ctx.fillText("Gravity:", panelX + 15, panelY + 115);
    ctx.fillText("Material:", panelX + 15, panelY + 145);

    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'right';
    ctx.fillText(`${lengthCm.toFixed(1)} cm`, panelX + panelW - 15, panelY + 55);
    ctx.fillText(`${theoreticalT.toFixed(3)} s`, panelX + panelW - 15, panelY + 85);
    ctx.fillText(`${gravity} m/s²`, panelX + panelW - 15, panelY + 115);
    ctx.fillText(material, panelX + panelW - 15, panelY + 145);

    // Visual rope indicator in panel
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(panelX + panelW - 8, panelY + 45, 4, 100);
    ctx.fillStyle = '#0EA5E9';
    // Fill based on 10-200 range
    const fillH = ((lengthCm - 10) / 190) * 100;
    ctx.fillRect(panelX + panelW - 8, panelY + 45 + (100 - fillH), 4, fillH);

    // OSCILLOSCOPE GRAPH
    const graphY = BASE_HEIGHT - GRAPH_HEIGHT;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, graphY, BASE_WIDTH, GRAPH_HEIGHT);
    
    // Graph Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < BASE_WIDTH; x += 40) {
      ctx.moveTo(x, graphY); ctx.lineTo(x, BASE_HEIGHT);
    }
    for (let y = graphY; y < BASE_HEIGHT; y += 20) {
      ctx.moveTo(0, y); ctx.lineTo(BASE_WIDTH, y);
    }
    ctx.stroke();

    // Zero line
    const graphMidY = graphY + GRAPH_HEIGHT / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, graphMidY);
    ctx.lineTo(BASE_WIDTH, graphMidY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis Labels
    ctx.fillStyle = '#64748B';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("θ (°)", 10, graphY + 15);
    ctx.textAlign = 'right';
    ctx.fillText("Time (s)", BASE_WIDTH - 10, BASE_HEIGHT - 10);

    // Draw trace
    if (state.graphData.length > 0) {
      const latestTime = state.graphData[state.graphData.length - 1].time;
      const windowTime = 10; // show last 10 seconds
      
      // Determine max angle for scaling
      let maxTheta = 30; // Min scale
      if (Math.abs((state.theta0 * 180) / Math.PI) > 30) {
        maxTheta = Math.abs((state.theta0 * 180) / Math.PI);
      }
      
      ctx.beginPath();
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      
      for (let i = 0; i < state.graphData.length; i++) {
        const pt = state.graphData[i];
        // Map time to X (right to left)
        const timeDiff = latestTime - pt.time;
        if (timeDiff > windowTime) continue;
        
        const px = BASE_WIDTH - (timeDiff / windowTime) * BASE_WIDTH;
        // Map theta to Y
        const py = graphMidY - (pt.theta / maxTheta) * (GRAPH_HEIGHT / 2 - 10);
        
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [gravity, lengthCm, lengthMeters, material, stopwatchRunning, theoreticalT]);

  useEffect(() => {
    simState.current.lastTime = performance.now();
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  // INTERACTION LOGIC
  const getMousePos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * (BASE_WIDTH / rect.width),
      y: (clientY - rect.top) * (BASE_HEIGHT / rect.height)
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getMousePos(e, canvas);
    
    const state = simState.current;
    const ropeLen = getRopePixelLength(lengthCm);
    const bobX = pivotX + ropeLen * Math.sin(state.theta);
    const bobY = pivotY + ropeLen * Math.cos(state.theta);

    const dist = Math.sqrt(Math.pow(pos.x - bobX, 2) + Math.pow(pos.y - bobY, 2));
    if (dist < 40) { // Hit zone
      state.isDragging = true;
      state.isSwinging = false;
      setIsSwingingUI(false);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const state = simState.current;
    if (!state.isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getMousePos(e, canvas);

    const dx = pos.x - pivotX;
    const dy = pos.y - pivotY;
    
    let angle = Math.atan2(dx, dy);
    // Clamp to +/- 85 degrees (approx 1.48 rad)
    const maxAngle = 85 * (Math.PI / 180);
    if (angle > maxAngle) angle = maxAngle;
    if (angle < -maxAngle) angle = -maxAngle;
    
    state.theta = angle;
    state.theta0 = angle;
  };

  const handlePointerUp = () => {
    const state = simState.current;
    if (state.isDragging) {
      releasePendulum();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#070A0F] text-slate-200 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-cyan-500/20">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          🕰 Simple Pendulum
        </h1>
        <div className="flex gap-4">
          <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-sm">
            T = <span className="text-cyan-400 font-mono">{theoreticalT.toFixed(3)}s</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center p-4 gap-4 max-w-7xl mx-auto w-full">
        
        {/* Canvas Container */}
        <div className="relative w-full max-w-[960px] aspect-[960/600] bg-[#F8F9FA] rounded-xl overflow-hidden shadow-2xl border border-slate-800 cursor-grab active:cursor-grabbing">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onTouchCancel={handlePointerUp}
          />
        </div>

        {/* Controls & Metrics Panel */}
        <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Controls Left */}
          <div className="md:col-span-8 bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Experiment Controls</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Length */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-300 flex justify-between">
                  <span>Length (L)</span>
                  <span className="text-cyan-400 font-mono">{lengthCm} cm</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(Number(e.target.value))}
                  className="accent-cyan-500"
                />
              </div>

              {/* Gravity */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-300">Gravity (g)</label>
                <select
                  value={planet}
                  onChange={(e) => setPlanet(e.target.value as Planet)}
                  className="bg-slate-800 border border-slate-700 rounded-md p-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Earth">🌎 Earth (9.8 m/s²)</option>
                  <option value="Moon">🌑 Moon (1.62 m/s²)</option>
                  <option value="Mars">🔴 Mars (3.72 m/s²)</option>
                </select>
              </div>

              {/* Material */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-300">Bob Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as Material)}
                  className="bg-slate-800 border border-slate-700 rounded-md p-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Wood">🪵 Wood (Low density)</option>
                  <option value="Iron">⚙️ Iron (Medium density)</option>
                  <option value="Lead">🏋️ Lead (High density)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={stopPendulum}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors text-sm font-medium"
              >
                ⏹ Stop
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors text-sm font-medium"
              >
                ⏮ Reset Position
              </button>
              <div className="flex-grow text-xs text-slate-500 flex items-center justify-end">
                Tip: Drag the bob to set the angle and release to swing.
              </div>
            </div>
          </div>

          {/* Stopwatch & Metrics Right */}
          <div className="md:col-span-4 bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Measurements</h2>
            
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="text-3xl font-mono text-cyan-400 font-bold tracking-wider z-10">
                {stopwatchTime.toFixed(2)}s
              </div>
              <div className="text-xs text-slate-500 mt-1 z-10">
                Oscillations: {simState.current.oscillationCount}
              </div>
              
              <div className="flex gap-2 mt-4 z-10 w-full">
                <button
                  onClick={toggleStopwatch}
                  className={`flex-1 py-1.5 rounded text-sm font-bold transition-colors ${
                    stopwatchRunning 
                      ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                  }`}
                >
                  {stopwatchRunning ? 'Stop' : 'Start'}
                </button>
                <button
                  onClick={resetStopwatch}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-bold transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Measured T:</span>
                <span className="font-mono text-white">
                  {measuredT ? `${measuredT.toFixed(3)}s` : '--'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">% Error:</span>
                <span className={`font-mono font-bold ${
                  percentError === null ? 'text-slate-500' :
                  percentError < 5 ? 'text-emerald-500' :
                  percentError < 15 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {percentError !== null ? `${percentError.toFixed(1)}%` : '--'}
                </span>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default PendulumLab;
