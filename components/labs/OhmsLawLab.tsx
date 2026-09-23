import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Plus, Trash2, CheckCircle2, Zap, HelpCircle } from 'lucide-react';

// Selectable resistors under test with IEC 4-band color codes
const RESISTORS = {
  r10: {
    id: 'r10',
    resistance: 10,
    label: '10 Ω Resistor',
    bands: ['#854D0E', '#000000', '#000000', '#CA8A04'], // Brown (1), Black (0), Black (x1), Gold (5%)
    tolerance: '±5%',
  },
  r22: {
    id: 'r22',
    resistance: 22,
    label: '22 Ω Resistor',
    bands: ['#DC2626', '#DC2626', '#000000', '#CA8A04'], // Red (2), Red (2), Black (x1), Gold (5%)
    tolerance: '±5%',
  },
  r47: {
    id: 'r47',
    resistance: 47,
    label: '47 Ω Resistor',
    bands: ['#EAB308', '#7E22CE', '#000000', '#CA8A04'], // Yellow (4), Violet (7), Black (x1), Gold (5%)
    tolerance: '±5%',
  },
  r100: {
    id: 'r100',
    resistance: 100,
    label: '100 Ω Resistor',
    bands: ['#854D0E', '#000000', '#854D0E', '#CA8A04'], // Brown (1), Black (0), Brown (x10), Gold (5%)
    tolerance: '±5%',
  },
};

type ResistorKey = keyof typeof RESISTORS;

interface ReadingRow {
  srNo: number;
  rRheo: number;
  v: number;
  i_mA: number;
  i_A: number;
}

