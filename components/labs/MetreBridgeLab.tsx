import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, ArrowLeftRight, Sparkles } from 'lucide-react';

interface UnknownWireSpec {
  name: string;
  material: string;
  resistivity: number; // Ohm * m
  wireLengthM: number; // m
  wireRadiusM: number; // m
  theoreticalR: number; // Ohms = rho * L / (pi * r^2)
}

const WIRE_SPECS: UnknownWireSpec[] = [
  {
    name: 'Nichrome Wire (0.4mm dia, 1.0m)',
    material: 'Nichrome',
    resistivity: 1.10e-6,
    wireLengthM: 1.0,
    wireRadiusM: 0.0002, // 0.2 mm
    theoreticalR: (1.10e-6 * 1.0) / (Math.PI * Math.pow(0.0002, 2)) // ~8.75 Ohms
  },
  {
    name: 'Constantan Wire (0.35mm dia, 1.0m)',
    material: 'Constantan',
    resistivity: 4.9e-7,
    wireLengthM: 1.0,
    wireRadiusM: 0.000175,
    theoreticalR: (4.9e-7 * 1.0) / (Math.PI * Math.pow(0.000175, 2)) // ~5.09 Ohms
  },
  {
    name: 'Manganin Wire (0.4mm dia, 0.75m)',
    material: 'Manganin',
    resistivity: 4.4e-7,
    wireLengthM: 0.75,
    wireRadiusM: 0.0002,
    theoreticalR: (4.4e-7 * 0.75) / (Math.PI * Math.pow(0.0002, 2)) // ~2.63 Ohms
  },
  {
    name: 'Unknown Alloy Wire X',
    material: 'Special Alloy',
    resistivity: 1.5e-6,
    wireLengthM: 0.8,
    wireRadiusM: 0.00018,
    theoreticalR: (1.5e-6 * 0.8) / (Math.PI * Math.pow(0.00018, 2)) // ~11.79 Ohms
  }
];

interface MetreBridgeObservation {
  srNo: number;
  knownR: number; // Ohms
  balancingLengthCm: number; // l (cm)
  hundredMinusLCm: number; // 100 - l (cm)
  calculatedX: number; // Ohms
  calcRho: number; // Ohm*m
  status: string;
}

