import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Activity, Zap, Sparkles, Sliders } from 'lucide-react';

interface ZenerModel {
  name: string;
  vz: number; // Zener breakdown voltage (V)
  rz: number; // Dynamic resistance in breakdown (Ohms)
  vf: number; // Forward knee voltage (V)
  rf: number; // Forward dynamic resistance (Ohms)
  pMax: number; // Max power dissipation (W)
}

const ZENER_MODELS: ZenerModel[] = [
  { name: '1N4734A (5.6V, 1W)', vz: 5.6, rz: 7, vf: 0.7, rf: 5, pMax: 1.0 },
  { name: '1N4728A (3.3V, 1W)', vz: 3.3, rz: 10, vf: 0.7, rf: 5, pMax: 1.0 },
  { name: '1N4736A (6.8V, 1W)', vz: 6.8, rz: 8, vf: 0.7, rf: 5, pMax: 1.0 },
  { name: '1N4739A (9.1V, 1W)', vz: 9.1, rz: 12, vf: 0.7, rf: 5, pMax: 1.0 }
];

interface ZenerObservation {
  srNo: number;
  biasMode: 'Forward' | 'Reverse';
  inputVoltage: number; // Vin (V)
  diodeVoltage: number; // Vz / Vf (V)
  diodeCurrent: number; // I (mA)
  powerDissipation: number; // mW
  status: string;
}