export default function OhmsLawLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Circuit constants
  const BATTERY_EMF = 4.0; // 2 dry cells in series (4.0 V)
  const INTERNAL_RESISTANCE = 0.6; // ohms

  // Internal physics & animation state in ref to avoid closure lag in rAF
  const simState = useRef({
    keyInserted: true,
    rheostatResistance: 8.0, // 0 to 20 ohms
    selectedResistor: 'r22' as ResistorKey,
    // Needle physics: spring-damper inertia
    ammeterAngle: 0,
    ammeterVel: 0,
    voltmeterAngle: 0,
    voltmeterVel: 0,
    // Dragging state for rheostat slider
    isDraggingSlider: false,
    hoveredComponent: null as string | null,
    electronOffset: 0,
  });

  // UI state for React shell
  const [uiState, setUiState] = useState({
    keyInserted: true,
    rheostatResistance: 8.0,
    selectedResistor: 'r22' as ResistorKey,
    voltage: 0,
    current_mA: 0,
    current_A: 0,
    totalResistance: 30.6,
  });

  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [activeTab, setActiveTab] = useState<'graph' | 'table' | 'theory'>('graph');

  // Compute circuit values
  const computePhysics = useCallback(() => {
    const s = simState.current;
    if (!s.keyInserted) {
      return { v: 0, i_A: 0, i_mA: 0, rTotal: 0 };
    }
    const rTest = RESISTORS[s.selectedResistor].resistance;
    const rTotal = INTERNAL_RESISTANCE + s.rheostatResistance + rTest;
    const i_A = BATTERY_EMF / rTotal;
    const i_mA = i_A * 1000;
    const v = i_A * rTest;
    return { v, i_A, i_mA, rTotal };
  }, []);

  const syncUI = useCallback(() => {
    const s = simState.current;
    const { v, i_A, i_mA, rTotal } = computePhysics();
    setUiState({
      keyInserted: s.keyInserted,
      rheostatResistance: Number(s.rheostatResistance.toFixed(1)),
      selectedResistor: s.selectedResistor,
      voltage: Number(v.toFixed(3)),
      current_mA: Number(i_mA.toFixed(1)),
      current_A: Number(i_A.toFixed(4)),
      totalResistance: Number(rTotal.toFixed(2)),
    });
  }, [computePhysics]);

  // Main Canvas Render Function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = simState.current;
    const W = canvas.width;
    const H = canvas.height;

    const { v: targetV, i_A: targetI } = computePhysics();

    // ── Spring-Damper Needle Dynamics ──
    // Ammeter: 0 to 0.5 A corresponds to -45deg to +45deg (total 90deg arc)
    const maxAmmeterI = 0.4; // max scale 400mA
    const targetAmmeterNorm = Math.min(1.0, targetI / maxAmmeterI);
    const targetAmAngle = -Math.PI * 0.38 + targetAmmeterNorm * (Math.PI * 0.76);

    const amForce = (targetAmAngle - s.ammeterAngle) * 0.09;
    s.ammeterVel = s.ammeterVel * 0.78 + amForce;
    s.ammeterAngle += s.ammeterVel;

    // Voltmeter: 0 to 4.0 V corresponds to -45deg to +45deg
    const maxVoltmeterV = 4.0;
    const targetVoltmeterNorm = Math.min(1.0, targetV / maxVoltmeterV);
    const targetVmAngle = -Math.PI * 0.38 + targetVoltmeterNorm * (Math.PI * 0.76);

    const vmForce = (targetVmAngle - s.voltmeterAngle) * 0.09;
    s.voltmeterVel = s.voltmeterVel * 0.78 + vmForce;
    s.voltmeterAngle += s.voltmeterVel;

    // Advance electron animation
    if (s.keyInserted && targetI > 0) {
      s.electronOffset = (s.electronOffset + targetI * 25) % 30;
    }

    // ── 1. Lab Bench Surface Background ──
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Subtle rubber/cork mat dot grid texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let x = 15; x < W; x += 22) {
      for (let y = 15; y < H; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bench edge shadow
    const benchEdgeGrad = ctx.createLinearGradient(0, H - 35, 0, H);
    benchEdgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    benchEdgeGrad.addColorStop(1, 'rgba(0,0,0,0.04)');
    ctx.fillStyle = benchEdgeGrad;
    ctx.fillRect(0, H - 35, W, 35);

    // ── Component Placement Coordinates ──
    // Battery: Left top (140, 100)
    // Key/Switch: Left bottom (140, 340)
    // Rheostat: Center bottom (480, 360)
    // Ammeter: Center top (460, 110)
    // Resistor: Right center (780, 240)
    // Voltmeter: Right top (780, 100)

    const batPos = { x: 130, y: 110 };
    const keyPos = { x: 130, y: 350 };
    const rheoPos = { x: 460, y: 360 };
    const ammeterPos = { x: 460, y: 130 };
    const resistorPos = { x: 790, y: 350 };
    const voltmeterPos = { x: 790, y: 130 };

    // Terminal connection coordinates
    const batTermPlus = { x: batPos.x + 45, y: batPos.y - 30 };
    const batTermMinus = { x: batPos.x - 45, y: batPos.y - 30 };

    const keyTermA = { x: keyPos.x - 30, y: keyPos.y };
    const keyTermB = { x: keyPos.x + 30, y: keyPos.y };

    const rheoTermA = { x: rheoPos.x - 110, y: rheoPos.y + 15 };
    const rheoSliderTerm = { x: rheoPos.x - 90 + (s.rheostatResistance / 20) * 180, y: rheoPos.y - 35 };

    const amTermPlus = { x: ammeterPos.x - 30, y: ammeterPos.y + 58 };
    const amTermMinus = { x: ammeterPos.x + 30, y: ammeterPos.y + 58 };

    const resTermA = { x: resistorPos.x - 45, y: resistorPos.y };
    const resTermB = { x: resistorPos.x + 45, y: resistorPos.y };

    const vmTermPlus = { x: voltmeterPos.x - 30, y: voltmeterPos.y + 58 };
    const vmTermMinus = { x: voltmeterPos.x + 30, y: voltmeterPos.y + 58 };

    // ── 2. Connecting Wires (Bezier Curves) ──
    const drawWire = (
      p1: { x: number; y: number },
      cp1: { x: number; y: number },
      cp2: { x: number; y: number },
      p2: { x: number; y: number },
      color: string,
      hasCurrent: boolean
    ) => {
      ctx.save();
      // Drop shadow for wire
      ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;

      ctx.strokeStyle = color;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
      ctx.stroke();

      // Wire core highlight
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
      ctx.stroke();

      // Current flow dashed pulse animation
      if (hasCurrent) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = -s.electronOffset;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    };

    const isLive = s.keyInserted && targetI > 0;

    // Wire 1: Battery (+) -> Ammeter (+) [Red Wire]
    drawWire(
      batTermPlus,
      { x: batTermPlus.x + 100, y: batTermPlus.y - 40 },
      { x: amTermPlus.x - 100, y: amTermPlus.y + 40 },
      amTermPlus,
      '#DC2626',
      isLive
    );

    // Wire 2: Ammeter (-) -> Resistor (A) [Blue/Black Wire]
    drawWire(
      amTermMinus,
      { x: amTermMinus.x + 120, y: amTermMinus.y + 80 },
      { x: resTermA.x - 40, y: resTermA.y - 80 },
      resTermA,
      '#0284C7',
      isLive
    );

    // Wire 3: Resistor (B) -> Rheostat Slider [Green/Dark Wire]
    drawWire(
      resTermB,
      { x: resTermB.x + 30, y: resTermB.y + 70 },
      { x: rheoSliderTerm.x + 80, y: rheoSliderTerm.y + 70 },
      rheoSliderTerm,
      '#0F172A',
      isLive
    );

    // Wire 4: Rheostat (A) -> Key (B) [Black Wire]
    drawWire(
      rheoTermA,
      { x: rheoTermA.x - 60, y: rheoTermA.y + 30 },
      { x: keyTermB.x + 60, y: keyTermB.y + 30 },
      keyTermB,
      '#1E293B',
      isLive
    );

    // Wire 5: Key (A) -> Battery (-) [Black Wire]
    drawWire(
      keyTermA,
      { x: keyTermA.x - 50, y: keyTermA.y - 60 },
      { x: batTermMinus.x - 50, y: batTermMinus.y + 80 },
      batTermMinus,
      '#1E293B',
      isLive
    );

    // Voltmeter Parallel Wires (across Resistor):
    // Resistor A -> Voltmeter (+) [Red Wire]
    drawWire(
      resTermA,
      { x: resTermA.x - 40, y: resTermA.y - 60 },
      { x: vmTermPlus.x - 40, y: vmTermPlus.y + 60 },
      vmTermPlus,
      '#EF4444',
      isLive
    );

    // Resistor B -> Voltmeter (-) [Black Wire]
    drawWire(
      resTermB,
      { x: resTermB.x + 40, y: resTermB.y - 60 },
      { x: vmTermMinus.x + 40, y: vmTermMinus.y + 60 },
      vmTermMinus,
      '#334155',
      isLive
    );

    // ── Helper: Draw Brass Screw Terminals ──
    const drawTerminal = (x: number, y: number, label?: string, isRed = false) => {
      ctx.save();
      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      // Base collar
      ctx.fillStyle = isRed ? '#EF4444' : '#1E293B';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Brass screw head
      const brassGrad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
      brassGrad.addColorStop(0, '#FEF08A');
      brassGrad.addColorStop(0.4, '#EAB308');
      brassGrad.addColorStop(1, '#A16207');
      ctx.fillStyle = brassGrad;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#713F12';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (label) {
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 18);
      }
      ctx.restore();
    };

    // ── 3. Component A: Battery (2 Dry Cells in Series) ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;

    // Battery Wooden/Plastic Base Holder
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.roundRect(batPos.x - 65, batPos.y - 45, 130, 90, 8);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2 Cylindrical Cells
    [-24, 24].forEach((offset) => {
      const cellX = batPos.x + offset;
      const cellY = batPos.y;
      const cellW = 38;
      const cellH = 68;

      // Cell cylinder gradient
      const cellGrad = ctx.createLinearGradient(cellX - cellW / 2, cellY, cellX + cellW / 2, cellY);
      cellGrad.addColorStop(0, '#1E293B');
      cellGrad.addColorStop(0.25, '#3B82F6');
      cellGrad.addColorStop(0.6, '#1D4ED8');
      cellGrad.addColorStop(0.9, '#1E3A8A');
      cellGrad.addColorStop(1, '#0F172A');

      ctx.fillStyle = cellGrad;
      ctx.beginPath();
      ctx.roundRect(cellX - cellW / 2, cellY - cellH / 2 + 6, cellW, cellH - 12, 4);
      ctx.fill();

      // Metallic top cap
      const capGrad = ctx.createLinearGradient(cellX - 8, cellY - cellH / 2, cellX + 8, cellY - cellH / 2);
      capGrad.addColorStop(0, '#F1F5F9');
      capGrad.addColorStop(0.5, '#CBD5E1');
      capGrad.addColorStop(1, '#64748B');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.roundRect(cellX - 8, cellY - cellH / 2, 16, 8, 2);
      ctx.fill();
    });

    // Label
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DC SUPPLY (4.0V)', batPos.x, batPos.y + 36);

    // Terminals
    drawTerminal(batTermMinus.x, batTermMinus.y, '−', false);
    drawTerminal(batTermPlus.x, batTermPlus.y, '+', true);
    ctx.restore();

    // ── 4. Component B: Plug Key / Switch ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    // Bakelite Base
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(keyPos.x - 55, keyPos.y - 30, 110, 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Two Brass Terminal Blocks with hole between them
    const brassBlockA = ctx.createLinearGradient(keyPos.x - 42, keyPos.y, keyPos.x - 8, keyPos.y);
    brassBlockA.addColorStop(0, '#CA8A04');
    brassBlockA.addColorStop(0.5, '#FEF08A');
    brassBlockA.addColorStop(1, '#A16207');
    ctx.fillStyle = brassBlockA;
    ctx.beginPath();
    ctx.roundRect(keyPos.x - 42, keyPos.y - 18, 32, 36, 3);
    ctx.fill();
    ctx.strokeStyle = '#713F12';
    ctx.stroke();

    const brassBlockB = ctx.createLinearGradient(keyPos.x + 10, keyPos.y, keyPos.x + 44, keyPos.y);
    brassBlockB.addColorStop(0, '#CA8A04');
    brassBlockB.addColorStop(0.5, '#FEF08A');
    brassBlockB.addColorStop(1, '#A16207');
    ctx.fillStyle = brassBlockB;
    ctx.beginPath();
    ctx.roundRect(keyPos.x + 10, keyPos.y - 18, 32, 36, 3);
    ctx.fill();
    ctx.strokeStyle = '#713F12';
    ctx.stroke();

    // Key Plug Hole
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(keyPos.x, keyPos.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Removable Plug
    if (s.keyInserted) {
      // Plug inserted into hole
      const plugGrad = ctx.createRadialGradient(keyPos.x - 2, keyPos.y - 2, 1, keyPos.x, keyPos.y, 9);
      plugGrad.addColorStop(0, '#FEF08A');
      plugGrad.addColorStop(0.4, '#EAB308');
      plugGrad.addColorStop(1, '#854D0E');
      ctx.fillStyle = plugGrad;
      ctx.beginPath();
      ctx.arc(keyPos.x, keyPos.y, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Top bakelite handle on plug
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(keyPos.x - 12, keyPos.y - 5, 24, 10, 4);
      ctx.fill();
    } else {
      // Plug lying on bench next to key
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#CA8A04';
      ctx.beginPath();
      ctx.arc(keyPos.x + 40, keyPos.y - 35, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(keyPos.x + 30, keyPos.y - 40, 20, 8, 3);
      ctx.fill();
      ctx.restore();
    }

    drawTerminal(keyTermA.x, keyTermA.y);
    drawTerminal(keyTermB.x, keyTermB.y);

    ctx.fillStyle = s.keyInserted ? '#10B981' : '#F59E0B';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.keyInserted ? 'KEY: CLOSED (ON)' : 'KEY: OPEN (OFF)', keyPos.x, keyPos.y + 24);
    ctx.restore();

    // ── 5. Component C: Wire-Wound Rheostat (0–20 Ω) ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;

    // Ceramic Rod & Tight Wire Windings
    const rheoX = rheoPos.x;
    const rheoY = rheoPos.y;
    const coilW = 200;
    const coilH = 34;

    // Support legs
    ctx.fillStyle = '#64748B';
    ctx.fillRect(rheoX - coilW / 2 - 12, rheoY - 20, 12, 48);
    ctx.fillRect(rheoX + coilW / 2, rheoY - 20, 12, 48);

    // Ceramic core cylinder
    const coilGrad = ctx.createLinearGradient(0, rheoY - coilH / 2, 0, rheoY + coilH / 2);
    coilGrad.addColorStop(0, '#FEF3C7');
    coilGrad.addColorStop(0.3, '#FDE68A');
    coilGrad.addColorStop(0.7, '#D97706');
    coilGrad.addColorStop(1, '#92400E');
    ctx.fillStyle = coilGrad;
    ctx.beginPath();
    ctx.roundRect(rheoX - coilW / 2, rheoY - coilH / 2, coilW, coilH, 4);
    ctx.fill();

    // Fine wire winding lines
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
    ctx.lineWidth = 1;
    for (let wx = rheoX - coilW / 2 + 2; wx < rheoX + coilW / 2 - 2; wx += 3) {
      ctx.beginPath();
      ctx.moveTo(wx, rheoY - coilH / 2);
      ctx.lineTo(wx, rheoY + coilH / 2);
      ctx.stroke();
    }

    // Top Slider Metal Rod
    const rodGrad = ctx.createLinearGradient(0, rheoY - 30, 0, rheoY - 24);
    rodGrad.addColorStop(0, '#FFFFFF');
    rodGrad.addColorStop(0.5, '#94A3B8');
    rodGrad.addColorStop(1, '#475569');
    ctx.fillStyle = rodGrad;
    ctx.beginPath();
    ctx.roundRect(rheoX - coilW / 2 - 10, rheoY - 30, coilW + 20, 6, 2);
    ctx.fill();

    // Draggable Slider Contact Wiper
    const sliderPx = rheoX - coilW / 2 + 10 + (s.rheostatResistance / 20) * (coilW - 20);

    // Wiper block
    const sliderGrad = ctx.createLinearGradient(sliderPx - 10, 0, sliderPx + 10, 0);
    sliderGrad.addColorStop(0, '#EAB308');
    sliderGrad.addColorStop(0.4, '#FEF08A');
    sliderGrad.addColorStop(1, '#A16207');
    ctx.fillStyle = sliderGrad;
    ctx.beginPath();
    ctx.roundRect(sliderPx - 10, rheoY - 36, 20, 24, 3);
    ctx.fill();
    ctx.strokeStyle = '#713F12';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Handle knob on top
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(sliderPx - 6, rheoY - 48, 12, 12, 3);
    ctx.fill();

    // Contact finger touching winding
    ctx.fillStyle = '#CA8A04';
    ctx.fillRect(sliderPx - 2, rheoY - 14, 4, 16);

    // Scale / Resistance Readout below rheostat
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`RHEOSTAT: ${s.rheostatResistance.toFixed(1)} Ω`, rheoX, rheoY + 34);

    drawTerminal(rheoTermA.x, rheoTermA.y);
    ctx.restore();

    // ── 6. Component D: Carbon Resistor Under Test ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.16)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    // Resistor mounting base
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(resistorPos.x - 60, resistorPos.y - 30, 120, 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Resistor Ceramic Body (bone/beige)
    const curRes = RESISTORS[s.selectedResistor];
    const resBodyGrad = ctx.createLinearGradient(
      resistorPos.x - 30,
      resistorPos.y - 12,
      resistorPos.x - 30,
      resistorPos.y + 12
    );
    resBodyGrad.addColorStop(0, '#F5EBE0');
    resBodyGrad.addColorStop(0.3, '#E6CCB2');
    resBodyGrad.addColorStop(0.8, '#DDB892');
    resBodyGrad.addColorStop(1, '#B08968');

    ctx.fillStyle = resBodyGrad;
    ctx.beginPath();
    ctx.roundRect(resistorPos.x - 30, resistorPos.y - 11, 60, 22, 6);
    ctx.fill();
    ctx.strokeStyle = '#7F5539';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Resistor Metal Leads
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(resistorPos.x - 45, resistorPos.y);
    ctx.lineTo(resistorPos.x - 30, resistorPos.y);
    ctx.moveTo(resistorPos.x + 30, resistorPos.y);
    ctx.lineTo(resistorPos.x + 45, resistorPos.y);
    ctx.stroke();

    // 4 IEC Color Code Bands
    const bandPositions = [-18, -6, 6, 18];
    curRes.bands.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(resistorPos.x + bandPositions[idx] - 2.5, resistorPos.y - 11, 5, 22);
    });

    drawTerminal(resTermA.x, resTermA.y);
    drawTerminal(resTermB.x, resTermB.y);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${curRes.label} (${curRes.tolerance})`, resistorPos.x, resistorPos.y + 24);
    ctx.restore();

    // ── 7. Component E & F: Analog Ammeter and Voltmeter Dials ──
    const drawMeter = (
      center: { x: number; y: number },
      title: string,
      units: string,
      maxVal: number,
      currentAngle: number,
      needleColor: string,
      termPlus: { x: number; y: number },
      termMinus: { x: number; y: number },
      valueString: string
    ) => {
      ctx.save();
      const radius = 64;

      // Drop shadow for instrument case
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;

      // Outer Bezel / Housing
      const caseGrad = ctx.createLinearGradient(
        center.x - radius,
        center.y - radius,
        center.x + radius,
        center.y + radius
      );
      caseGrad.addColorStop(0, '#FFFFFF');
      caseGrad.addColorStop(0.3, '#CBD5E1');
      caseGrad.addColorStop(0.7, '#475569');
      caseGrad.addColorStop(1, '#1E293B');

      ctx.fillStyle = caseGrad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius + 4, 0, Math.PI * 2);
      ctx.fill();

      // White Dial Face
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Parallax Mirror Strip
      ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.beginPath();
      ctx.arc(center.x, center.y + 12, 38, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.lineTo(center.x + 36, center.y - 12);
      ctx.arc(center.x, center.y + 12, 46, -Math.PI * 0.15, -Math.PI * 0.85, true);
      ctx.closePath();
      ctx.fill();

      // Graduated Arc & Scale Marks
      const startAng = -Math.PI * 0.88;
      const totalSweep = Math.PI * 0.76;
      const numDivs = 10;

      ctx.strokeStyle = '#0F172A';
      ctx.fillStyle = '#0F172A';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      for (let i = 0; i <= numDivs; i++) {
        const a = startAng + (i / numDivs) * totalSweep;
        const isMajor = i % 2 === 0;
        const tickLen = isMajor ? 9 : 5;

        const innerR = 48;
        const outerR = innerR + tickLen;

        const x1 = center.x + Math.cos(a) * innerR;
        const y1 = center.y + Math.sin(a) * innerR + 14;
        const x2 = center.x + Math.cos(a) * outerR;
        const y2 = center.y + Math.sin(a) * outerR + 14;

        ctx.lineWidth = isMajor ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (isMajor) {
          const val = ((i / numDivs) * maxVal).toFixed(maxVal < 1 ? 2 : 1);
          const textR = outerR + 8;
          const tx = center.x + Math.cos(a) * textR;
          const ty = center.y + Math.sin(a) * textR + 14;
          ctx.fillText(val, tx, ty + 3);
        }
      }

      // Title & Units
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, center.x, center.y - 14);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillText(units, center.x, center.y - 4);

      // Meter Needle with Inertia
      ctx.save();
      ctx.translate(center.x, center.y + 24);
      ctx.rotate(currentAngle);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      ctx.strokeStyle = needleColor;
      ctx.fillStyle = needleColor;
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(-1.5, 8);
      ctx.lineTo(1.5, 8);
      ctx.lineTo(0.5, -54);
      ctx.lineTo(-0.5, -54);
      ctx.closePath();
      ctx.fill();

      // Pivot Cap
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Glass Cover Reflection Glare
      const glassGrad = ctx.createLinearGradient(
        center.x - radius,
        center.y - radius,
        center.x + radius,
        center.y + radius
      );
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      glassGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
      glassGrad.addColorStop(1, 'rgba(56, 189, 248, 0.08)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius - 1, 0, Math.PI * 2);
      ctx.fill();

      // Terminal binding posts at bottom of meter
      drawTerminal(termPlus.x, termPlus.y, '+', true);
      drawTerminal(termMinus.x, termMinus.y, '−', false);

      // Digital readout badge below meter
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(center.x - 42, center.y + 74, 84, 18, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = needleColor;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(valueString, center.x, center.y + 86);

      ctx.restore();
    };

    // Draw Ammeter (0 - 0.4 A)
    drawMeter(
      ammeterPos,
      'AMMETER',
      '(0–400 mA)',
      0.4,
      s.ammeterAngle,
      '#0EA5E9',
      amTermPlus,
      amTermMinus,
      s.keyInserted ? `${(targetI * 1000).toFixed(1)} mA` : '0.0 mA'
    );

    // Draw Voltmeter (0 - 4.0 V)
    drawMeter(
      voltmeterPos,
      'VOLTMETER',
      '(0–4.0 V)',
      4.0,
      s.voltmeterAngle,
      '#EF4444',
      vmTermPlus,
      vmTermMinus,
      s.keyInserted ? `${targetV.toFixed(2)} V` : '0.00 V'
    );
  }, [computePhysics]);

  // RequestAnimationFrame 60FPS loop
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

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const s = simState.current;
    const keyPos = { x: 130, y: 350 };
    const rheoX = 460;
    const rheoY = 360;
    const coilW = 200;
    const sliderPx = rheoX - coilW / 2 + 10 + (s.rheostatResistance / 20) * (coilW - 20);

    // 1. Check Key/Switch Toggle
    if (Math.hypot(x - keyPos.x, y - keyPos.y) < 28) {
      s.keyInserted = !s.keyInserted;
      syncUI();
      return;
    }

    // 2. Check Rheostat Slider Drag
    if (x >= rheoX - coilW / 2 - 20 && x <= rheoX + coilW / 2 + 20 && y >= rheoY - 55 && y <= rheoY + 25) {
      s.isDraggingSlider = true;
      const clampedX = Math.max(rheoX - coilW / 2 + 10, Math.min(rheoX + coilW / 2 - 10, x));
      const norm = (clampedX - (rheoX - coilW / 2 + 10)) / (coilW - 20);
      s.rheostatResistance = norm * 20.0;
      canvas.setPointerCapture(e.pointerId);
      syncUI();
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
    const keyPos = { x: 130, y: 350 };
    const rheoX = 460;
    const rheoY = 360;
    const coilW = 200;

    if (s.isDraggingSlider) {
      const clampedX = Math.max(rheoX - coilW / 2 + 10, Math.min(rheoX + coilW / 2 - 10, x));
      const norm = (clampedX - (rheoX - coilW / 2 + 10)) / (coilW - 20);
      s.rheostatResistance = norm * 20.0;
      syncUI();
    } else {
      if (Math.hypot(x - keyPos.x, y - keyPos.y) < 28) {
        canvas.style.cursor = 'pointer';
      } else if (
        x >= rheoX - coilW / 2 - 20 &&
        x <= rheoX + coilW / 2 + 20 &&
        y >= rheoY - 55 &&
        y <= rheoY + 25
      ) {
        canvas.style.cursor = 'ew-resize';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simState.current;
    if (s.isDraggingSlider) {
      s.isDraggingSlider = false;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Add Reading to Table
  const addReading = () => {
    if (readings.length >= 8) return;
    const { v, i_A, i_mA } = computePhysics();
    if (!uiState.keyInserted) return;

    const newRow: ReadingRow = {
      srNo: readings.length + 1,
      rRheo: uiState.rheostatResistance,
      v: Number(v.toFixed(3)),
      i_mA: Number(i_mA.toFixed(1)),
      i_A: Number(i_A.toFixed(4)),
    };
    setReadings(prev => [...prev, newRow]);
  };

  const clearReadings = () => setReadings([]);

  // Compute Linear Regression Slope (R_experimental = delta V / delta I)
  const computeRegression = () => {
    if (readings.length < 2) return null;
    const n = readings.length;
    let sumI = 0,
      sumV = 0,
      sumIV = 0,
      sumI2 = 0;

    readings.forEach(r => {
      sumI += r.i_A;
      sumV += r.v;
      sumIV += r.i_A * r.v;
      sumI2 += r.i_A * r.i_A;
    });

    const slope = (n * sumIV - sumI * sumV) / (n * sumI2 - sumI * sumI);
    const nominal = RESISTORS[uiState.selectedResistor].resistance;
    const percentError = Math.abs((slope - nominal) / nominal) * 100;

    return {
      slope: Number(slope.toFixed(2)),
      nominal,
      percentError: Number(percentError.toFixed(1)),
    };
  };

  const regressionResult = computeRegression();

  return (
    <div className="w-full h-full min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col p-4 md:p-6 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-5 py-3.5 bg-[#111827] border border-sky-500/20 rounded-2xl shadow-xl shadow-sky-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-500 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-sky-500/30">
            Ω
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Ohm's Law & Resistance Verification
            </h1>
            <p className="text-xs text-slate-400">
              Karnataka PUC Physics Practicals • V = IR & V–I Characteristic Curve
            </p>
          </div>
        </div>

        {/* Header Live Status Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-slate-900/90 rounded-xl border border-slate-700/60 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Circuit:</span>
            <span className={`font-semibold flex items-center gap-1 ${uiState.keyInserted ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Zap size={13} />
              {uiState.keyInserted ? 'CLOSED (ACTIVE)' : 'OPEN (OFF)'}
            </span>
          </div>

          <div className="px-3.5 py-1.5 bg-sky-950/40 rounded-xl border border-sky-500/40 flex items-center gap-2 text-xs">
            <span className="text-sky-300 font-medium">V / I:</span>
            <span className="text-cyan-300 font-mono font-bold text-sm">
              {uiState.voltage.toFixed(2)}V / {uiState.current_mA.toFixed(1)}mA
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
          <span>💡 Click the brass key to insert/remove plug. Drag the rheostat slider to alter current.</span>
          <span className="text-sky-400 font-medium">EMF: 4.0V (2 cells) • Internal r: 0.6Ω</span>
        </div>
      </div>

      {/* Controls & Readings Dashboard */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Resistor Tray & Rheostat Slider Control (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Resistor Selector Tray */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2.5">
              Select Resistor Under Test (R)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(RESISTORS) as ResistorKey[]).map(key => {
                const r = RESISTORS[key];
                const isSelected = uiState.selectedResistor === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      simState.current.selectedResistor = key;
                      syncUI();
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-md shadow-sky-950/40'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/70 hover:text-slate-200'
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className="font-mono text-[11px] text-slate-400">{r.tolerance}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rheostat Slider Control Bar */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Rheostat Resistance (Rh)
              </span>
              <span className="font-mono text-xs font-bold text-sky-400">{uiState.rheostatResistance} Ω</span>
            </div>

            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={uiState.rheostatResistance}
              onChange={e => {
                simState.current.rheostatResistance = parseFloat(e.target.value);
                syncUI();
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  simState.current.keyInserted = !simState.current.keyInserted;
                  syncUI();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  uiState.keyInserted
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                }`}
              >
                {uiState.keyInserted ? '🔌 Plug Inserted (Closed)' : '🔓 Plug Removed (Open)'}
              </button>

              <button
                onClick={() => {
                  simState.current.rheostatResistance = 10.0;
                  simState.current.keyInserted = true;
                  syncUI();
                }}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Observation Table, Graph & Slope (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Action Bar */}
          <div className="bg-[#111827] border border-sky-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <span>📈</span> Live Measurements & V–I Plot
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={addReading}
                  disabled={!uiState.keyInserted || readings.length >= 8}
                  className="py-1 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-40 shadow-md shadow-sky-500/20"
                >
                  <Plus size={14} /> Record Reading ({readings.length}/8)
                </button>
                <button
                  onClick={clearReadings}
                  disabled={readings.length === 0}
                  className="py-1 px-2.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition-all disabled:opacity-30 border border-slate-700"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Live Readout Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Voltmeter (V)</span>
                <span className="text-base font-mono font-bold text-rose-400">{uiState.voltage.toFixed(2)} V</span>
                <span className="text-[10px] text-slate-500 block">across test resistor</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Ammeter (I)</span>
                <span className="text-base font-mono font-bold text-sky-400">{uiState.current_mA.toFixed(1)} mA</span>
                <span className="text-[10px] text-slate-500 block">circuit current</span>
              </div>

              <div className="bg-sky-950/50 border border-sky-500/40 rounded-xl p-2.5">
                <span className="text-[11px] text-sky-300 font-semibold block mb-1">Ratio V/I</span>
                <span className="text-base font-mono font-bold text-emerald-300">
                  {uiState.current_A > 0 ? (uiState.voltage / uiState.current_A).toFixed(2) : '0.00'} Ω
                </span>
                <span className="text-[10px] text-sky-400/80 block">instantaneous R</span>
              </div>
            </div>
          </div>

          {/* Tabbed View: Graph vs Table vs Theory */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex-1">
            <div className="flex gap-2 border-b border-slate-800 pb-2 mb-3 text-xs">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'graph' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                V–I Graph Plot
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Observation Table ({readings.length})
              </button>
              <button
                onClick={() => setActiveTab('theory')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'theory' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Theory & Verification
              </button>
            </div>

            {activeTab === 'graph' ? (
              <div className="flex flex-col gap-3">
                {/* SVG V-I Graph */}
                <div className="w-full h-44 bg-slate-900/90 rounded-xl border border-slate-800 p-2 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 160">
                    {/* Grid lines */}
                    {[40, 80, 120].map(y => (
                      <line key={y} x1="45" y1={y} x2="385" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    ))}
                    {[110, 180, 250, 320].map(x => (
                      <line key={x} x1={x} y1="15" x2={x} y2="135" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    ))}

                    {/* Axes */}
                    <line x1="45" y1="135" x2="385" y2="135" stroke="#94A3B8" strokeWidth="1.5" />
                    <line x1="45" y1="15" x2="45" y2="135" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* Axis Labels */}
                    <text x="385" y="150" fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">
                      Current I (mA) →
                    </text>
                    <text x="35" y="15" fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">
                      V (V) ↑
                    </text>

                    {/* Best-Fit Regression Line */}
                    {regressionResult && (
                      <line
                        x1="45"
                        y1="135"
                        x2={45 + (0.35 * 1000 * 340) / 400}
                        y2={135 - ((0.35 * regressionResult.slope) / 4.0) * 120}
                        stroke="#38BDF8"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Plotted Data Points */}
                    {readings.map((r, i) => {
                      const px = 45 + (r.i_mA / 400) * 340;
                      const py = 135 - (r.v / 4.0) * 120;
                      return (
                        <g key={i}>
                          <circle cx={px} cy={py} r="4.5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="1.5" />
                          <text x={px} y={py - 7} fill="#38BDF8" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">
                            ({r.i_mA.toFixed(0)}, {r.v.toFixed(1)})
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Regression Summary */}
                {regressionResult ? (
                  <div className="p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">
                      Slope (Experimental R): <strong className="text-emerald-400">{regressionResult.slope} Ω</strong>
                    </span>
                    <span className="text-slate-300">
                      Nominal: <strong className="text-sky-300">{regressionResult.nominal} Ω</strong>
                    </span>
                    <span className="text-slate-300">
                      Error: <strong className="text-amber-400">{regressionResult.percentError}%</strong>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center">
                    Record at least 2 readings at different rheostat positions to generate the best-fit line.
                  </p>
                )}
              </div>
            ) : activeTab === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-2">#</th>
                      <th className="py-1.5 px-2 font-mono">Rh (Ω)</th>
                      <th className="py-1.5 px-2 font-mono">Voltmeter V (V)</th>
                      <th className="py-1.5 px-2 font-mono">Ammeter I (mA)</th>
                      <th className="py-1.5 px-2 font-mono">R = V/I (Ω)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-500">
                          No readings recorded yet. Adjust rheostat and click "Record Reading".
                        </td>
                      </tr>
                    ) : (
                      readings.map(row => (
                        <tr key={row.srNo} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                          <td className="py-1 px-2 text-slate-400">{row.srNo}</td>
                          <td className="py-1 px-2 font-mono">{row.rRheo.toFixed(1)}</td>
                          <td className="py-1 px-2 font-mono text-rose-300">{row.v.toFixed(2)}</td>
                          <td className="py-1 px-2 font-mono text-sky-300">{row.i_mA.toFixed(1)}</td>
                          <td className="py-1 px-2 font-mono text-emerald-400 font-bold">
                            {(row.v / row.i_A).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 font-mono">
                  <div className="text-sky-400 font-bold mb-1">⚡ Ohm's Law Principle:</div>
                  <div>• Statement: Current through a conductor is directly proportional to potential difference (V ∝ I) at constant temperature.</div>
                  <div>• Resistance: R = V / I (Constant of proportionality)</div>
                  <div>• Circuit Equation: I = EMF / (r_internal + R_rheostat + R_test)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