export const MetreBridgeLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [knownR, setKnownR] = useState<number>(10); // Ohms (Resistance Box)
  const [selectedWireIdx, setSelectedWireIdx] = useState<number>(0);
  const [jockeyPosCm, setJockeyPosCm] = useState<number>(50.0); // 0 to 100 cm
  const [isJockeyPressed, setIsJockeyPressed] = useState<boolean>(true);
  const [isInterchanged, setIsInterchanged] = useState<boolean>(false); // Left/Right gap interchange
  const [observationTable, setObservationTable] = useState<MetreBridgeObservation[]>([]);

  const isDraggingJockey = useRef(false);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const activeWire = WIRE_SPECS[selectedWireIdx];
  const trueUnknownR = activeWire.theoreticalR;

  // Exact balancing length l (cm) from Wheatstone bridge equation:
  // Normal: Left gap = R, Right gap = X => R / X = l / (100 - l) => l = 100 * R / (R + X)
  // Interchanged: Left gap = X, Right gap = R => X / R = l / (100 - l) => l = 100 * X / (R + X)
  const theoreticalBalanceLengthCm = isInterchanged
    ? (100 * trueUnknownR) / (knownR + trueUnknownR)
    : (100 * knownR) / (knownR + trueUnknownR);

  // Galvanometer deflection angle (-35 to +35 degrees)
  // If jockey is at balance point, deflection = 0.
  // Deflection is proportional to bridge unbalance voltage:
  // V_unbalance ~ (l / 100) - (R / (R + X))
  const lengthDiff = jockeyPosCm - theoreticalBalanceLengthCm;
  const rawDeflection = isJockeyPressed
    ? Math.max(-35, Math.min(35, lengthDiff * 1.8))
    : 0;

  const isNullBalance = isJockeyPressed && Math.abs(lengthDiff) < 0.35;

  // Calculated unknown resistance from current jockey position
  const clampedJockeyCm = Math.max(0.5, Math.min(99.5, jockeyPosCm));
  const currentCalculatedX = isInterchanged
    ? (knownR * clampedJockeyCm) / (100 - clampedJockeyCm)
    : (knownR * (100 - clampedJockeyCm)) / clampedJockeyCm;

  // Calculated resistivity rho = (pi * r^2 * X) / L_wire
  const wireArea = Math.PI * Math.pow(activeWire.wireRadiusM, 2);
  const calculatedResistivity = (wireArea * currentCalculatedX) / activeWire.wireLengthM;

  // Record observation
  const addObservation = () => {
    const l = parseFloat(clampedJockeyCm.toFixed(1));
    const hundredMinusL = parseFloat((100 - l).toFixed(1));
    const calcX = parseFloat(currentCalculatedX.toFixed(2));
    const calcRho = parseFloat(calculatedResistivity.toExponential(3));

    const newRecord: MetreBridgeObservation = {
      srNo: observationTable.length + 1,
      knownR,
      balancingLengthCm: l,
      hundredMinusLCm: hundredMinusL,
      calculatedX: calcX,
      calcRho,
      status: isNullBalance ? '🎯 Null Balance (Zero Deflection)' : Math.abs(lengthDiff) < 2 ? 'Near Balance' : 'Off Balance'
    };

    setObservationTable([...observationTable, newRecord]);
  };

  // Render Metre Bridge Canvas
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

      // 1. Lab Bench Background
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

      // Bench gradient
      const benchGrad = ctx.createLinearGradient(0, 0, 0, height);
      benchGrad.addColorStop(0, 'rgba(248, 250, 252, 0.6)');
      benchGrad.addColorStop(1, 'rgba(241, 245, 249, 0.9)');
      ctx.fillStyle = benchGrad;
      ctx.fillRect(0, 0, width, height);

      // Metre Bridge Dimensions
      const boardLeft = 60;
      const boardRight = width - 60;
      const boardW = boardRight - boardLeft;
      const boardTop = 150;
      const boardH = 130;

      // 2. Heavy Polished Teakwood Baseboard
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

      // Board border inlay
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wood grain lines
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.2)';
      ctx.lineWidth = 0.9;
      for (let i = 1; i <= 6; i++) {
        const yg = boardTop + (boardH / 7) * i;
        ctx.beginPath();
        ctx.moveTo(boardLeft + 10, yg);
        ctx.bezierCurveTo(
          boardLeft + boardW * 0.3, yg + 3,
          boardLeft + boardW * 0.7, yg - 3,
          boardRight - 10, yg
        );
        ctx.stroke();
      }

      // 3. Thick Brass / Copper Strips (L-shaped Left Strip, Central Strip, L-shaped Right Strip)
      const stripH = 18;
      const stripY = boardTop + 14;

      const drawBrassStrip = (sx: number, sy: number, sw: number, sh: number) => {
        const brassGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
        brassGrad.addColorStop(0, '#FEF08A');
        brassGrad.addColorStop(0.3, '#F59E0B');
        brassGrad.addColorStop(0.7, '#D97706');
        brassGrad.addColorStop(1, '#78350F');
        ctx.fillStyle = brassGrad;
        ctx.beginPath();
        ctx.roundRect(sx, sy, sw, sh, 3);
        ctx.fill();
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      const drawBrassScrew = (bx: number, by: number) => {
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#451A03';
        ctx.fillRect(bx - 3, by - 0.75, 6, 1.5);
      };

      // Scale range for wire
      const scaleStartPx = boardLeft + 45;
      const scaleEndPx = boardRight - 45;
      const scaleLenPx = scaleEndPx - scaleStartPx;

      const wireY = boardTop + 88;

      // Left L-Strip: horizontal part + vertical drop to wire left
      drawBrassStrip(boardLeft + 20, stripY, 110, stripH);
      drawBrassStrip(boardLeft + 20, stripY, 26, wireY - stripY + 6);
      drawBrassScrew(boardLeft + 33, wireY);
      drawBrassScrew(boardLeft + 110, stripY + stripH / 2);

      // Central Strip: middle with terminals for Left Gap, Right Gap, and Galvanometer
      const centralW = boardW * 0.42;
      const centralX = boardLeft + (boardW - centralW) / 2;
      drawBrassStrip(centralX, stripY, centralW, stripH);
      drawBrassScrew(centralX + 15, stripY + stripH / 2); // Left gap terminal
      drawBrassScrew(centralX + centralW / 2, stripY + stripH / 2); // Center D terminal (galvanometer)
      drawBrassScrew(centralX + centralW - 15, stripY + stripH / 2); // Right gap terminal

      // Right L-Strip: horizontal part + vertical drop to wire right
      const rightStripX = boardRight - 130;
      drawBrassStrip(rightStripX, stripY, 110, stripH);
      drawBrassStrip(boardRight - 46, stripY, 26, wireY - stripY + 6);
      drawBrassScrew(boardRight - 33, wireY);
      drawBrassScrew(rightStripX + 15, stripY + stripH / 2);

      // 4. Resistance Box in Left Gap & Unknown Resistor in Right Gap (or interchanged)
      const leftGapMidX = (boardLeft + 110 + centralX + 15) / 2;
      const rightGapMidX = (centralX + centralW - 15 + rightStripX + 15) / 2;

      const leftIsR = !isInterchanged;

      // Component in Left Gap
      const comp1X = leftGapMidX;
      const comp1Y = boardTop - 45;

      // Draw Resistance Box
      const drawResistanceBox = (cx: number, cy: number, val: number) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        // Wooden Box
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.roundRect(cx - 45, cy - 25, 90, 50, 6);
        ctx.fill();
        ctx.restore();

        // Top ebonite / brass plate
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.roundRect(cx - 41, cy - 21, 82, 42, 4);
        ctx.fill();

        // Brass plugs
        for (let p = -3; p <= 3; p += 2) {
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(cx + p * 11, cy - 6, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Label
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`R-BOX: ${val} Ω`, cx, cy + 12);

        // Connecting Wires to gap terminals
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 35, cy + 25);
        ctx.lineTo(boardLeft + 110, stripY + stripH / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + 35, cy + 25);
        ctx.lineTo(centralX + 15, stripY + stripH / 2);
        ctx.stroke();
      };

      // Draw Unknown Resistor Coil
      const drawUnknownResistor = (cx: number, cy: number, wireName: string, rVal: number) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        // Bakelite reel
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(cx - 40, cy - 25, 80, 50, 6);
        ctx.fill();
        ctx.restore();

        // Copper wire coil loops
        ctx.strokeStyle = '#EA580C';
        ctx.lineWidth = 2;
        for (let loop = -2; loop <= 2; loop++) {
          ctx.beginPath();
          ctx.ellipse(cx, cy + loop * 5, 24, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UNKNOWN (X)', cx, cy - 10);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '8px monospace';
        ctx.fillText(`${wireName.split(' ')[0]} Coil`, cx, cy + 16);

        // Connecting wires to gap terminals
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy + 25);
        ctx.lineTo(centralX + centralW - 15, stripY + stripH / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + 30, cy + 25);
        ctx.lineTo(rightStripX + 15, stripY + stripH / 2);
        ctx.stroke();
      };

      if (leftIsR) {
        drawResistanceBox(comp1X, comp1Y, knownR);
        drawUnknownResistor(rightGapMidX, comp1Y, activeWire.material, trueUnknownR);
      } else {
        drawUnknownResistor(comp1X, comp1Y, activeWire.material, trueUnknownR);
        drawResistanceBox(rightGapMidX, comp1Y, knownR);
      }

      // 5. Millimeter Ruler (0 to 100 cm)
      const rulerY = wireY + 8;
      ctx.fillStyle = '#FEF3C7'; // Pale yellow ruler
      ctx.fillRect(scaleStartPx - 10, rulerY, scaleLenPx + 20, 18);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(scaleStartPx - 10, rulerY, scaleLenPx + 20, 18);

      ctx.fillStyle = '#0F172A';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';

      for (let cm = 0; cm <= 100; cm += 2) {
        const rx = scaleStartPx + (cm / 100) * scaleLenPx;
        const isTen = cm % 10 === 0;
        const isFive = cm % 5 === 0;
        const markH = isTen ? 9 : isFive ? 5 : 3;

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = isTen ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(rx, rulerY);
        ctx.lineTo(rx, rulerY + markH);
        ctx.stroke();

        if (isTen) {
          ctx.fillText(`${cm}`, rx, rulerY + 14);
        }
      }

      // 6. 100 cm Constantan/Manganin Stretched Wire
      ctx.save();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(217, 119, 6, 0.4)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(scaleStartPx - 12, wireY);
      ctx.lineTo(scaleEndPx + 12, wireY);
      ctx.stroke();
      ctx.restore();

      // 7. Sensitive Center-Zero Galvanometer
      const galvX = width / 2;
      const galvY = boardTop - 45;
      const galvR = 34;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      // Round Galvanometer casing
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

      // Center-Zero Scale Arc (-30 to +30)
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(galvX, galvY + 12, 28, -Math.PI * 0.72, -Math.PI * 0.28);
      ctx.stroke();

      // Scale Ticks on Galvanometer
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

      // Galvanometer Deflecting Needle (with gentle realistic jitter)
      const jitter = isJockeyPressed && !isNullBalance ? Math.sin(t * 20) * 0.3 : 0;
      const needleAngleDeg = -90 + (rawDeflection + jitter) * 1.2;
      const needleAngleRad = needleAngleDeg * (Math.PI / 180);

      ctx.strokeStyle = isNullBalance ? '#10B981' : '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(galvX, galvY + 12);
      ctx.lineTo(galvX + Math.cos(needleAngleRad) * 26, galvY + 12 + Math.sin(needleAngleRad) * 26);
      ctx.stroke();

      // Center pivot
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(galvX, galvY + 12, 3, 0, Math.PI * 2);
      ctx.fill();

      // Connecting Wire from Central Terminal D to Galvanometer Top
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centralX + centralW / 2, stripY + stripH / 2);
      ctx.lineTo(galvX, galvY + galvR);
      ctx.stroke();

      // 8. Jockey & Sliding Contact
      const jockeyPx = scaleStartPx + (clampedJockeyCm / 100) * scaleLenPx;
      const jockeyTipY = wireY;

      // Connecting Wire from Galvanometer to Jockey
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(galvX, galvY - galvR);
      ctx.bezierCurveTo(galvX, boardTop - 60, jockeyPx, boardTop - 20, jockeyPx, jockeyTipY - 32);
      ctx.stroke();

      // Draw Brass Knife-Edge Jockey
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Jockey Handle (Insulated Ebonite grip)
      const handleGrad = ctx.createLinearGradient(jockeyPx - 7, jockeyTipY - 36, jockeyPx + 7, jockeyTipY - 36);
      handleGrad.addColorStop(0, '#1E293B');
      handleGrad.addColorStop(0.5, '#475569');
      handleGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = handleGrad;
      ctx.beginPath();
      ctx.roundRect(jockeyPx - 7, jockeyTipY - 36, 14, 22, 3);
      ctx.fill();

      // Brass knife-edge wedge
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(jockeyPx - 5, jockeyTipY - 14);
      ctx.lineTo(jockeyPx + 5, jockeyTipY - 14);
      ctx.lineTo(jockeyPx + 1, jockeyTipY);
      ctx.lineTo(jockeyPx - 1, jockeyTipY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Jockey Active Glow / Contact Point Indicator
      if (isJockeyPressed) {
        ctx.fillStyle = isNullBalance ? '#10B981' : '#0EA5E9';
        ctx.beginPath();
        ctx.arc(jockeyPx, jockeyTipY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Jockey badge / position tooltip
      ctx.fillStyle = isNullBalance ? '#10B981' : '#0EA5E9';
      ctx.beginPath();
      ctx.roundRect(jockeyPx - 28, jockeyTipY - 58, 56, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`l = ${clampedJockeyCm.toFixed(1)} cm`, jockeyPx, jockeyTipY - 46);

      // 9. Null Balance Status Indicator Banner in Canvas
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
        bTitle = '🎯 NULL POINT FOUND (θ = 0.0°) — WHEATSTONE BALANCED';
        bSub = `l = ${clampedJockeyCm.toFixed(1)} cm | (100 - l) = ${(100 - clampedJockeyCm).toFixed(1)} cm | X = ${currentCalculatedX.toFixed(2)} Ω`;
      } else if (Math.abs(lengthDiff) < 2) {
        bBg = 'rgba(254, 243, 199, 0.95)';
        bBorder = '#F59E0B';
        bTitle = `⚡ Near Balance Point (Δl = ${lengthDiff.toFixed(1)} cm)`;
        bSub = `Fine-tune jockey position to achieve null point`;
      }

      ctx.fillStyle = bBg;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
      ctx.fill();
      ctx.strokeStyle = bBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isNullBalance ? '#065F46' : Math.abs(lengthDiff) < 2 ? '#92400E' : '#0F172A';
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
    knownR,
    selectedWireIdx,
    jockeyPosCm,
    isJockeyPressed,
    isInterchanged,
    clampedJockeyCm,
    currentCalculatedX,
    calculatedResistivity,
    trueUnknownR,
    activeWire,
    theoreticalBalanceLengthCm,
    lengthDiff,
    rawDeflection,
    isNullBalance
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
    const scaleStartPx = boardLeft + 45;
    const scaleEndPx = boardRight - 45;
    const scaleLenPx = scaleEndPx - scaleStartPx;

    const jockeyPx = scaleStartPx + (clampedJockeyCm / 100) * scaleLenPx;
    const wireY = 150 + 88;

    // If near jockey or clicking along the wire/ruler area
    if (Math.abs(x - jockeyPx) < 30 || (y >= wireY - 40 && y <= wireY + 40)) {
      isDraggingJockey.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const frac = (x - scaleStartPx) / scaleLenPx;
      const newCm = Math.max(0.5, Math.min(99.5, Math.round(frac * 1000) / 10));
      setJockeyPosCm(newCm);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDraggingJockey.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;

    const boardLeft = 60;
    const boardRight = canvas.width - 60;
    const scaleStartPx = boardLeft + 45;
    const scaleEndPx = boardRight - 45;
    const scaleLenPx = scaleEndPx - scaleStartPx;

    const frac = (x - scaleStartPx) / scaleLenPx;
    const newCm = Math.max(0.5, Math.min(99.5, Math.round(frac * 1000) / 10));
    setJockeyPosCm(newCm);
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
            Metre Bridge — Unknown Resistance & Specific Resistance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Determine unknown resistance <span className="font-semibold text-slate-700">X = R(100 - l)/l</span> and specific resistance (resistivity) <span className="font-semibold text-slate-700">ρ = (πr²X) / L</span> using Wheatstone bridge principle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInterchanged(!isInterchanged)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              isInterchanged
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Interchange R-Box and Unknown Resistor to eliminate end errors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {isInterchanged ? 'Gaps: Interchanged (X in Left, R in Right)' : 'Gaps: Normal (R in Left, X in Right)'}
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
              Drag or tap the jockey along the 100 cm wire to find Null Balance (θ = 0°)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setJockeyPosCm(parseFloat(theoreticalBalanceLengthCm.toFixed(1)))}
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
        {/* Card 1: Known Resistance (R-Box) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Known Resistance (R)
              </label>
              <span className="text-sm font-bold font-mono text-sky-600">{knownR} Ω</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[1, 2, 5, 8, 10, 15, 20, 50].map(val => (
                <button
                  key={val}
                  onClick={() => setKnownR(val)}
                  className={`py-1 rounded-lg text-xs font-bold transition ${
                    knownR === val
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {val}Ω
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Left Gap:</span>
            <span className="font-semibold text-slate-800">{isInterchanged ? 'Unknown (X)' : `R-Box (${knownR}Ω)`}</span>
          </div>
        </div>

        {/* Card 2: Unknown Wire Coil Material */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Unknown Wire Sample
            </label>
            <select
              value={selectedWireIdx}
              onChange={e => setSelectedWireIdx(parseInt(e.target.value))}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {WIRE_SPECS.map((spec, idx) => (
                <option key={spec.name} value={idx}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Wire Length L:</span>
            <span className="font-mono font-bold text-slate-800">{activeWire.wireLengthM * 100} cm</span>
          </div>
        </div>

        {/* Card 3: Jockey Position & Balancing Lengths */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Balancing Length (l)</span>
              <span className="text-sm font-mono font-bold text-sky-600">{clampedJockeyCm.toFixed(1)} cm</span>
            </div>
            <div className="text-[11px] text-slate-500">
              (100 - l) = {(100 - clampedJockeyCm).toFixed(1)} cm
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Target Null l:</span>
            <span className="font-mono font-semibold text-emerald-600">
              {theoreticalBalanceLengthCm.toFixed(1)} cm
            </span>
          </div>
        </div>

        {/* Card 4: Live Calculated Unknown Resistance X & Resistivity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Calculated X</span>
              <span className="text-sm font-mono font-bold text-indigo-600">{currentCalculatedX.toFixed(2)} Ω</span>
            </div>
            <div className="text-[10px] text-slate-500">
              True X: ~{trueUnknownR.toFixed(2)} Ω
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Resistivity ρ:</span>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {calculatedResistivity.toExponential(2)} Ω·m
            </span>
          </div>
        </div>
      </div>

      {/* Observation Table & Data Analysis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Observation Table</h3>
            <p className="text-xs text-slate-500">
              Measurement of Unknown Resistance and Specific Resistance using Wheatstone Bridge condition
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
            No readings recorded yet. Slide jockey to null point and click &quot;Record Reading&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Known R (Ω)</th>
                  <th className="py-2.5 px-3">Balancing Length l (cm)</th>
                  <th className="py-2.5 px-3">100 - l (cm)</th>
                  <th className="py-2.5 px-3">Unknown X = R(100-l)/l (Ω)</th>
                  <th className="py-2.5 px-3">Resistivity ρ (Ω·m)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observationTable.map(row => (
                  <tr key={row.srNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.srNo}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{row.knownR}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.balancingLengthCm.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.hundredMinusLCm.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.calculatedX.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{row.calcRho.toExponential(3)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.status.includes('Null')
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status.includes('Near')
                            ? 'bg-amber-100 text-amber-800'
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

        {/* Theoretical Formula Reference */}
        <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-sky-950">
          <div>
            <div className="font-bold text-sky-900 mb-0.5">Formulae & Principles:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Wheatstone Principle:</strong> When no current flows through galvanometer (&theta; = 0&deg;), P/Q = R/S &rArr; R/X = l / (100 - l).</li>
              <li><strong>Unknown Resistance:</strong> X = R &middot; (100 - l) / l (&Omega;).</li>
              <li><strong>Specific Resistance (Resistivity):</strong> &rho; = (X &middot; &pi; r&sup2;) / L (&Omega;&middot;m).</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Wheatstone Condition</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">X = R (100 - l) / l</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetreBridgeLab;