export const ZenerDiodeLab: React.FC = () => {
  const circuitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [selectedModelIdx, setSelectedModelIdx] = useState<number>(0);
  const [biasMode, setBiasMode] = useState<'forward' | 'reverse'>('reverse');
  const [inputVoltage, setInputVoltage] = useState<number>(0.0); // 0 to 15 V
  const [seriesResistor, setSeriesResistor] = useState<number>(220); // Ohms (100 to 1000)
  const [observationTable, setObservationTable] = useState<ZenerObservation[]>([]);

  const activeModel = ZENER_MODELS[selectedModelIdx];

  // Physics calculation of Diode Voltage and Current:
  // Forward Bias:
  // If Vin <= Vf: I ~ 0, Vd = Vin
  // If Vin > Vf: I = (Vin - Vf) / (seriesResistor + rf), Vd = Vf + I * rf
  // Reverse Bias:
  // If Vin <= Vz: I = I_leakage ~ 0.005 mA, Vd = Vin
  // If Vin > Vz: I = (Vin - Vz) / (seriesResistor + rz), Vd = Vz + I * rz
  let diodeVoltage = 0;
  let diodeCurrentMa = 0; // in mA
  let isBreakdownOrConduction = false;

  if (biasMode === 'forward') {
    if (inputVoltage <= activeModel.vf) {
      diodeVoltage = inputVoltage;
      // Exponential pre-knee conduction: I = 10^-6 * (exp(V / 0.026) - 1)
      diodeCurrentMa = Math.min(0.2, (Math.exp(inputVoltage / 0.1) - 1) * 0.001);
      isBreakdownOrConduction = false;
    } else {
      const currentA = (inputVoltage - activeModel.vf) / (seriesResistor + activeModel.rf);
      diodeCurrentMa = currentA * 1000;
      diodeVoltage = activeModel.vf + currentA * activeModel.rf;
      isBreakdownOrConduction = true;
    }
  } else {
    // Reverse bias
    if (inputVoltage <= activeModel.vz) {
      diodeVoltage = inputVoltage;
      diodeCurrentMa = 0.005 * (inputVoltage / activeModel.vz); // tiny reverse leakage
      isBreakdownOrConduction = false;
    } else {
      const currentA = (inputVoltage - activeModel.vz) / (seriesResistor + activeModel.rz);
      diodeCurrentMa = currentA * 1000;
      diodeVoltage = activeModel.vz + currentA * activeModel.rz;
      isBreakdownOrConduction = true;
    }
  }

  const powerMw = diodeVoltage * diodeCurrentMa;

  // Add observation record
  const addObservation = () => {
    const newRecord: ZenerObservation = {
      srNo: observationTable.length + 1,
      biasMode: biasMode === 'forward' ? 'Forward' : 'Reverse',
      inputVoltage: parseFloat(inputVoltage.toFixed(2)),
      diodeVoltage: parseFloat(diodeVoltage.toFixed(3)),
      diodeCurrent: parseFloat(diodeCurrentMa.toFixed(2)),
      powerDissipation: parseFloat(powerMw.toFixed(1)),
      status: biasMode === 'reverse'
        ? isBreakdownOrConduction ? '⚡ Zener Breakdown Active' : 'Pre-Breakdown (Cutoff)'
        : isBreakdownOrConduction ? '⚡ Forward Conducting' : 'Below Knee Voltage'
    };

    setObservationTable([...observationTable, newRecord]);
  };

  // Render Circuit Diagram on Canvas
  useEffect(() => {
    const canvas = circuitCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Lab bench background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Bench dot grid
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

    // 1. Regulated DC Power Supply Unit (Left side)
    const psuX = 50;
    const psuY = 60;
    const psuW = 150;
    const psuH = 180;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    // Outer metallic chassis
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.roundRect(psuX, psuY, psuW, psuH, 8);
    ctx.fill();
    ctx.restore();

    // PSU Panel Header
    ctx.fillStyle = '#0EA5E9';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('DC POWER SUPPLY', psuX + psuW / 2, psuY + 22);

    // Digital LED Display for Voltage
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(psuX + 16, psuY + 34, psuW - 32, 42);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(psuX + 16, psuY + 34, psuW - 32, 42);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${inputVoltage.toFixed(2)} V`, psuX + psuW / 2, psuY + 64);

    // Output Terminals (+ and -)
    const termPlusX = psuX + 45;
    const termMinusX = psuX + psuW - 45;
    const termY = psuY + psuH - 30;

    // + Terminal (Red)
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(termPlusX, termY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('+', termPlusX, termY + 3);

    // - Terminal (Black)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(termMinusX, termY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('−', termMinusX, termY + 3);

    // 2. Digital Multimeter Panel Meters (Voltmeter & Milliammeter)
    // Voltmeter (measures Diode V)
    const meterVY = 50;
    const meterVX = 450;
    const meterW = 140;
    const meterH = 75;

    ctx.save();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(meterVX, meterVY, meterW, meterH, 6);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('DIGITAL VOLTMETER (Vz/Vf)', meterVX + meterW / 2, meterVY + 18);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${diodeVoltage.toFixed(3)} V`, meterVX + meterW / 2, meterVY + 52);

    // Milliammeter (measures Series I)
    const meterIX = 260;
    const meterIY = 50;

    ctx.save();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(meterIX, meterIY, meterW, meterH, 6);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('MILLIAMMETER (I)', meterIX + meterW / 2, meterIY + 18);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${diodeCurrentMa.toFixed(2)} mA`, meterIX + meterW / 2, meterIY + 52);

    // 3. Breadboard / Circuit Layout with Zener Diode & Resistor
    const bbX = 250;
    const bbY = 150;
    const bbW = 380;
    const bbH = 120;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(bbX, bbY, bbW, bbH, 8);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Circuit wires on breadboard
    const wireYTop = bbY + 40;
    const wireYBottom = bbY + 85;

    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;

    // From PSU(+) to Series Resistor
    ctx.beginPath();
    ctx.moveTo(termPlusX, termY);
    ctx.lineTo(termPlusX, wireYTop);
    ctx.lineTo(bbX + 40, wireYTop);
    ctx.stroke();

    // Series Current-Limiting Resistor (Rs)
    const rsX = bbX + 80;
    ctx.save();
    ctx.fillStyle = '#D97706';
    ctx.fillRect(rsX - 30, wireYTop - 10, 60, 20);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1;
    ctx.strokeRect(rsX - 30, wireYTop - 10, 60, 20);

    // Color bands
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(rsX - 18, wireYTop - 10, 5, 20);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(rsX - 6, wireYTop - 10, 5, 20);
    ctx.fillStyle = '#92400E';
    ctx.fillRect(rsX + 6, wireYTop - 10, 5, 20);
    ctx.fillStyle = '#EAB308';
    ctx.fillRect(rsX + 18, wireYTop - 10, 4, 20);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Rs: ${seriesResistor}Ω`, rsX, wireYTop - 14);
    ctx.restore();

    // Wire through Milliammeter to Zener diode junction
    const zenerX = bbX + 260;

    ctx.strokeStyle = '#2563EB';
    ctx.beginPath();
    ctx.moveTo(rsX + 30, wireYTop);
    ctx.lineTo(zenerX, wireYTop);
    ctx.stroke();

    // Draw Zener Diode Symbol / Component
    const zenerMidY = (wireYTop + wireYBottom) / 2;

    ctx.save();
    // Glass diode body
    ctx.fillStyle = '#EA580C'; // orange glass body
    ctx.beginPath();
    ctx.roundRect(zenerX - 10, zenerMidY - 14, 20, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cathode black band (determines forward/reverse orientation)
    ctx.fillStyle = '#0F172A';
    if (biasMode === 'reverse') {
      // Cathode connected to positive (top)
      ctx.fillRect(zenerX - 10, zenerMidY - 14, 20, 7);
    } else {
      // Cathode connected to negative (bottom)
      ctx.fillRect(zenerX - 10, zenerMidY + 7, 20, 7);
    }

    // Zener leads
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(zenerX, wireYTop);
    ctx.lineTo(zenerX, zenerMidY - 14);
    ctx.moveTo(zenerX, zenerMidY + 14);
    ctx.lineTo(zenerX, wireYBottom);
    ctx.stroke();

    // Zener Symbol label
    ctx.fillStyle = '#0EA5E9';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ZENER: ${activeModel.vz}V`, zenerX + 16, zenerMidY - 2);
    ctx.fillStyle = '#64748B';
    ctx.font = '9px system-ui';
    ctx.fillText(`Cathode ${biasMode === 'reverse' ? '▲ Top (Reverse)' : '▼ Bottom (Forward)'}`, zenerX + 16, zenerMidY + 12);
    ctx.restore();

    // Bottom return wire to PSU(-)
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(zenerX, wireYBottom);
    ctx.lineTo(termMinusX, wireYBottom);
    ctx.lineTo(termMinusX, termY);
    ctx.stroke();

    // Connecting wires to Voltmeter
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(meterVX + 20, meterVY + meterH);
    ctx.lineTo(zenerX - 5, wireYTop);
    ctx.moveTo(meterVX + meterW - 20, meterVY + meterH);
    ctx.lineTo(zenerX - 5, wireYBottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [inputVoltage, diodeVoltage, diodeCurrentMa, seriesResistor, activeModel, biasMode]);

  // Render I-V Characteristic Curve Graph Canvas
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

    // Origin centered near right/middle for reverse breakdown emphasis
    const ox = width * 0.65;
    const oy = height * 0.45;

    // Scale factors: X-axis (Volts) & Y-axis (mA)
    const scaleX = 18; // px per Volt
    const scaleY = 3.5; // px per mA

    // Grid lines
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Coordinate Axes
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;

    // X-Axis
    ctx.beginPath();
    ctx.moveTo(20, oy);
    ctx.lineTo(width - 20, oy);
    ctx.stroke();

    // Y-Axis
    ctx.beginPath();
    ctx.moveTo(ox, 15);
    ctx.lineTo(ox, height - 15);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('+VF (V) →', width - 25, oy - 6);
    ctx.textAlign = 'left';
    ctx.fillText('← -VZ (V) (Reverse Voltage)', 25, oy - 6);

    ctx.textAlign = 'center';
    ctx.fillText('+IF (mA)', ox + 28, 25);
    ctx.fillText('-IZ (mA)', ox + 28, height - 20);

    // Plot Theoretical Zener I-V Curve
    // 1. Forward Bias Region (1st Quadrant)
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const ptsForward = [];
    for (let v = 0; v <= 1.5; v += 0.05) {
      let i = 0;
      if (v <= activeModel.vf) {
        i = (Math.exp(v / 0.1) - 1) * 0.001;
      } else {
        i = (v - activeModel.vf) * 30;
      }
      const px = ox + v * scaleX;
      const py = oy - i * scaleY;
      ptsForward.push({ px, py });
    }

    ctx.moveTo(ox, oy);
    ptsForward.forEach(pt => ctx.lineTo(pt.px, pt.py));
    ctx.stroke();

    // 2. Reverse Bias Breakdown Region (3rd Quadrant)
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);

    const ptsReverse = [];
    for (let v = 0; v <= 12; v += 0.1) {
      let i = 0;
      if (v <= activeModel.vz) {
        i = 0.05 * (v / activeModel.vz);
      } else {
        // Sharp vertical drop at Zener breakdown Vz
        i = (v - activeModel.vz) * 35;
      }
      const px = ox - v * scaleX;
      const py = oy + i * scaleY;
      ptsReverse.push({ px, py });
    }

    ptsReverse.forEach(pt => ctx.lineTo(pt.px, pt.py));
    ctx.stroke();

    // Knee Voltage Annotations
    // Vz breakdown tick
    const vzPx = ox - activeModel.vz * scaleX;
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(vzPx, 20);
    ctx.lineTo(vzPx, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Vz = ${activeModel.vz}V`, vzPx, oy + 16);

    // Current Operating Point Indicator on Curve
    let curPx = ox;
    let curPy = oy;

    if (biasMode === 'forward') {
      curPx = ox + diodeVoltage * scaleX;
      curPy = oy - diodeCurrentMa * scaleY;
    } else {
      curPx = ox - diodeVoltage * scaleX;
      curPy = oy + diodeCurrentMa * scaleY;
    }

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(curPx, curPy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glowing halo around operating point
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(curPx, curPy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Dynamic operating point badge
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(curPx + 8, curPy - 20, 95, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`(${diodeVoltage.toFixed(2)}V, ${diodeCurrentMa.toFixed(1)}mA)`, curPx + 55, curPy - 7);
  }, [activeModel, biasMode, diodeVoltage, diodeCurrentMa]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 select-none">
      {/* Simulation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Zener Diode — V-I Characteristics & Breakdown
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Plot forward & reverse bias characteristics of a Zener diode, identify Zener breakdown knee voltage <span className="font-semibold text-slate-700">Vz</span> and dynamic resistance <span className="font-semibold text-slate-700">rz = ΔVz / ΔIz</span>.
          </p>
        </div>

        {/* Bias Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setBiasMode('reverse')}
            className={`px-3 py-1.5 rounded-lg transition ${
              biasMode === 'reverse' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reverse Bias (Zener Breakdown)
          </button>
          <button
            onClick={() => setBiasMode('forward')}
            className={`px-3 py-1.5 rounded-lg transition ${
              biasMode === 'forward' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Forward Bias (Normal Diode)
          </button>
        </div>
      </div>

      {/* Main Dual Stage: Circuit Workbench & Dynamic I-V Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Circuit Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-500" />
              Real Lab Workbench Circuit
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Rs = {seriesResistor}Ω | Zener: {activeModel.name.split(' ')[0]}
            </span>
          </div>

          <canvas
            ref={circuitCanvasRef}
            width={580}
            height={280}
            className="w-full h-auto"
          />
        </div>

        {/* Right: Dynamic I-V Characteristic Curve (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Dynamic I-V Characteristic Curve
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold">
              Vz = {activeModel.vz}V
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

      {/* Interactive Controls & Live Readings */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Input Voltage Slider */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Input Voltage (Vin)
              </label>
              <span className="text-sm font-bold font-mono text-sky-600">{inputVoltage.toFixed(2)} V</span>
            </div>

            <input
              type="range"
              min="0.0"
              max="15.0"
              step="0.1"
              value={inputVoltage}
              onChange={e => setInputVoltage(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0.0V</span>
              <span>7.5V</span>
              <span>15.0V</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Breakdown Condition:</span>
            <span className={`font-bold ${isBreakdownOrConduction ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isBreakdownOrConduction ? '⚡ Active Breakdown' : 'Cutoff / Leakage'}
            </span>
          </div>
        </div>

        {/* Card 2: Zener Diode Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Zener Diode Rating (Vz)
            </label>
            <select
              value={selectedModelIdx}
              onChange={e => setSelectedModelIdx(parseInt(e.target.value))}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {ZENER_MODELS.map((model, idx) => (
                <option key={model.name} value={idx}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Dynamic rz:</span>
            <span className="font-mono font-bold text-slate-800">{activeModel.rz} Ω</span>
          </div>
        </div>

        {/* Card 3: Series Limiting Resistor Rs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Series Resistor (Rs)
              </label>
              <span className="text-sm font-bold font-mono text-indigo-600">{seriesResistor} Ω</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[100, 220, 470].map(rVal => (
                <button
                  key={rVal}
                  onClick={() => setSeriesResistor(rVal)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    seriesResistor === rVal
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {rVal}Ω
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Power P = V·I:</span>
            <span className="font-mono font-bold text-slate-800">{powerMw.toFixed(1)} mW</span>
          </div>
        </div>

        {/* Card 4: Action Buttons */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Live Operating Point
            </span>
            <div className="font-mono text-base font-bold text-slate-900">
              {diodeVoltage.toFixed(2)} V / {diodeCurrentMa.toFixed(1)} mA
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={addObservation}
              className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 flex items-center justify-center gap-1.5 shadow-sm transition"
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
              V-I Characteristics in Forward and Reverse Bias Regions
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
            No readings recorded yet. Vary input voltage across pre-breakdown and breakdown regions, then click &quot;Record Reading&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Bias Mode</th>
                  <th className="py-2.5 px-3">Input Voltage Vin (V)</th>
                  <th className="py-2.5 px-3">Diode Voltage Vd (V)</th>
                  <th className="py-2.5 px-3">Current I (mA)</th>
                  <th className="py-2.5 px-3">Power (mW)</th>
                  <th className="py-2.5 px-3">Operating State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observationTable.map(row => (
                  <tr key={row.srNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.srNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{row.biasMode}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.inputVoltage.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{row.diodeVoltage.toFixed(3)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.diodeCurrent.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{row.powerDissipation.toFixed(1)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.status.includes('Active') || row.status.includes('Conducting')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Theoretical Summary Box */}
        <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-sky-950">
          <div>
            <div className="font-bold text-sky-900 mb-0.5">Key Zener Characteristics:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Zener Breakdown:</strong> In reverse bias, when reverse voltage reaches Vz, electric field breakdown occurs, maintaining virtually constant voltage across terminals.</li>
              <li><strong>Dynamic Resistance:</strong> rz = &Delta;Vz / &Delta;Iz (measured from slope of reverse breakdown curve).</li>
              <li><strong>Voltage Regulation:</strong> Used in parallel with load to regulate DC voltage against input fluctuations.</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Dynamic Resistance</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">rz = &Delta;Vz / &Delta;Iz</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZenerDiodeLab;
