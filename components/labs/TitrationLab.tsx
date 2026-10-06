import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Play, Pause, Droplets, Sparkles, Activity } from 'lucide-react';

interface AcidSample {
  name: string;
  trueMolarity: number; // M
  volumeMl: number; // mL pipetted into flask
}

const ACID_SAMPLES: AcidSample[] = [
  { name: 'Standard HCl Solution (0.100 M)', trueMolarity: 0.100, volumeMl: 10.0 },
  { name: 'HCl Unknown Sample A (~0.092 M)', trueMolarity: 0.092, volumeMl: 10.0 },
  { name: 'HCl Unknown Sample B (~0.108 M)', trueMolarity: 0.108, volumeMl: 10.0 },
  { name: 'HCl Unknown Sample C (~0.125 M)', trueMolarity: 0.125, volumeMl: 10.0 }
];

interface TitrationObservation {
  srNo: number;
  pipetteVolMl: number; // V1 (mL)
  initialBuretteMl: number; // mL
  finalBuretteMl: number; // mL
  volumeUsedMl: number; // V2 (mL)
  calculatedMolarity: number; // M
  strengthGPerL: number; // g/L
  status: string;
}

export const TitrationLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number>(0);
  const [naohMolarity, setNaohMolarity] = useState<number>(0.100); // Standard NaOH 0.1 M
  const [pipetteVolume, setPipetteVolume] = useState<number>(10.0); // 10 mL or 20 mL
  
  // Burette volume state: volume of NaOH dispensed (mL)
  const [dispensedMl, setDispensedMl] = useState<number>(0.0);
  const [initialReadingMl, setInitialReadingMl] = useState<number>(0.0);
  
  // Flow controls
  const [flowRate, setFlowRate] = useState<'off' | 'slow' | 'fast'>('off');
  const [isSwirling, setIsSwirling] = useState<boolean>(true);
  const [indicatorAdded, setIndicatorAdded] = useState<boolean>(true);
  
  const [observationTable, setObservationTable] = useState<TitrationObservation[]>([]);

  const activeSample = ACID_SAMPLES[selectedSampleIdx];
  const acidMolarity = activeSample.trueMolarity;
  
  // Exact theoretical equivalence point: M1 * V1 = M2 * V2 => V2 = (M1 * V1) / M2
  const theoreticalEndpointMl = (acidMolarity * pipetteVolume) / naohMolarity;

  // Real-time chemistry engine: Calculate pH of mixture
  // Acid moles: n_acid = M_acid * V_acid (moles)
  // Base added moles: n_base = M_base * V_dispensed (moles)
  const totalVolumeL = (pipetteVolume + dispensedMl) / 1000;
  const molesAcid = acidMolarity * (pipetteVolume / 1000);
  const molesBase = naohMolarity * (dispensedMl / 1000);

  let currentPh = 1.0;
  if (molesBase < molesAcid) {
    // Excess H+
    const excessH = (molesAcid - molesBase) / totalVolumeL;
    currentPh = Math.max(1.0, -Math.log10(Math.max(1e-7, excessH)));
  } else if (Math.abs(molesBase - molesAcid) < 1e-6) {
    // Exact neutral equivalence point
    currentPh = 7.0;
  } else {
    // Excess OH-
    const excessOH = (molesBase - molesAcid) / totalVolumeL;
    const pOH = -Math.log10(Math.max(1e-7, excessOH));
    currentPh = Math.min(13.5, 14.0 - pOH);
  }

  // Phenolphthalein color equilibrium:
  // pH < 8.2: Colorless
  // 8.2 <= pH <= 10.0: Faint pink (End point)
  // pH > 10.0: Deep magenta pink
  const isFaintPinkEndpoint = currentPh >= 8.2 && currentPh <= 10.0;
  const isOverTitrated = currentPh > 10.0;

  // Single drop addition (0.05 mL per drop)
  const handleAddDrop = () => {
    setDispensedMl(prev => Math.min(50.0, Math.round((prev + 0.05) * 100) / 100));
  };

  // Reset current titration trial
  const handleResetTitration = () => {
    setDispensedMl(0.0);
    setInitialReadingMl(0.0);
    setFlowRate('off');
  };

  // Record observation row
  const addObservation = () => {
    const finalReading = Math.round((initialReadingMl + dispensedMl) * 100) / 100;
    const volUsed = Math.round(dispensedMl * 100) / 100;
    
    // M1 = (M2 * V2) / V1
    const calcMolarity = volUsed > 0 ? (naohMolarity * volUsed) / pipetteVolume : 0;
    // Strength = Molarity * Molar Mass of HCl (36.46 g/mol)
    const strength = calcMolarity * 36.46;

    const newRecord: TitrationObservation = {
      srNo: observationTable.length + 1,
      pipetteVolMl: pipetteVolume,
      initialBuretteMl: initialReadingMl,
      finalBuretteMl: finalReading,
      volumeUsedMl: volUsed,
      calculatedMolarity: parseFloat(calcMolarity.toFixed(4)),
      strengthGPerL: parseFloat(strength.toFixed(2)),
      status: isFaintPinkEndpoint
        ? '🎯 Perfect Endpoint (Faint Pink)'
        : isOverTitrated
        ? '⚠️ Over-Titrated (Deep Pink)'
        : 'Incomplete (Colorless)'
    };

    setObservationTable([...observationTable, newRecord]);
  };

  // Continuous flow loop
  useEffect(() => {
    if (flowRate === 'off') return;

    const intervalMs = 60;
    const rateMlPerSec = flowRate === 'slow' ? 0.25 : 1.2;
    const incrementPerTick = (rateMlPerSec * intervalMs) / 1000;

    const timer = setInterval(() => {
      setDispensedMl(prev => {
        if (prev >= 50.0) {
          setFlowRate('off');
          return 50.0;
        }
        return Math.min(50.0, prev + incrementPerTick);
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [flowRate]);

  // Render Titration Apparatus Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.05;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Lab bench background
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

      // Bench subtle gradient
      const benchGrad = ctx.createLinearGradient(0, 0, 0, height);
      benchGrad.addColorStop(0, 'rgba(248, 250, 252, 0.6)');
      benchGrad.addColorStop(1, 'rgba(241, 245, 249, 0.9)');
      ctx.fillStyle = benchGrad;
      ctx.fillRect(0, 0, width, height);

      const apparatusX = width * 0.42;

      // 2. Retort Stand & Chrome Rod
      const standBaseX = apparatusX - 70;
      const standBaseY = height - 25;
      const rodX = standBaseX + 25;

      // Heavy cast iron retort stand base
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(standBaseX - 35, standBaseY, 150, 16, 4);
      ctx.fill();
      ctx.restore();

      // White Glazed Porcelain Contrast Tile under the conical flask
      const tileX = apparatusX - 45;
      const tileY = standBaseY - 4;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(tileX, tileY, 90, 8, 2);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Vertical Chrome Rod
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rodX, standBaseY);
      ctx.lineTo(rodX, 35);
      ctx.stroke();

      // Burette Clamps (Dual Clamp holding burette)
      const clamp1Y = 70;
      const clamp2Y = 160;
      [clamp1Y, clamp2Y].forEach(cy => {
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.roundRect(rodX - 6, cy - 8, 12, 16, 2);
        ctx.fill();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rodX, cy);
        ctx.lineTo(apparatusX, cy);
        ctx.stroke();

        // Rubber-jawed clamp ring
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(apparatusX, cy, 11, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      });

      // 3. 50 mL Glass Graduated Burette
      const buretteW = 14;
      const buretteTopY = 30;
      const buretteBottomY = 200;
      const buretteLen = buretteBottomY - buretteTopY;

      ctx.save();
      // Glass tube body with highlights
      const glassGrad = ctx.createLinearGradient(apparatusX - buretteW / 2, 0, apparatusX + buretteW / 2, 0);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      glassGrad.addColorStop(0.2, 'rgba(224, 242, 254, 0.4)');
      glassGrad.addColorStop(0.8, 'rgba(186, 230, 253, 0.3)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

      ctx.fillStyle = glassGrad;
      ctx.fillRect(apparatusX - buretteW / 2, buretteTopY, buretteW, buretteLen);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1;
      ctx.strokeRect(apparatusX - buretteW / 2, buretteTopY, buretteW, buretteLen);

      // Liquid in Burette (Standard 0.1M NaOH - clear solution)
      const currentReading = initialReadingMl + dispensedMl;
      const liquidLevelFrac = Math.min(1.0, currentReading / 50.0);
      const meniscusY = buretteTopY + liquidLevelFrac * buretteLen;

      if (meniscusY < buretteBottomY) {
        ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
        ctx.fillRect(apparatusX - buretteW / 2 + 1, meniscusY, buretteW - 2, buretteBottomY - meniscusY);

        // Concave liquid meniscus line
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(apparatusX, meniscusY, buretteW / 2 - 1, 2.5, 0, 0, Math.PI);
        ctx.stroke();
      }

      // Burette Scale Markings (0 to 50 mL)
      ctx.fillStyle = '#0F172A';
      ctx.font = '6px monospace';
      ctx.textAlign = 'right';

      for (let ml = 0; ml <= 50; ml += 5) {
        const markY = buretteTopY + (ml / 50) * buretteLen;
        const isTen = ml % 10 === 0;
        const markW = isTen ? 7 : 4;

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = isTen ? 1 : 0.6;
        ctx.beginPath();
        ctx.moveTo(apparatusX + buretteW / 2, markY);
        ctx.lineTo(apparatusX + buretteW / 2 - markW, markY);
        ctx.stroke();

        if (isTen) {
          ctx.fillText(`${ml}`, apparatusX - buretteW / 2 - 3, markY + 2);
        }
      }
      ctx.restore();

      // 4. Burette Stopcock Tap (Valve)
      const tapY = buretteBottomY + 8;
      ctx.save();
      // Glass nozzle leading to stopcock
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(apparatusX, buretteBottomY);
      ctx.lineTo(apparatusX, tapY);
      ctx.stroke();

      // Teflon Stopcock Body
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.roundRect(apparatusX - 8, tapY - 5, 16, 10, 2);
      ctx.fill();

      // Stopcock Rotating Handle
      const handleRot = flowRate === 'off' ? 0 : flowRate === 'slow' ? Math.PI / 4 : Math.PI / 2;
      ctx.translate(apparatusX, tapY);
      ctx.rotate(handleRot);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.roundRect(-12, -3, 24, 6, 2);
      ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Burette Jet Tip
      const tipBottomY = tapY + 18;
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(apparatusX, tapY + 5);
      ctx.lineTo(apparatusX, tipBottomY);
      ctx.stroke();

      // 5. Droplet Animation & Fluid Fall into Flask
      if (flowRate !== 'off' || (t % 1 < 0.2 && flowRate === 'slow')) {
        const dropY = tipBottomY + ((t * 60) % 35);
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.ellipse(apparatusX, dropY, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. 250 mL Conical (Erlenmeyer) Flask
      const flaskNeckTopY = tipBottomY + 12;
      const flaskNeckH = 25;
      const flaskBaseY = tileY;
      const flaskBaseW = 86;
      const flaskNeckW = 24;

      ctx.save();
      // Glass flask outline
      ctx.beginPath();
      ctx.moveTo(apparatusX - flaskNeckW / 2, flaskNeckTopY);
      ctx.lineTo(apparatusX + flaskNeckW / 2, flaskNeckTopY);
      ctx.lineTo(apparatusX + flaskNeckW / 2, flaskNeckTopY + flaskNeckH);
      ctx.lineTo(apparatusX + flaskBaseW / 2, flaskBaseY);
      ctx.lineTo(apparatusX - flaskBaseW / 2, flaskBaseY);
      ctx.lineTo(apparatusX - flaskNeckW / 2, flaskNeckTopY + flaskNeckH);
      ctx.closePath();

      // Glass shine & shading
      const flaskGrad = ctx.createLinearGradient(apparatusX - flaskBaseW / 2, 0, apparatusX + flaskBaseW / 2, 0);
      flaskGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      flaskGrad.addColorStop(0.2, 'rgba(224, 242, 254, 0.2)');
      flaskGrad.addColorStop(0.8, 'rgba(186, 230, 253, 0.15)');
      flaskGrad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
      ctx.fillStyle = flaskGrad;
      ctx.fill();

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 7. Solution in Conical Flask & Color Transition
      const liquidH = 34 + (dispensedMl / 50) * 16;
      const liquidTopY = flaskBaseY - liquidH;

      // Color computation based on pH & indicator
      let solR = 240, solG = 249, solB = 255, solA = 0.4; // Initial transparent/watery acid

      if (indicatorAdded) {
        if (currentPh < 8.2) {
          // Colorless transparent (faint blue glass refraction)
          solR = 240; solG = 249; solB = 255; solA = 0.35;
        } else if (currentPh <= 10.0) {
          // Endpoint: Faint, delicate persistent pink!
          solR = 244; solG = 114; solB = 182; solA = 0.55;
        } else {
          // Over-titrated: Deep magenta/dark pink
          solR = 219; solG = 39; solB = 119; solA = 0.85;
        }
      }

      // Swirling liquid vortex animation
      const swirlOffset = isSwirling ? Math.sin(t * 12) * 1.5 : 0;

      // Clip inside flask base region
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(apparatusX - flaskBaseW / 2 + 3, flaskBaseY - 2);
      ctx.lineTo(apparatusX + flaskBaseW / 2 - 3, flaskBaseY - 2);
      ctx.lineTo(apparatusX + flaskBaseW * 0.35, liquidTopY);
      ctx.lineTo(apparatusX - flaskBaseW * 0.35, liquidTopY);
      ctx.closePath();

      ctx.fillStyle = `rgba(${solR}, ${solG}, ${solB}, ${solA})`;
      ctx.fill();

      // Liquid surface meniscus
      ctx.strokeStyle = `rgba(${solR - 20}, ${solG - 20}, ${solB - 20}, 0.8)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(apparatusX + swirlOffset, liquidTopY, flaskBaseW * 0.35, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Flask Volume Label
      ctx.fillStyle = '#64748B';
      ctx.font = '8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${pipetteVolume} mL HCl`, apparatusX, flaskBaseY - 10);
      ctx.restore();

      // 8. Live Reading Badges in Canvas
      // Burette Reading Magnifier Callout
      const magX = apparatusX + 75;
      const magY = meniscusY;
      ctx.save();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(magX, Math.max(30, Math.min(height - 100, magY - 18)), 105, 36, 6);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentReading.toFixed(2)} mL`, magX + 52, Math.max(30, Math.min(height - 100, magY - 18)) + 16);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '9px system-ui';
      ctx.fillText(`NaOH Dispensed`, magX + 52, Math.max(30, Math.min(height - 100, magY - 18)) + 28);

      // Connecting pointer line from burette meniscus to callout
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(apparatusX + buretteW / 2, meniscusY);
      ctx.lineTo(magX, Math.max(30, Math.min(height - 100, magY)));
      ctx.stroke();
      ctx.restore();

      // 9. Status Banner at Top of Canvas
      const bannerW = 320;
      const bannerH = 34;
      const bannerX = width / 2 - bannerW / 2;
      const bannerY = 16;

      ctx.save();
      let bBg = 'rgba(241, 245, 249, 0.95)';
      let bBorder = '#CBD5E1';
      let bTitle = `pH = ${currentPh.toFixed(2)} | Colorless Acidic Solution`;
      let bSub = `Add NaOH drop-by-drop until faint pink persists`;

      if (isFaintPinkEndpoint) {
        bBg = 'rgba(253, 242, 248, 0.95)';
        bBorder = '#EC4899';
        bTitle = `🎯 ENDPOINT REACHED! (pH = ${currentPh.toFixed(2)})`;
        bSub = `Faint, persistent pink color obtained (${dispensedMl.toFixed(2)} mL)`;
      } else if (isOverTitrated) {
        bBg = 'rgba(254, 226, 226, 0.95)';
        bBorder = '#EF4444';
        bTitle = `⚠️ OVER-TITRATED! (pH = ${currentPh.toFixed(2)})`;
        bSub = `Deep pink color (excess NaOH added: ${dispensedMl.toFixed(2)} mL)`;
      } else if (Math.abs(dispensedMl - theoreticalEndpointMl) < 1.0) {
        bBg = 'rgba(254, 243, 199, 0.95)';
        bBorder = '#F59E0B';
        bTitle = `⚡ Near Endpoint (pH = ${currentPh.toFixed(2)})`;
        bSub = `Swirl flask carefully and add drop-by-drop (0.05 mL)`;
      }

      ctx.fillStyle = bBg;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
      ctx.fill();
      ctx.strokeStyle = bBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isFaintPinkEndpoint ? '#BE185D' : isOverTitrated ? '#B91C1C' : '#0F172A';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bTitle, bannerX + bannerW / 2, bannerY + 14);

      ctx.fillStyle = isFaintPinkEndpoint ? '#DB2777' : '#64748B';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(bSub, bannerX + bannerW / 2, bannerY + 28);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    dispensedMl,
    initialReadingMl,
    flowRate,
    isSwirling,
    indicatorAdded,
    currentPh,
    pipetteVolume,
    isFaintPinkEndpoint,
    isOverTitrated,
    theoreticalEndpointMl
  ]);

  // Render Real-Time Titration Curve Graph
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

    const ox = 35;
    const oy = height - 30;
    const gw = width - 50;
    const gh = height - 50;

    // Grid lines
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let x = ox; x <= ox + gw; x += gw / 5) {
      ctx.beginPath(); ctx.moveTo(x, oy - gh); ctx.lineTo(x, oy); ctx.stroke();
    }
    for (let y = oy; y >= oy - gh; y -= gh / 7) {
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + gw, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(ox + gw + 10, oy);
    ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - gh - 10);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('V_NaOH (mL) →', ox + gw, oy + 20);
    ctx.textAlign = 'left';
    ctx.fillText('pH ↑', ox - 5, 14);

    // Max X: 25 mL, Max Y: pH 14
    const maxX = Math.max(25, theoreticalEndpointMl * 1.5);
    const maxY = 14;

    // Phenolphthalein Working Range Highlight (pH 8.2 to 10.0)
    const y8_2 = oy - (8.2 / maxY) * gh;
    const y10 = oy - (10.0 / maxY) * gh;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.15)';
    ctx.fillRect(ox, y10, gw, y8_2 - y10);

    ctx.fillStyle = '#EC4899';
    ctx.font = 'bold 7px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('Phenolphthalein Range (8.2 - 10.0)', ox + gw - 4, y10 + 9);

    // Plot Theoretical Sigmoidal Titration Curve
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let v = 0; v <= maxX; v += 0.2) {
      const totL = (pipetteVolume + v) / 1000;
      const mAcid = acidMolarity * (pipetteVolume / 1000);
      const mBase = naohMolarity * (v / 1000);
      let ph = 1.0;
      if (mBase < mAcid) {
        const h = (mAcid - mBase) / totL;
        ph = Math.max(1.0, -Math.log10(Math.max(1e-7, h)));
      } else if (Math.abs(mBase - mAcid) < 1e-6) {
        ph = 7.0;
      } else {
        const oh = (mBase - mAcid) / totL;
        ph = Math.min(13.5, 14.0 + Math.log10(Math.max(1e-7, oh)));
      }

      const px = ox + (v / maxX) * gw;
      const py = oy - (ph / maxY) * gh;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Equivalence point dashed line
    const eqX = ox + (theoreticalEndpointMl / maxX) * gw;
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(eqX, oy);
    ctx.lineTo(eqX, oy - gh);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current Operating Point
    const curPx = ox + (dispensedMl / maxX) * gw;
    const curPy = oy - (currentPh / maxY) * gh;

    ctx.fillStyle = isFaintPinkEndpoint ? '#EC4899' : isOverTitrated ? '#BE185D' : '#0EA5E9';
    ctx.beginPath();
    ctx.arc(curPx, curPy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Point badge
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(curPx + 6, curPy - 18, 85, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${dispensedMl.toFixed(1)}mL, pH ${currentPh.toFixed(1)}`, curPx + 48, curPy - 6);
  }, [acidMolarity, naohMolarity, pipetteVolume, theoreticalEndpointMl, dispensedMl, currentPh, isFaintPinkEndpoint, isOverTitrated]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 select-none">
      {/* Simulation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Acid-Base Titration — HCl vs Standard NaOH
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Determine the molarity and strength of hydrochloric acid solution: <span className="font-semibold text-slate-700">M₁V₁ = M₂V₂</span> using phenolphthalein indicator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIndicatorAdded(!indicatorAdded)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              indicatorAdded
                ? 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Droplets className="w-4 h-4 text-pink-500" />
            {indicatorAdded ? 'Phenolphthalein Added' : 'No Indicator'}
          </button>

          <button
            onClick={handleResetTitration}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Burette
          </button>
        </div>
      </div>

      {/* Main Dual Stage: Titration Workbench & Real-Time pH Titration Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Titration Apparatus (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
          <canvas
            ref={canvasRef}
            width={580}
            height={310}
            className="w-full h-auto"
          />

          {/* Flow Control Action Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Stopcock:</span>
              <button
                onClick={() => setFlowRate('off')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  flowRate === 'off' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => setFlowRate('slow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  flowRate === 'slow' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Slow Dropwise
              </button>
              <button
                onClick={() => setFlowRate('fast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  flowRate === 'fast' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Fast Flow
              </button>
            </div>

            <button
              onClick={handleAddDrop}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white active:scale-95 flex items-center gap-1 shadow-sm transition"
            >
              + Single Drop (0.05 mL)
            </button>
          </div>
        </div>

        {/* Right: Real-time Sigmoidal pH Curve (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              pH Titration Neutralization Curve
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold">
              Equivalence V = {theoreticalEndpointMl.toFixed(2)} mL
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
        {/* Card 1: Sample Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Acid Sample (HCl)
            </label>
            <select
              value={selectedSampleIdx}
              onChange={e => {
                setSelectedSampleIdx(parseInt(e.target.value));
                handleResetTitration();
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {ACID_SAMPLES.map((sample, idx) => (
                <option key={sample.name} value={idx}>
                  {sample.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Target Equivalence:</span>
            <span className="font-mono font-bold text-emerald-600">{theoreticalEndpointMl.toFixed(2)} mL</span>
          </div>
        </div>

        {/* Card 2: Pipette Volume Aliquot */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Pipetted HCl Volume (V₁)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[10.0, 20.0].map(vol => (
                <button
                  key={vol}
                  onClick={() => {
                    setPipetteVolume(vol);
                    handleResetTitration();
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    pipetteVolume === vol
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {vol} mL
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Standard NaOH (M₂):</span>
            <span className="font-mono font-bold text-slate-800">{naohMolarity.toFixed(3)} M</span>
          </div>
        </div>

        {/* Card 3: Live Readings */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">NaOH Dispensed</span>
              <span className="text-sm font-mono font-bold text-sky-600">{dispensedMl.toFixed(2)} mL</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Burette: {(initialReadingMl + dispensedMl).toFixed(2)} mL
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Live pH:</span>
            <span className="font-mono font-bold text-indigo-600 text-sm">
              {currentPh.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 4: Action Button */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Data Recording
            </span>
            <div className="text-[11px] text-slate-500">
              Record reading to compute molarity and strength
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
              Estimation of Molarity and Strength of Hydrochloric Acid using Standard 0.1 M NaOH Solution
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
            No readings recorded yet. Perform titration to faint pink endpoint and click &quot;Record Reading&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Pipette Vol V₁ (mL)</th>
                  <th className="py-2.5 px-3">Initial Burette Reading (mL)</th>
                  <th className="py-2.5 px-3">Final Burette Reading (mL)</th>
                  <th className="py-2.5 px-3">Volume NaOH Used V₂ (mL)</th>
                  <th className="py-2.5 px-3">Molarity M₁ (mol/L)</th>
                  <th className="py-2.5 px-3">Strength (g/L)</th>
                  <th className="py-2.5 px-3">Observation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observationTable.map(row => (
                  <tr key={row.srNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.srNo}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.pipetteVolMl.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.initialBuretteMl.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.finalBuretteMl.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{row.volumeUsedMl.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.calculatedMolarity.toFixed(4)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{row.strengthGPerL.toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.status.includes('Perfect')
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status.includes('Over')
                            ? 'bg-rose-100 text-rose-800'
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
            <div className="font-bold text-sky-900 mb-0.5">Formulae & Calculations:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Molarity of HCl:</strong> M₁ = (M₂ &times; V₂) / V₁ where M₂ = 0.1 M NaOH.</li>
              <li><strong>Strength of HCl:</strong> Strength = M₁ &times; 36.46 g/L (Molar Mass of HCl).</li>
              <li><strong>Endpoint Indicator:</strong> Phenolphthalein turns from colorless to faint persistent pink at pH 8.2 &ndash; 10.0.</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Neutralization Law</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">M₁V₁ = M₂V₂</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitrationLab;
