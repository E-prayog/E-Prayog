import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Lock, Unlock, ZoomIn, CheckCircle2 } from 'lucide-react';

// Objects available for measurement
const OBJECTS = {
  wire: { id: 'wire', label: 'Copper Wire', trueDiameter: 1.24, color: '#EA580C', type: 'cylinder' },
  ball: { id: 'ball', label: 'Ball Bearing', trueDiameter: 4.38, color: '#94A3B8', type: 'sphere' },
  plate: { id: 'plate', label: 'Glass Plate', trueDiameter: 0.85, color: '#38BDF8', type: 'plate' },
  leadShot: { id: 'leadShot', label: 'Lead Shot', trueDiameter: 2.76, color: '#475569', type: 'sphere' },
  zeroCheck: { id: 'zeroCheck', label: 'Zero Check (None)', trueDiameter: 0.0, color: 'transparent', type: 'none' },
};

type ObjectKey = keyof typeof OBJECTS;

interface ObservationRow {
  srNo: number;
  object: string;
  msr: number;
  csr: number;
  totalReading: number;
  correctedReading: number;
}

export default function ScrewGaugeLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Simulation parameters: Pitch = 0.5 mm, 50 divisions => Least Count = 0.01 mm
  const PITCH = 0.5;
  const DIVISIONS = 50;
  const LEAST_COUNT = PITCH / DIVISIONS; // 0.01 mm

  // Internal physical state in ref for 60fps canvas loop
  const simState = useRef({
    gap: 8.0, // mm (current opening between anvil and spindle)
    selectedObject: 'wire' as ObjectKey,
    isLocked: false,
    zeroErrorDivs: 0, // divisions (+ve or -ve zero error)
    isDraggingThimble: false,
    dragStartY: 0,
    dragStartGap: 8.0,
    ratchetEngaged: false,
    ratchetFlashTimer: 0,
    touchGlowTimer: 0,
    hoveredPart: null as string | null,
    zoomLensActive: true,
  });

  // UI state for React display cards
  const [uiState, setUiState] = useState({
    gap: 8.0,
    selectedObject: 'wire' as ObjectKey,
    isLocked: false,
    zeroErrorDivs: 0,
    msr: 8.0,
    csr: 0,
    observedReading: 8.0,
    zeroCorrection: 0,
    correctedReading: 8.0,
    ratchetEngaged: false,
    zoomLensActive: true,
  });

  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [activeTab, setActiveTab] = useState<'controls' | 'table'>('controls');

  // Helper to sync ref state with React UI
  const syncUI = useCallback(() => {
    const s = simState.current;
    const currentGap = s.gap;

    // Linear Main Scale Reading (multiples of 0.5 mm)
    const msr = Math.floor(currentGap / PITCH) * PITCH;

    // Circular / Thimble Scale Reading (0 to 49)
    // Fraction of pitch remaining divided by least count
    const rem = currentGap - msr;
    let csr = Math.round(rem / LEAST_COUNT) % DIVISIONS;
    if (csr < 0) csr += DIVISIONS;

    const observed = msr + csr * LEAST_COUNT;
    const zeroCorr = -s.zeroErrorDivs * LEAST_COUNT;
    const corrected = Math.max(0, observed + zeroCorr);

    setUiState({
      gap: currentGap,
      selectedObject: s.selectedObject,
      isLocked: s.isLocked,
      zeroErrorDivs: s.zeroErrorDivs,
      msr: Number(msr.toFixed(2)),
      csr,
      observedReading: Number(observed.toFixed(2)),
      zeroCorrection: Number(zeroCorr.toFixed(2)),
      correctedReading: Number(corrected.toFixed(2)),
      ratchetEngaged: s.ratchetEngaged,
      zoomLensActive: s.zoomLensActive,
    });
  }, [PITCH, DIVISIONS, LEAST_COUNT]);

  // Adjust gap with boundary and ratchet collision detection
  const adjustGap = useCallback((deltaMm: number) => {
    const s = simState.current;
    if (s.isLocked) return;

    const objMin = OBJECTS[s.selectedObject].trueDiameter;
    const newGap = s.gap + deltaMm;

    if (deltaMm < 0 && newGap <= objMin + 0.001) {
      // Reached object surface - engage ratchet!
      s.gap = objMin;
      s.ratchetEngaged = true;
      s.ratchetFlashTimer = 15;
      s.touchGlowTimer = 20;
    } else {
      s.gap = Math.max(objMin, Math.min(25.0, newGap));
      s.ratchetEngaged = false;
    }
    syncUI();
  }, [syncUI]);

  // Canvas drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = simState.current;
    const W = canvas.width;
    const H = canvas.height;

    // Decay visual timers
    if (s.ratchetFlashTimer > 0) s.ratchetFlashTimer--;
    if (s.touchGlowTimer > 0) s.touchGlowTimer--;

    // ── 1. Lab Bench Background ──
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid (real lab bench)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    const dotSpacing = 24;
    for (let x = 12; x < W; x += dotSpacing) {
      for (let y = 12; y < H; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Subtle edge gradient shadow on bench
    const benchShadow = ctx.createLinearGradient(0, H - 40, 0, H);
    benchShadow.addColorStop(0, 'rgba(0,0,0,0)');
    benchShadow.addColorStop(1, 'rgba(0,0,0,0.03)');
    ctx.fillStyle = benchShadow;
    ctx.fillRect(0, H - 40, W, 40);

    // ── Coordinate Layout Constants ──
    const centerY = H / 2 - 10;
    const anvilX = 220; // X position of the anvil face
    const pxPerMm = 14; // pixels per millimeter on main scale
    const spindleX = anvilX + s.gap * pxPerMm; // X position of spindle face
    const sleeveStartX = 420; // Fixed starting X of barrel/sleeve
    const thimbleStartX = sleeveStartX + s.gap * pxPerMm; // Thimble shifts right as spindle opens

    // ── 2. Measurement Object in the Gap ──
    const currentObj = OBJECTS[s.selectedObject];
    if (currentObj.type !== 'none' && currentObj.trueDiameter > 0) {
      const objWidthPx = currentObj.trueDiameter * pxPerMm;
      const objCenterX = anvilX + objWidthPx / 2;
      const objRadiusPx = Math.min(objWidthPx / 2, 45);

      ctx.save();
      // Drop shadow on bench
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 12;

      if (currentObj.type === 'sphere') {
        const radGrad = ctx.createRadialGradient(
          objCenterX - objRadiusPx * 0.3,
          centerY - objRadiusPx * 0.3,
          objRadiusPx * 0.1,
          objCenterX,
          centerY,
          objRadiusPx
        );
        radGrad.addColorStop(0, '#FFFFFF');
        radGrad.addColorStop(0.3, currentObj.color);
        radGrad.addColorStop(0.85, '#334155');
        radGrad.addColorStop(1, '#0F172A');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(objCenterX, centerY, objRadiusPx, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (currentObj.type === 'cylinder') {
        // Copper wire
        const wireH = 110;
        const wireGrad = ctx.createLinearGradient(
          anvilX,
          centerY - wireH / 2,
          anvilX + objWidthPx,
          centerY + wireH / 2
        );
        wireGrad.addColorStop(0, '#FB923C');
        wireGrad.addColorStop(0.4, '#EA580C');
        wireGrad.addColorStop(0.8, '#C2410C');
        wireGrad.addColorStop(1, '#7C2D12');

        ctx.fillStyle = wireGrad;
        ctx.beginPath();
        ctx.roundRect(anvilX, centerY - wireH / 2, objWidthPx, wireH, 3);
        ctx.fill();

        ctx.strokeStyle = '#9A3412';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (currentObj.type === 'plate') {
        // Glass/Metal Plate
        const plateH = 120;
        const plateGrad = ctx.createLinearGradient(
          anvilX,
          centerY - plateH / 2,
          anvilX + objWidthPx,
          centerY + plateH / 2
        );
        plateGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        plateGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.5)');
        plateGrad.addColorStop(1, 'rgba(2, 132, 199, 0.8)');

        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.roundRect(anvilX, centerY - plateH / 2, objWidthPx, plateH, 2);
        ctx.fill();

        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 3. Contact Glow on Faces (when touching) ──
    const isTouching = s.gap <= currentObj.trueDiameter + 0.02;
    if (isTouching && currentObj.type !== 'none') {
      ctx.save();
      ctx.shadowColor = '#0EA5E9';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;

      // Anvil contact line
      ctx.beginPath();
      ctx.moveTo(anvilX, centerY - 24);
      ctx.lineTo(anvilX, centerY + 24);
      ctx.stroke();

      // Spindle contact line
      ctx.beginPath();
      ctx.moveTo(spindleX, centerY - 24);
      ctx.lineTo(spindleX, centerY + 24);
      ctx.stroke();
      ctx.restore();
    }

    // ── 4. Photorealistic Micrometer Body ──

    // A. Cast U-Frame
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;

    const frameGrad = ctx.createLinearGradient(60, centerY - 140, 360, centerY + 160);
    frameGrad.addColorStop(0, '#F1F5F9'); // Outer metallic edge
    frameGrad.addColorStop(0.18, '#CBD5E1');
    frameGrad.addColorStop(0.5, '#64748B'); // Main dark steel body
    frameGrad.addColorStop(0.82, '#334155');
    frameGrad.addColorStop(1, '#1E293B');

    // Draw solid U-frame path
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.moveTo(anvilX, centerY - 26);
    ctx.lineTo(140, centerY - 26);
    ctx.bezierCurveTo(70, centerY - 26, 60, centerY + 140, 240, centerY + 140);
    ctx.bezierCurveTo(340, centerY + 140, 370, centerY + 60, 370, centerY + 26);
    ctx.lineTo(sleeveStartX, centerY + 26);
    ctx.lineTo(sleeveStartX, centerY - 26);
    ctx.lineTo(370, centerY - 26);
    ctx.bezierCurveTo(340, centerY - 20, 300, centerY + 80, 240, centerY + 80);
    ctx.bezierCurveTo(150, centerY + 80, 140, centerY + 20, anvilX, centerY + 20);
    ctx.closePath();
    ctx.fill();

    // Metallic outer bevel stroke
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chrome highlight inner stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(240, centerY + 138, 140, Math.PI * 0.8, Math.PI * 1.8, true);
    ctx.stroke();

    // Lab nameplate on frame
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E-PRAYOG 0-25mm', 220, centerY + 115);
    ctx.fillStyle = '#38BDF8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('LC = 0.01 mm (0.5mm / 50 div)', 220, centerY + 130);

    ctx.restore();

    // B. Anvil (Left Fixed Face)
    ctx.save();
    const anvilGrad = ctx.createLinearGradient(anvilX - 35, centerY - 16, anvilX, centerY + 16);
    anvilGrad.addColorStop(0, '#CBD5E1');
    anvilGrad.addColorStop(0.5, '#F8FAFC');
    anvilGrad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = anvilGrad;
    ctx.beginPath();
    ctx.roundRect(anvilX - 35, centerY - 16, 35, 32, 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hardened carbide face tip on anvil
    ctx.fillStyle = '#334155';
    ctx.fillRect(anvilX - 3, centerY - 16, 3, 32);
    ctx.restore();

    // C. Spindle (Movable Shaft from Sleeve to Spindle Face)
    ctx.save();
    const spindleW = sleeveStartX + 50 - spindleX;
    if (spindleW > 0) {
      const spindleGrad = ctx.createLinearGradient(spindleX, centerY - 16, spindleX, centerY + 16);
      spindleGrad.addColorStop(0, '#F1F5F9');
      spindleGrad.addColorStop(0.3, '#E2E8F0');
      spindleGrad.addColorStop(0.7, '#94A3B8');
      spindleGrad.addColorStop(1, '#475569');

      ctx.fillStyle = spindleGrad;
      ctx.beginPath();
      ctx.roundRect(spindleX, centerY - 16, spindleW, 32, 2);
      ctx.fill();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Carbide face tip on spindle
      ctx.fillStyle = '#334155';
      ctx.fillRect(spindleX, centerY - 16, 3, 32);
    }
    ctx.restore();

    // D. Lock Lever on Frame
    ctx.save();
    const lockX = 390;
    const lockY = centerY - 32;
    ctx.fillStyle = s.isLocked ? '#F59E0B' : '#64748B';
    ctx.beginPath();
    ctx.roundRect(lockX - 7, lockY - 14, 14, 20, 3);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small lever arm
    ctx.save();
    ctx.translate(lockX, lockY - 4);
    ctx.rotate(s.isLocked ? -Math.PI / 4 : 0);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-3, -16, 6, 16);
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(0, -16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // E. Sleeve / Barrel (Main Scale)
    const sleeveLength = 25 * pxPerMm + 60; // accommodates 0-25mm scale + margin
    const sleeveH = 46;
    const sleeveY = centerY - sleeveH / 2;

    ctx.save();
    const sleeveGrad = ctx.createLinearGradient(sleeveStartX, sleeveY, sleeveStartX, sleeveY + sleeveH);
    sleeveGrad.addColorStop(0, '#FFFFFF');
    sleeveGrad.addColorStop(0.2, '#F1F5F9');
    sleeveGrad.addColorStop(0.5, '#E2E8F0');
    sleeveGrad.addColorStop(0.85, '#CBD5E1');
    sleeveGrad.addColorStop(1, '#94A3B8');

    ctx.fillStyle = sleeveGrad;
    ctx.beginPath();
    ctx.roundRect(sleeveStartX, sleeveY, sleeveLength, sleeveH, 3);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Horizontal Datum Reference Line (Black / Dark Slate)
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sleeveStartX + 10, centerY);
    ctx.lineTo(sleeveStartX + sleeveLength - 10, centerY);
    ctx.stroke();

    // Main Scale Markings on Sleeve
    // Visible up to thimbleStartX
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0F172A';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let mm = 0; mm <= 25; mm++) {
      const markX = sleeveStartX + 20 + mm * pxPerMm;
      if (markX > thimbleStartX - 2) break; // Covered by thimble

      // 1 mm marks ABOVE datum line
      const isMajor = mm % 5 === 0;
      const tickH = isMajor ? 14 : 9;

      ctx.lineWidth = isMajor ? 1.4 : 0.9;
      ctx.beginPath();
      ctx.moveTo(markX, centerY);
      ctx.lineTo(markX, centerY - tickH);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(`${mm}`, markX, centerY - tickH - 4);
      }

      // 0.5 mm marks BELOW datum line
      if (mm < 25) {
        const halfMarkX = markX + 0.5 * pxPerMm;
        if (halfMarkX < thimbleStartX - 2) {
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(halfMarkX, centerY);
          ctx.lineTo(halfMarkX, centerY + 8);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // F. Thimble (Rotary Barrel with 50 divisions)
    const thimbleW = 120;
    const thimbleH = 68;
    const thimbleY = centerY - thimbleH / 2;
    const bevelW = 18;

    ctx.save();
    // Drop shadow under thimble
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Thimble cylindrical body gradient
    const thimbleGrad = ctx.createLinearGradient(thimbleStartX, thimbleY, thimbleStartX, thimbleY + thimbleH);
    thimbleGrad.addColorStop(0, '#FFFFFF');
    thimbleGrad.addColorStop(0.2, '#E2E8F0');
    thimbleGrad.addColorStop(0.5, '#94A3B8');
    thimbleGrad.addColorStop(0.8, '#475569');
    thimbleGrad.addColorStop(1, '#1E293B');

    // Thimble Body with beveled leading edge
    ctx.fillStyle = thimbleGrad;
    ctx.beginPath();
    ctx.moveTo(thimbleStartX + bevelW, thimbleY);
    ctx.lineTo(thimbleStartX + thimbleW, thimbleY);
    ctx.lineTo(thimbleStartX + thimbleW, thimbleY + thimbleH);
    ctx.lineTo(thimbleStartX + bevelW, thimbleY + thimbleH);
    ctx.lineTo(thimbleStartX, centerY + sleeveH / 2 + 3);
    ctx.lineTo(thimbleStartX, centerY - sleeveH / 2 - 3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Knurling texture on rear of thimble
    ctx.save();
    ctx.fillStyle = '#64748B';
    const knurlX = thimbleStartX + bevelW + 28;
    const knurlW = thimbleW - bevelW - 38;
    ctx.fillRect(knurlX, thimbleY + 3, knurlW, thimbleH - 6);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let kx = knurlX + 2; kx < knurlX + knurlW - 2; kx += 4) {
      ctx.fillRect(kx, thimbleY + 3, 1.5, thimbleH - 6);
    }
    ctx.restore();

    // Circular Scale Markings on the Bevel Edge of Thimble
    // 50 divisions total. The division aligned with datum line is csr.
    const rem = s.gap - Math.floor(s.gap / PITCH) * PITCH;
    const rawCsr = (rem / LEAST_COUNT) % DIVISIONS;
    const alignedDiv = Math.round(rawCsr) % DIVISIONS;

    ctx.save();
    const visDivRange = 14; // Visible divisions above and below center
    const divPitchPx = (thimbleH * 0.45) / visDivRange;

    for (let offset = -visDivRange; offset <= visDivRange; offset++) {
      const divNum = Math.floor(((alignedDiv + offset) % DIVISIONS + DIVISIONS) % DIVISIONS);
      const markY = centerY - offset * divPitchPx;

      if (markY < thimbleY + 6 || markY > thimbleY + thimbleH - 6) continue;

      const isAligned = offset === 0;
      const isMajor = divNum % 5 === 0;
      const tickLength = isMajor ? 14 : 8;

      if (isAligned) {
        // Highlighting aligned division in sky-blue
        ctx.strokeStyle = '#0EA5E9';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(14, 165, 233, 0.8)';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = isMajor ? '#0F172A' : '#475569';
        ctx.lineWidth = isMajor ? 1.2 : 0.8;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.moveTo(thimbleStartX + 2, markY);
      ctx.lineTo(thimbleStartX + 2 + tickLength, markY);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = isAligned ? '#0EA5E9' : '#0F172A';
        ctx.font = isAligned
          ? 'bold 10px "JetBrains Mono", monospace'
          : '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${divNum}`, thimbleStartX + tickLength + 5, markY + 3);
      }
    }
    ctx.restore();

    // G. Ratchet Stop Knob at the far right
    const ratchetX = thimbleStartX + thimbleW;
    const ratchetW = 42;
    const ratchetH = 38;
    const ratchetY = centerY - ratchetH / 2;

    ctx.save();
    const ratchetGrad = ctx.createLinearGradient(ratchetX, ratchetY, ratchetX, ratchetY + ratchetH);
    ratchetGrad.addColorStop(0, '#F1F5F9');
    ratchetGrad.addColorStop(0.3, '#CBD5E1');
    ratchetGrad.addColorStop(0.7, '#64748B');
    ratchetGrad.addColorStop(1, '#334155');

    ctx.fillStyle = ratchetGrad;
    ctx.beginPath();
    ctx.roundRect(ratchetX, ratchetY, ratchetW, ratchetH, [0, 6, 6, 0]);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ratchet knurling ridges
    ctx.fillStyle = '#475569';
    for (let rx = ratchetX + 6; rx < ratchetX + ratchetW - 6; rx += 4) {
      ctx.fillRect(rx, ratchetY + 2, 1.5, ratchetH - 4);
    }

    // Ratchet Slip Flash (when engaged)
    if (s.ratchetFlashTimer > 0) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(ratchetX - 2, ratchetY - 2, ratchetW + 4, ratchetH + 4, 8);
      ctx.fill();
    }
    ctx.restore();

    // ── 5. Circular Magnifier / Zoom Lens ──
    if (s.zoomLensActive) {
      const zoomCenterX = thimbleStartX - 10;
      const zoomCenterY = centerY - 130;
      const zoomRadius = 70;

      ctx.save();
      // Drop shadow for floating lens
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;

      // Outer chrome bezel
      const bezelGrad = ctx.createLinearGradient(
        zoomCenterX - zoomRadius,
        zoomCenterY - zoomRadius,
        zoomCenterX + zoomRadius,
        zoomCenterY + zoomRadius
      );
      bezelGrad.addColorStop(0, '#FFFFFF');
      bezelGrad.addColorStop(0.5, '#94A3B8');
      bezelGrad.addColorStop(1, '#334155');

      ctx.fillStyle = bezelGrad;
      ctx.beginPath();
      ctx.arc(zoomCenterX, zoomCenterY, zoomRadius + 5, 0, Math.PI * 2);
      ctx.fill();

      // Glass background
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(zoomCenterX, zoomCenterY, zoomRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.clip(); // Clip everything to inside magnifier

      // Magnified datum line
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(zoomCenterX - zoomRadius, zoomCenterY);
      ctx.lineTo(zoomCenterX + zoomRadius, zoomCenterY);
      ctx.stroke();

      // Magnified Sleeve markings on the left half of the lens
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#0F172A';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      const zoomScale = 2.4;
      const zoomMmPx = pxPerMm * zoomScale;

      const currentMsr = Math.floor(s.gap / PITCH) * PITCH;
      const sleeveEdgeLensX = zoomCenterX - 2;

      // Draw last 2 visible main scale ticks
      for (let i = -2; i <= 0; i++) {
        const val = currentMsr + i * 0.5;
        if (val < 0) continue;
        const tickLensX = sleeveEdgeLensX - (currentMsr - val) * 2 * (zoomMmPx / 2);

        const isWholeMm = Math.abs(val - Math.round(val)) < 0.01;
        ctx.lineWidth = isWholeMm ? 2 : 1.2;
        ctx.beginPath();
        if (isWholeMm) {
          ctx.moveTo(tickLensX, zoomCenterY);
          ctx.lineTo(tickLensX, zoomCenterY - 24);
          ctx.stroke();
          ctx.fillText(`${val}`, tickLensX, zoomCenterY - 28);
        } else {
          ctx.moveTo(tickLensX, zoomCenterY);
          ctx.lineTo(tickLensX, zoomCenterY + 16);
          ctx.stroke();
        }
      }

      // Magnified Thimble circular scale on right half of lens
      const thimbleEdgeLensX = zoomCenterX + 2;
      const zoomDivPitch = divPitchPx * zoomScale;

      for (let offset = -5; offset <= 5; offset++) {
        const divNum = Math.floor(((alignedDiv + offset) % DIVISIONS + DIVISIONS) % DIVISIONS);
        const markY = zoomCenterY - offset * zoomDivPitch;

        const isAligned = offset === 0;
        const isMajor = divNum % 5 === 0;

        ctx.strokeStyle = isAligned ? '#0EA5E9' : isMajor ? '#0F172A' : '#64748B';
        ctx.lineWidth = isAligned ? 3 : isMajor ? 1.8 : 1.0;

        ctx.beginPath();
        ctx.moveTo(thimbleEdgeLensX, markY);
        ctx.lineTo(thimbleEdgeLensX + (isMajor ? 26 : 14), markY);
        ctx.stroke();

        ctx.fillStyle = isAligned ? '#0EA5E9' : '#0F172A';
        ctx.font = isAligned ? 'bold 12px "JetBrains Mono"' : '10px "JetBrains Mono"';
        ctx.textAlign = 'left';
        ctx.fillText(`${divNum}`, thimbleEdgeLensX + 30, markY + 4);
      }

      // Lens glare reflection
      const glareGrad = ctx.createLinearGradient(
        zoomCenterX - zoomRadius,
        zoomCenterY - zoomRadius,
        zoomCenterX + zoomRadius,
        zoomCenterY + zoomRadius
      );
      glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      glareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      glareGrad.addColorStop(1, 'rgba(56, 189, 248, 0.1)');
      ctx.fillStyle = glareGrad;
      ctx.beginPath();
      ctx.arc(zoomCenterX, zoomCenterY, zoomRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Magnifier connecting line to datum contact point
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(zoomCenterX, zoomCenterY + zoomRadius + 4);
      ctx.lineTo(thimbleStartX, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── 6. On-Canvas HUD Badges ──
    if (s.ratchetEngaged) {
      ctx.save();
      ctx.fillStyle = '#FEF3C7';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.3)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 140, 24, 280, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ Ratchet engaged — reading locked!', W / 2, 46);
      ctx.restore();
    }
  }, [PITCH, LEAST_COUNT, DIVISIONS]);

  // Animation Loop
  useEffect(() => {
    let running = true;
    const render = () => {
      if (!running) return;
      draw();
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // Pointer Drag Handling on Thimble
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const s = simState.current;
    const centerY = canvas.height / 2 - 10;
    const pxPerMm = 14;
    const sleeveStartX = 420;
    const thimbleStartX = sleeveStartX + s.gap * pxPerMm;

    // Click on Lock Lever
    const lockX = 390;
    const lockY = centerY - 32;
    if (Math.hypot(x - lockX, y - lockY) < 22) {
      s.isLocked = !s.isLocked;
      syncUI();
      return;
    }

    // Drag on Thimble / Ratchet area
    if (x >= thimbleStartX - 10 && x <= thimbleStartX + 180 && y >= centerY - 50 && y <= centerY + 50) {
      s.isDraggingThimble = true;
      s.dragStartY = y;
      s.dragStartGap = s.gap;
      canvas.setPointerCapture(e.pointerId);
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
    if (s.isDraggingThimble && !s.isLocked) {
      // Upward drag closes spindle (-gap), downward drag opens (+gap)
      const deltaY = y - s.dragStartY;
      const mmChange = (deltaY * 0.04); // sensitivity
      adjustGap(mmChange);
      s.dragStartY = y;
    } else {
      const centerY = canvas.height / 2 - 10;
      const pxPerMm = 14;
      const sleeveStartX = 420;
      const thimbleStartX = sleeveStartX + s.gap * pxPerMm;

      if (x >= thimbleStartX - 10 && x <= thimbleStartX + 180 && y >= centerY - 50 && y <= centerY + 50) {
        canvas.style.cursor = s.isLocked ? 'not-allowed' : 'ns-resize';
      } else if (Math.hypot(x - 390, y - (centerY - 32)) < 22) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simState.current;
    if (s.isDraggingThimble) {
      s.isDraggingThimble = false;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Reset to default gap
  const resetApp = () => {
    simState.current.gap = 8.0;
    simState.current.isLocked = false;
    simState.current.ratchetEngaged = false;
    syncUI();
  };

  // Switch object
  const selectObject = (key: ObjectKey) => {
    simState.current.selectedObject = key;
    simState.current.gap = Math.max(simState.current.gap, OBJECTS[key].trueDiameter + 2.0);
    simState.current.ratchetEngaged = false;
    syncUI();
  };

  // Record reading into table
  const recordObservation = () => {
    const newRow: ObservationRow = {
      srNo: observations.length + 1,
      object: OBJECTS[uiState.selectedObject].label,
      msr: uiState.msr,
      csr: uiState.csr,
      totalReading: uiState.observedReading,
      correctedReading: uiState.correctedReading,
    };
    setObservations(prev => [...prev.slice(-7), newRow]);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col p-4 md:p-6 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-5 py-3.5 bg-[#111827] border border-sky-500/20 rounded-2xl shadow-xl shadow-sky-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-sky-500/30">
            SG
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Micrometer Screw Gauge (0–25 mm)
            </h1>
            <p className="text-xs text-slate-400">
              Karnataka PUC Physics Practicals • Least Count = 0.01 mm
            </p>
          </div>
        </div>

        {/* Header Live Status Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 bg-slate-900/90 rounded-xl border border-slate-700/60 flex items-center gap-2.5 text-xs">
            <span className="text-slate-400">Lock:</span>
            <span className={`font-semibold flex items-center gap-1 ${uiState.isLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
              {uiState.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
              {uiState.isLocked ? 'LOCKED' : 'UNLOCKED'}
            </span>
          </div>

          <div className="px-3.5 py-1.5 bg-sky-950/40 rounded-xl border border-sky-500/40 flex items-center gap-2 text-xs">
            <span className="text-sky-300 font-medium">Reading:</span>
            <span className="text-cyan-300 font-mono font-bold text-sm">
              {uiState.correctedReading.toFixed(2)} mm
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
          <span>💡 Drag the thimble vertically or use fine-tune buttons below. Ratchet slips upon contact.</span>
          <button
            onClick={() => {
              simState.current.zoomLensActive = !simState.current.zoomLensActive;
              syncUI();
            }}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ZoomIn size={14} /> {uiState.zoomLensActive ? 'Hide Magnifier' : 'Show Magnifier'}
          </button>
        </div>
      </div>

      {/* Interactive Controls & Tabbed Dashboard */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Object & Rotation Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Object Selector */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Select Specimen</span>
              <span className="text-xs text-slate-500">True: {OBJECTS[uiState.selectedObject].trueDiameter.toFixed(2)} mm</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(OBJECTS) as ObjectKey[]).map(key => {
                const obj = OBJECTS[key];
                const isSelected = uiState.selectedObject === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectObject(key)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-md shadow-sky-950/40'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/70 hover:text-slate-200'
                    }`}
                  >
                    <span>{obj.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine Tuning & Rotary Buttons */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Thimble Rotation & Lock</span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => adjustGap(-0.01)}
                disabled={uiState.isLocked}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 disabled:opacity-40"
              >
                -1 Div
              </button>
              <button
                onClick={() => adjustGap(-0.05)}
                disabled={uiState.isLocked}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 disabled:opacity-40"
              >
                -5 Div
              </button>
              <button
                onClick={() => adjustGap(0.01)}
                disabled={uiState.isLocked}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 disabled:opacity-40"
              >
                +1 Div
              </button>
              <button
                onClick={() => adjustGap(0.05)}
                disabled={uiState.isLocked}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 disabled:opacity-40"
              >
                +5 Div
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => {
                  simState.current.isLocked = !simState.current.isLocked;
                  syncUI();
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  uiState.isLocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {uiState.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                {uiState.isLocked ? 'Spindle Locked' : 'Spindle Free'}
              </button>

              <button
                onClick={resetApp}
                className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/50 transition-all"
              >
                <RotateCcw size={14} /> Open / Reset
              </button>
            </div>
          </div>
        </div>

        {/* Center/Right Column: Live Measurements Card & Observation Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Readings Card */}
          <div className="bg-[#111827] border border-sky-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <span>📊</span> Live Micrometer Readings
              </h3>
              <button
                onClick={recordObservation}
                className="py-1 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-md shadow-sky-500/20"
              >
                <CheckCircle2 size={13} /> Record to Table
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
              {/* Main Scale Reading */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">MSR (mm)</span>
                <span className="text-base font-mono font-bold text-sky-300">{uiState.msr.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block">linear sleeve</span>
              </div>

              {/* Circular Scale Reading */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">CSR (Div)</span>
                <span className="text-base font-mono font-bold text-cyan-300">{uiState.csr}</span>
                <span className="text-[10px] text-slate-500 block">coinciding div</span>
              </div>

              {/* Observed Reading */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-400 block mb-1">Observed (mm)</span>
                <span className="text-base font-mono font-bold text-emerald-300">
                  {uiState.observedReading.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block">MSR + (CSR × LC)</span>
              </div>

              {/* Corrected Reading */}
              <div className="bg-sky-950/50 border border-sky-500/40 rounded-xl p-2.5">
                <span className="text-[11px] text-sky-300 font-semibold block mb-1">Corrected (mm)</span>
                <span className="text-base font-mono font-bold text-sky-200">
                  {uiState.correctedReading.toFixed(2)}
                </span>
                <span className="text-[10px] text-sky-400/80 block">Observed - Error</span>
              </div>
            </div>

            {/* Zero Error Correction Setting */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Zero Error Correction:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    simState.current.zeroErrorDivs = Math.max(-5, simState.current.zeroErrorDivs - 1);
                    syncUI();
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-mono text-slate-300"
                >
                  -
                </button>
                <span className="font-mono text-amber-300 font-semibold min-w-[70px] text-center">
                  {uiState.zeroErrorDivs > 0 ? `+${uiState.zeroErrorDivs}` : uiState.zeroErrorDivs} div ({(uiState.zeroErrorDivs * 0.01).toFixed(2)} mm)
                </span>
                <button
                  onClick={() => {
                    simState.current.zeroErrorDivs = Math.min(5, simState.current.zeroErrorDivs + 1);
                    syncUI();
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-mono text-slate-300"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Tabbed Observation Table & Theory */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex-1">
            <div className="flex gap-2 border-b border-slate-800 pb-2 mb-3 text-xs">
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'controls' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Formula & Least Count
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'table' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Observation Table ({observations.length})
              </button>
            </div>

            {activeTab === 'controls' ? (
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 font-mono">
                  <div className="text-sky-400 font-bold mb-1">📐 Fundamental Formulae:</div>
                  <div>• Pitch = Distance moved / Number of rotations = 0.5 mm</div>
                  <div>• Least Count (LC) = Pitch / Total Divisions = 0.5 mm / 50 = 0.01 mm</div>
                  <div>• Observed Diameter = MSR + (CSR × LC)</div>
                  <div>• Corrected Diameter = Observed Reading − Zero Error</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-2">#</th>
                      <th className="py-1.5 px-2">Specimen</th>
                      <th className="py-1.5 px-2 font-mono">MSR (mm)</th>
                      <th className="py-1.5 px-2 font-mono">CSR (div)</th>
                      <th className="py-1.5 px-2 font-mono">Observed (mm)</th>
                      <th className="py-1.5 px-2 font-mono">Corrected (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-slate-500">
                          No observations recorded yet. Click "Record to Table" above.
                        </td>
                      </tr>
                    ) : (
                      observations.map((row) => (
                        <tr key={row.srNo} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                          <td className="py-1 px-2 text-slate-400">{row.srNo}</td>
                          <td className="py-1 px-2 text-sky-300 font-medium">{row.object}</td>
                          <td className="py-1 px-2 font-mono">{row.msr.toFixed(2)}</td>
                          <td className="py-1 px-2 font-mono">{row.csr}</td>
                          <td className="py-1 px-2 font-mono">{row.totalReading.toFixed(2)}</td>
                          <td className="py-1 px-2 font-mono text-emerald-400 font-bold">
                            {row.correctedReading.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
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
