import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, ToggleLeft, ToggleRight, Sparkles, Sliders } from 'lucide-react';

type PotentiometerMode = 'compareEmf' | 'internalResistance';

interface PotentiometerObservation {
  srNo: number;
  mode: string;
  driverEMF: number; // V
  cell1LengthCm: number; // l1 (cm)
  cell2LengthCm?: number; // l2 (cm)
  shuntR?: number; // Ohm
  calculatedRatioOrR: string;
  status: string;
}

export const PotentiometerLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Experiment mode: 'compareEmf' or 'internalResistance'
  const [mode, setMode] = useState<PotentiometerMode>('compareEmf');

  // Primary Circuit parameters
  const [driverEMF, setDriverEMF] = useState<number>(4.0); // V (2V to 6V)
  const [rheostatResistance, setRheostatResistance] = useState<number>(15); // Ohms (5 to 50 Ohms)
  
  // Secondary Circuit parameters
  // Cell 1: Leclanché Cell (E1 = 1.45V)
  const e1 = 1.45;
  // Cell 2: Daniel Cell (E2 = 1.08V)
  const e2 = 1.08;
  const [activeCell, setActiveCell] = useState<'cell1' | 'cell2'>('cell1');
  const [shuntR, setShuntR] = useState<number>(5); // Shunt resistance for internal resistance mode
  const [cellInternalR, setCellInternalR] = useState<number>(1.5); // True internal resistance r of cell

  // 4-wire Potentiometer total wire length = 400 cm (4 segments of 100 cm each)
  const wireResistancePerCm = 0.05; // 5 Ohms per 100 cm (20 Ohms total for 400 cm)
  const totalWireR = 400 * wireResistancePerCm; // 20 Ohms
  
  // Total primary circuit current I = Driver / (R_wire + R_rheostat)
  const primaryCurrent = driverEMF / (totalWireR + rheostatResistance);
  // Total voltage across potentiometer wire = I * R_wire
  const vWireTotal = primaryCurrent * totalWireR;
  // Potential gradient k = V_wire / 400 (V/cm)
  const potentialGradient = vWireTotal / 400; // V/cm

  // Jockey position in cm (0 to 400 cm across 4 wires)
  const [jockeyPosCm, setJockeyPosCm] = useState<number>(120.0);
  const [isJockeyPressed, setIsJockeyPressed] = useState<boolean>(true);
  const [observationTable, setObservationTable] = useState<PotentiometerObservation[]>([]);

  const isDraggingJockey = useRef(false);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Calculate Theoretical Balance Lengths:
  // For Compare EMF: l1 = E1 / k, l2 = E2 / k
  const theoreticalL1 = Math.min(399, e1 / potentialGradient);
  const theoreticalL2 = Math.min(399, e2 / potentialGradient);

  // For Internal Resistance:
  // Open circuit balance length l1 = E1 / k
  // Closed circuit terminal voltage V = E1 * (R / (R + r))
  // Closed circuit balance length l2 = V / k
  const terminalVoltage = (e1 * shuntR) / (shuntR + cellInternalR);
  const theoreticalClosedL = Math.min(399, terminalVoltage / potentialGradient);

  // Active target voltage and target length based on mode and settings
  let targetEMF = e1;
  let theoreticalBalanceCm = theoreticalL1;

  if (mode === 'compareEmf') {
    if (activeCell === 'cell2') {
      targetEMF = e2;
      theoreticalBalanceCm = theoreticalL2;
    } else {
      targetEMF = e1;
      theoreticalBalanceCm = theoreticalL1;
    }
  } else {
    // Internal Resistance mode: activeCell determines open circuit vs closed circuit
    if (activeCell === 'cell2') {
      // Shunted / Closed circuit
      targetEMF = terminalVoltage;
      theoreticalBalanceCm = theoreticalClosedL;
    } else {
      // Open circuit (l1)
      targetEMF = e1;
      theoreticalBalanceCm = theoreticalL1;
    }
  }

  // Jockey tapped wire voltage: V(jockey) = k * jockeyPosCm
  const jockeyVoltage = potentialGradient * jockeyPosCm;
  // Difference voltage across galvanometer: deltaV = V(jockey) - targetEMF
  const deltaV = jockeyVoltage - targetEMF;

  // Galvanometer deflection in degrees (-35 to +35)
  const lengthDiff = jockeyPosCm - theoreticalBalanceCm;
  const rawDeflection = isJockeyPressed
    ? Math.max(-35, Math.min(35, lengthDiff * 1.5))
    : 0;

  const isNullBalance = isJockeyPressed && Math.abs(lengthDiff) < 0.6;

  // Add observation record
  const addObservation = () => {
    let ratioOrR = '';
    if (mode === 'compareEmf') {
      const ratio = (theoreticalL1 / theoreticalL2).toFixed(3);
      ratioOrR = `E1/E2 = ${ratio} (True: ${(e1 / e2).toFixed(3)})`;
    } else {
      const calcR = (shuntR * (theoreticalL1 - theoreticalClosedL) / theoreticalClosedL).toFixed(2);
      ratioOrR = `r = ${calcR} Ω (True: ${cellInternalR} Ω)`;
    }

    const newRecord: PotentiometerObservation = {
      srNo: observationTable.length + 1,
      mode: mode === 'compareEmf' ? 'EMF Comparison' : 'Internal Resistance',
      driverEMF,
      cell1LengthCm: parseFloat(theoreticalL1.toFixed(1)),
      cell2LengthCm: mode === 'compareEmf' ? parseFloat(theoreticalL2.toFixed(1)) : parseFloat(theoreticalClosedL.toFixed(1)),
      shuntR: mode === 'internalResistance' ? shuntR : undefined,
      calculatedRatioOrR: ratioOrR,
      status: isNullBalance ? '🎯 Null Balance' : 'Recorded'
    };

    setObservationTable([...observationTable, newRecord]);
  };

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      timeRef.current += 0.04;
      const t = timeRef.current;

      const width = canvas.width;
      const height = canvas.height;

      // Clear & Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Lab dot grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      const dotSpacing = 24;
      for (let x = 0; x < width; x += dotSpacing) {
        for (let y = 0; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bench gradient
      const benchGrad = ctx.createLinearGradient(0, 0, 0, height);
      benchGrad.addColorStop(0, 'rgba(248, 250, 252, 0.6)');
      benchGrad.addColorStop(1, 'rgba(241, 245, 249, 0.9)');
      ctx.fillStyle = benchGrad;
      ctx.fillRect(0, 0, width, height);

      // 4-Wire Potentiometer Board Geometry
      const boardLeft = 60;
      const boardRight = width - 60;
      const boardW = boardRight - boardLeft;
      const boardTop = 135;
      const boardH = 155;

      // 1. Wooden Potentiometer Board
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 8;

      const woodGrad = ctx.createLinearGradient(boardLeft, boardTop, boardLeft, boardTop + boardH);
      woodGrad.addColorStop(0, '#B45309');
      woodGrad.addColorStop(0.2, '#D97706');
      woodGrad.addColorStop(0.5, '#92400E');
      woodGrad.addColorStop(0.8, '#78350F');
      woodGrad.addColorStop(1, '#451A03');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(boardLeft, boardTop, boardW, boardH, 10);
      ctx.fill();
      ctx.restore();

      // Wood border inlay
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wood grain lines
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.2)';
      ctx.lineWidth = 0.8;
      for (let i = 1; i <= 7; i++) {
        const yg = boardTop + (boardH / 8) * i;
        ctx.beginPath();
        ctx.moveTo(boardLeft + 10, yg);
        ctx.bezierCurveTo(
          boardLeft + boardW * 0.3, yg + 2,
          boardLeft + boardW * 0.7, yg - 2,
          boardRight - 10, yg
        );
        ctx.stroke();
      }

      // 2. 4 Constantan/Manganin Wire Segments (100cm each = 400cm total)
      const scaleStartPx = boardLeft + 50;
      const scaleEndPx = boardRight - 50;
      const scaleLenPx = scaleEndPx - scaleStartPx;

      const wireYPositions = [
        boardTop + 28,
        boardTop + 58,
        boardTop + 88,
        boardTop + 118
      ];

      // Copper Connecting Strips connecting the 4 wires in series
      const drawCopperBridge = (x1: number, y1: number, y2: number) => {
        const cGrad = ctx.createLinearGradient(x1 - 8, y1, x1 + 8, y1);
        cGrad.addColorStop(0, '#FEF08A');
        cGrad.addColorStop(0.4, '#F59E0B');
        cGrad.addColorStop(1, '#B45309');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.roundRect(x1 - 7, y1 - 4, 14, y2 - y1 + 8, 3);
        ctx.fill();
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      // Right strip connecting Wire 1 and Wire 2
      drawCopperBridge(scaleEndPx + 15, wireYPositions[0], wireYPositions[1]);
      // Left strip connecting Wire 2 and Wire 3
      drawCopperBridge(scaleStartPx - 15, wireYPositions[1], wireYPositions[2]);
      // Right strip connecting Wire 3 and Wire 4
      drawCopperBridge(scaleEndPx + 15, wireYPositions[2], wireYPositions[3]);

      // Millimeter Scale Ruler along the board
      const rulerY = boardTop + 134;
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(scaleStartPx, rulerY, scaleLenPx, 14);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(scaleStartPx, rulerY, scaleLenPx, 14);

      ctx.fillStyle = '#0F172A';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';

      for (let cm = 0; cm <= 100; cm += 5) {
        const rx = scaleStartPx + (cm / 100) * scaleLenPx;
        const isTen = cm % 10 === 0;
        const markH = isTen ? 8 : 4;

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = isTen ? 1 : 0.6;
        ctx.beginPath();
        ctx.moveTo(rx, rulerY);
        ctx.lineTo(rx, rulerY + markH);
        ctx.stroke();

        if (isTen) {
          ctx.fillText(`${cm}`, rx, rulerY + 11);
        }
      }

      // Draw the 4 Stretched Wires
      wireYPositions.forEach((wy, idx) => {
        ctx.save();
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(217, 119, 6, 0.3)';
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.moveTo(scaleStartPx - 15, wy);
        ctx.lineTo(scaleEndPx + 15, wy);
        ctx.stroke();
        ctx.restore();

        // Wire range label (e.g. 0-100cm, 100-200cm, 200-300cm, 300-400cm)
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Wire ${idx + 1} (${idx * 100} - ${(idx + 1) * 100} cm)`, boardLeft + 8, wy + 3);
      });

      // 3. Locate Jockey on the corresponding wire segment
      // Segment 0: 0-100cm (left to right)
      // Segment 1: 100-200cm (right to left)
      // Segment 2: 200-300cm (left to right)
      // Segment 3: 300-400cm (right to left)
      const segIdx = Math.min(3, Math.floor(jockeyPosCm / 100));
      const segRemCm = jockeyPosCm - segIdx * 100;
      const isEvenSeg = segIdx % 2 === 0;

      const jockeyFrac = isEvenSeg ? segRemCm / 100 : 1 - segRemCm / 100;
      const jockeyPx = scaleStartPx + jockeyFrac * scaleLenPx;
      const jockeyWireY = wireYPositions[segIdx];

      // 4. Primary Driver Circuit (Top Left)
      const primaryX = 130;
      const primaryY = 60;

      // Battery Accumulator
      ctx.save();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(primaryX - 45, primaryY - 25, 90, 48, 6);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`ACCUMULATOR`, primaryX, primaryY - 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`V = ${driverEMF.toFixed(1)} V`, primaryX, primaryY + 10);
      ctx.restore();

      // Rheostat
      const rheoX = 320;
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(rheoX - 40, primaryY - 20, 80, 40, 5);
      ctx.fill();
      ctx.fillStyle = '#FDE047';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`RHEOSTAT (Rh)`, rheoX, primaryY - 4);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '9px monospace';
      ctx.fillText(`${rheostatResistance} Ω`, rheoX, primaryY + 12);
      ctx.restore();

      // Connecting wires for Primary Circuit
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      // Battery(+) to Wire 1 start (A)
      ctx.beginPath();
      ctx.moveTo(primaryX - 35, primaryY + 23);
      ctx.lineTo(scaleStartPx - 15, wireYPositions[0]);
      ctx.stroke();

      // Battery(-) to Rheostat
      ctx.beginPath();
      ctx.moveTo(primaryX + 35, primaryY);
      ctx.lineTo(rheoX - 40, primaryY);
      ctx.stroke();

      // Rheostat to Wire 4 end (B)
      ctx.strokeStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(rheoX + 40, primaryY);
      ctx.lineTo(scaleStartPx - 15, wireYPositions[3]);
      ctx.stroke();

      // 5. Sensitive Center-Zero Galvanometer (Top Right)
      const galvX = width - 150;
      const galvY = 60;
      const galvR = 34;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(galvX, galvY, galvR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Galvanometer Dial Face
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(galvX, galvY, galvR - 4, 0, Math.PI * 2);
      ctx.fill();

      // Scale Arc (-30 to +30)
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(galvX, galvY + 12, 28, -Math.PI * 0.72, -Math.PI * 0.28);
      ctx.stroke();

      // Needle ticks
      for (let gTick = -30; gTick <= 30; gTick += 10) {
        const rad = (-90 + gTick * 1.2) * (Math.PI / 180);
        const tx1 = galvX + Math.cos(rad) * 28;
        const ty1 = galvY + 12 + Math.sin(rad) * 28;
        const tx2 = galvX + Math.cos(rad) * 22;
        const ty2 = galvY + 12 + Math.sin(rad) * 22;
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 7px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('0', galvX, galvY - 14);
      ctx.fillText('30', galvX - 18, galvY - 8);
      ctx.fillText('30', galvX + 18, galvY - 8);
      ctx.fillStyle = '#0EA5E9';
      ctx.font = 'bold 8px system-ui';
      ctx.fillText('GALVANOMETER', galvX, galvY + 22);

      // Deflecting Needle
      const jitter = isJockeyPressed && !isNullBalance ? Math.sin(t * 22) * 0.35 : 0;
      const needleAngleDeg = -90 + (rawDeflection + jitter) * 1.2;
      const needleAngleRad = needleAngleDeg * (Math.PI / 180);

      ctx.strokeStyle = isNullBalance ? '#10B981' : '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(galvX, galvY + 12);
      ctx.lineTo(galvX + Math.cos(needleAngleRad) * 26, galvY + 12 + Math.sin(needleAngleRad) * 26);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(galvX, galvY + 12, 3, 0, Math.PI * 2);
      ctx.fill();

      // 6. Secondary Circuit Cells (Center Top)
      const secX = width / 2 - 20;
      const secY = 60;

      // Cell Box
      ctx.save();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(secX - 65, secY - 24, 130, 48, 6);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = activeCell === 'cell1' ? '#38BDF8' : '#F59E0B';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';

      if (mode === 'compareEmf') {
        ctx.fillText(activeCell === 'cell1' ? 'Leclanché Cell (E₁)' : 'Daniel Cell (E₂)', secX, secY - 6);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(activeCell === 'cell1' ? 'E₁ = 1.45 V' : 'E₂ = 1.08 V', secX, secY + 12);
      } else {
        ctx.fillText('Test Cell with Shunt R', secX, secY - 6);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(activeCell === 'cell1' ? 'Open Circuit (l₁)' : `Closed R = ${shuntR}Ω (l₂)`, secX, secY + 12);
      }

      // Connecting wire from Secondary Cell to Galvanometer
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(secX + 65, secY);
      ctx.lineTo(galvX - galvR, galvY);
      ctx.stroke();

      // Connecting wire from Galvanometer to Jockey
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(galvX, galvY + galvR);
      ctx.bezierCurveTo(galvX, boardTop - 10, jockeyPx, boardTop + 10, jockeyPx, jockeyWireY - 26);
      ctx.stroke();

      // 7. Brass Jockey with Slider Contact
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Handle
      const handleGrad = ctx.createLinearGradient(jockeyPx - 6, jockeyWireY - 28, jockeyPx + 6, jockeyWireY - 28);
      handleGrad.addColorStop(0, '#1E293B');
      handleGrad.addColorStop(0.5, '#475569');
      handleGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = handleGrad;
      ctx.beginPath();
      ctx.roundRect(jockeyPx - 6, jockeyWireY - 28, 12, 18, 2);
      ctx.fill();

      // Tip
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(jockeyPx - 4, jockeyWireY - 10);
      ctx.lineTo(jockeyPx + 4, jockeyWireY - 10);
      ctx.lineTo(jockeyPx + 1, jockeyWireY);
      ctx.lineTo(jockeyPx - 1, jockeyWireY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Active glow / badge
      ctx.fillStyle = isNullBalance ? '#10B981' : '#0EA5E9';
      ctx.beginPath();
      ctx.arc(jockeyPx, jockeyWireY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(jockeyPx - 26, jockeyWireY - 48, 52, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${jockeyPosCm.toFixed(1)} cm`, jockeyPx, jockeyWireY - 36);

      // 8. Canvas Status Banner
      const bannerW = 320;
      const bannerH = 34;
      const bannerX = width / 2 - bannerW / 2;
      const bannerY = 16;

      ctx.save();
      let bBg = 'rgba(241, 245, 249, 0.95)';
      let bBorder = '#CBD5E1';
      let bTitle = `Galvanometer Deflection: ${rawDeflection > 0 ? '+' : ''}${rawDeflection.toFixed(1)}°`;
      let bSub = `Slide jockey to find Null Deflection (θ = 0°)`;

      if (isNullBalance) {
        bBg = 'rgba(236, 253, 245, 0.95)';
        bBorder = '#10B981';
        bTitle = '🎯 NULL DEFLECTION ACHIEVED (θ = 0.0°)';
        bSub = `Balancing Length l = ${jockeyPosCm.toFixed(1)} cm | k = ${(potentialGradient * 1000).toFixed(2)} mV/cm`;
      } else if (Math.abs(lengthDiff) < 3) {
        bBg = 'rgba(254, 243, 199, 0.95)';
        bBorder = '#F59E0B';
        bTitle = `⚡ Near Balance (Δl = ${lengthDiff.toFixed(1)} cm)`;
        bSub = `Fine-tune jockey position to find exact null point`;
      }

      ctx.fillStyle = bBg;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
      ctx.fill();
      ctx.strokeStyle = bBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isNullBalance ? '#065F46' : Math.abs(lengthDiff) < 3 ? '#92400E' : '#0F172A';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bTitle, bannerX + bannerW / 2, bannerY + 14);

      ctx.fillStyle = isNullBalance ? '#059669' : '#64748B';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(bSub, bannerX + bannerW / 2, bannerY + 28);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    driverEMF,
    rheostatResistance,
    mode,
    activeCell,
    shuntR,
    jockeyPosCm,
    isJockeyPressed,
    potentialGradient,
    rawDeflection,
    isNullBalance,
    lengthDiff,
    e1,
    e2,
    cellInternalR,
    theoreticalBalanceCm
  ]);

  // Pointer interactions for dragging jockey
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const boardLeft = 60;
    const boardRight = canvas.width - 60;
    const scaleStartPx = boardLeft + 50;
    const scaleEndPx = boardRight - 50;
    const scaleLenPx = scaleEndPx - scaleStartPx;

    const boardTop = 135;
    const wireYPositions = [boardTop + 28, boardTop + 58, boardTop + 88, boardTop + 118];

    // Check which wire row was tapped
    let clickedRow = -1;
    for (let r = 0; r < 4; r++) {
      if (Math.abs(y - wireYPositions[r]) < 18) {
        clickedRow = r;
        break;
      }
    }

    if (clickedRow !== -1 || (y >= boardTop && y <= boardTop + 155)) {
      isDraggingJockey.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const targetRow = clickedRow !== -1 ? clickedRow : Math.min(3, Math.floor(jockeyPosCm / 100));
      const frac = Math.max(0, Math.min(1, (x - scaleStartPx) / scaleLenPx));
      const isEven = targetRow % 2 === 0;
      const wireCm = isEven ? frac * 100 : (1 - frac) * 100;
      const totalCm = Math.round((targetRow * 100 + wireCm) * 10) / 10;
      setJockeyPosCm(Math.max(0.5, Math.min(399.5, totalCm)));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDraggingJockey.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const boardLeft = 60;
    const boardRight = canvas.width - 60;
    const scaleStartPx = boardLeft + 50;
    const scaleEndPx = boardRight - 50;
    const scaleLenPx = scaleEndPx - scaleStartPx;

    const boardTop = 135;
    const wireYPositions = [boardTop + 28, boardTop + 58, boardTop + 88, boardTop + 118];

    let targetRow = Math.min(3, Math.floor(jockeyPosCm / 100));
    for (let r = 0; r < 4; r++) {
      if (Math.abs(y - wireYPositions[r]) < 16) {
        targetRow = r;
        break;
      }
    }

    const frac = Math.max(0, Math.min(1, (x - scaleStartPx) / scaleLenPx));
    const isEven = targetRow % 2 === 0;
    const wireCm = isEven ? frac * 100 : (1 - frac) * 100;
    const totalCm = Math.round((targetRow * 100 + wireCm) * 10) / 10;
    setJockeyPosCm(Math.max(0.5, Math.min(399.5, totalCm)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingJockey.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 select-none">
      {/* Simulation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Potentiometer — Comparison of EMF & Internal Resistance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Compare EMFs of two cells <span className="font-semibold text-slate-700">(E₁/E₂ = l₁/l₂)</span> and determine internal resistance <span className="font-semibold text-slate-700">r = R(l₁ - l₂)/l₂</span> with 400 cm potentiometer.
          </p>
        </div>

        {/* Experiment Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setMode('compareEmf')}
            className={`px-3 py-1.5 rounded-lg transition ${
              mode === 'compareEmf' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Comparison of EMF
          </button>
          <button
            onClick={() => setMode('internalResistance')}
            className={`px-3 py-1.5 rounded-lg transition ${
              mode === 'internalResistance' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Internal Resistance
          </button>
        </div>
      </div>

      {/* Main Simulation Stage Canvas */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={320}
          className="w-full h-auto cursor-ew-resize touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Action Controls Bar */}
        <div className="w-full bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block animate-pulse"></span>
              Slide jockey across all 4 wire segments (0 to 400 cm) to locate Null Point (θ = 0°)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setJockeyPosCm(parseFloat(theoreticalBalanceCm.toFixed(1)))}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition"
            >
              Auto-Align to Null Point
            </button>

            <button
              onClick={addObservation}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Record Reading
            </button>
          </div>
        </div>
      </div>

      {/* Parameter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Two-Way Key Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              {mode === 'compareEmf' ? 'Two-Way Key (Cell Select)' : 'Key K₂ (Shunt Circuit)'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveCell('cell1')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition ${
                  activeCell === 'cell1'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {mode === 'compareEmf' ? 'Cell 1 (1.45V)' : 'Open (l₁)'}
              </button>
              <button
                onClick={() => setActiveCell('cell2')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition ${
                  activeCell === 'cell2'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {mode === 'compareEmf' ? 'Cell 2 (1.08V)' : 'Closed (l₂)'}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active Mode:</span>
            <span className="font-semibold text-slate-800">
              {mode === 'compareEmf'
                ? activeCell === 'cell1' ? 'Leclanché Cell' : 'Daniel Cell'
                : activeCell === 'cell1' ? 'Open Circuit' : `Shunted with R=${shuntR}Ω`}
            </span>
          </div>
        </div>

        {/* Card 2: Driver EMF & Rheostat */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Driver EMF (V)
              </label>
              <span className="text-xs font-bold font-mono text-slate-800">{driverEMF.toFixed(1)} V</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="6.0"
              step="0.5"
              value={driverEMF}
              onChange={e => setDriverEMF(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />

            <div className="flex justify-between items-center mt-2 mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rheostat Rh
              </label>
              <span className="text-xs font-bold font-mono text-slate-800">{rheostatResistance} Ω</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={rheostatResistance}
              onChange={e => setRheostatResistance(parseInt(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Gradient k:</span>
            <span className="font-mono font-bold text-sky-600 text-xs">
              {(potentialGradient * 1000).toFixed(2)} mV/cm
            </span>
          </div>
        </div>

        {/* Card 3: Shunt Resistance Box (for Internal Resistance Mode) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Shunt Resistor (R)
              </label>
              <span className="text-sm font-bold font-mono text-indigo-600">{shuntR} Ω</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 5, 10, 20].map(rVal => (
                <button
                  key={rVal}
                  onClick={() => setShuntR(rVal)}
                  disabled={mode === 'compareEmf'}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    shuntR === rVal && mode === 'internalResistance'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40'
                  }`}
                >
                  {rVal}Ω
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Internal r:</span>
            <span className="font-mono font-bold text-slate-800">{cellInternalR.toFixed(1)} Ω</span>
          </div>
        </div>

        {/* Card 4: Jockey Reading & Theoretical Lengths */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jockey Position</span>
              <span className="text-sm font-mono font-bold text-sky-600">{jockeyPosCm.toFixed(1)} cm</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Wire {Math.min(4, Math.floor(jockeyPosCm / 100) + 1)} of 4
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Null Point l:</span>
              <span className="font-mono font-bold text-emerald-600">
                {theoreticalBalanceCm.toFixed(1)} cm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">l₁ (E₁) / l₂ (E₂):</span>
              <span className="font-mono font-semibold text-slate-700">
                {theoreticalL1.toFixed(1)} / {theoreticalL2.toFixed(1)} cm
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Observation Table & Data Analysis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Observation Table</h3>
            <p className="text-xs text-slate-500">
              {mode === 'compareEmf'
                ? 'Comparison of EMF of Two Primary Cells (E₁/E₂ = l₁/l₂)'
                : 'Determination of Internal Resistance of a Primary Cell (r = R(l₁ - l₂)/l₂)'}
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
            No readings recorded yet. Locate null points on the wire and click &quot;Record Reading&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Driver EMF (V)</th>
                  <th className="py-2.5 px-3">Balance Length l₁ (cm)</th>
                  <th className="py-2.5 px-3">Balance Length l₂ (cm)</th>
                  <th className="py-2.5 px-3">Shunt R (Ω)</th>
                  <th className="py-2.5 px-3">Calculated Result</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observationTable.map(row => (
                  <tr key={row.srNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.srNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{row.mode}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.driverEMF.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{row.cell1LengthCm.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-600">{row.cell2LengthCm?.toFixed(1) || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{row.shuntR ? `${row.shuntR} Ω` : '—'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.calculatedRatioOrR}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Theoretical Formula Reference */}
        <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-sky-950">
          <div>
            <div className="font-bold text-sky-900 mb-0.5">Key Potentiometer Principles:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Potential Gradient:</strong> k = V / L (Potential drop per unit length).</li>
              <li><strong>EMF Ratio:</strong> E&sub1; / E&sub2; = l&sub1; / l&sub2; (since E&sub1; = k &middot; l&sub1; and E&sub2; = k &middot; l&sub2;).</li>
              <li><strong>Internal Resistance:</strong> r = R &middot; (l&sub1; - l&sub2;) / l&sub2; where l&sub1; is open circuit length and l&sub2; is shunted length.</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Null Condition</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">E = k &middot; l</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PotentiometerLab;
