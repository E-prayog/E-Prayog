import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Volume2, VolumeX, Sparkles, Play } from 'lucide-react';

interface WireMaterial {
  name: string;
  density: number; // kg/m^3
  diameterMm: number; // mm
  mu: number; // linear mass density kg/m = density * pi * (d/2)^2
  color: string;
}

const WIRE_MATERIALS: WireMaterial[] = [
  {
    name: 'Steel Wire (0.5mm)',
    density: 7850,
    diameterMm: 0.5,
    mu: 7850 * Math.PI * Math.pow(0.00025, 2), // ~0.00154 kg/m
    color: '#94A3B8'
  },
  {
    name: 'Brass Wire (0.5mm)',
    density: 8500,
    diameterMm: 0.5,
    mu: 8500 * Math.PI * Math.pow(0.00025, 2), // ~0.00167 kg/m
    color: '#F59E0B'
  },
  {
    name: 'Copper Wire (0.4mm)',
    density: 8960,
    diameterMm: 0.4,
    mu: 8960 * Math.PI * Math.pow(0.0002, 2), // ~0.00113 kg/m
    color: '#EA580C'
  },
  {
    name: 'Nichrome Wire (0.45mm)',
    density: 8400,
    diameterMm: 0.45,
    mu: 8400 * Math.PI * Math.pow(0.000225, 2), // ~0.00134 kg/m
    color: '#64748B'
  }
];

const TUNING_FORKS = [256, 288, 320, 384, 426, 480, 512];

interface SonometerObservation {
  srNo: number;
  forkFreq: number; // Hz
  massKg: number; // kg
  tensionN: number; // N
  lengthCm: number; // cm
  flValue: number; // f * L (Hz*cm)
  naturalFreqHz: number; // Hz
  status: string;
}

export const SonometerLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // State
  const [selectedFork, setSelectedFork] = useState<number>(384); // Hz
  const [hangingMass, setHangingMass] = useState<number>(1.5); // kg (0.5 to 4.0 kg)
  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState<number>(0);
  
  // Bridge positions in cm (scale 0 to 100 cm)
  const [bridge1Cm, setBridge1Cm] = useState<number>(20.0);
  const [bridge2Cm, setBridge2Cm] = useState<number>(55.0);
  
  // Simulation dynamics
  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [strikeEnergy, setStrikeEnergy] = useState<number>(0); // 0 to 1
  const [riderFallen, setRiderFallen] = useState<boolean>(false);
  const [riderFlyOffset, setRiderFlyOffset] = useState<{ x: number; y: number; rot: number }>({ x: 0, y: 0, rot: 0 });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [observationTable, setObservationTable] = useState<SonometerObservation[]>([]);

  // Dragging interaction state
  const isDraggingBridge1 = useRef(false);
  const isDraggingBridge2 = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const g = 9.8; // m/s^2
  const tension = hangingMass * g; // N
  const currentMaterial = WIRE_MATERIALS[selectedMaterialIdx];
  const mu = currentMaterial.mu; // kg/m
  const vibratingLengthCm = Math.abs(bridge2Cm - bridge1Cm);
  const vibratingLengthM = vibratingLengthCm / 100;

  // Fundamental frequency f0 = (1 / 2L) * sqrt(T / mu)
  const naturalFreq = vibratingLengthM > 0.01 
    ? (1 / (2 * vibratingLengthM)) * Math.sqrt(tension / mu)
    : 0;

  // Resonance match ratio: closeness of naturalFreq to selectedFork
  const freqDiff = Math.abs(naturalFreq - selectedFork);
  const resonanceCloseness = Math.max(0, 1 - freqDiff / 25); // high when within 25 Hz
  const isResonance = freqDiff < 3.5; // resonance condition

  // Web Audio initialization and synthesis
  const playForkTone = useCallback((freq: number, duration: number, resonanceAmp: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop any existing oscillator
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch {
          // ignore
        }
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Volume envelope
      const now = ctx.currentTime;
      const initialGain = 0.15 + resonanceAmp * 0.25;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(initialGain, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);

      oscRef.current = osc;
      gainRef.current = gain;
    } catch {
      // Audio might be blocked until user interaction
    }
  }, [soundEnabled]);

  // Strike fork handler
  const handleStrikeFork = () => {
    setIsStriking(true);
    setStrikeEnergy(1.0);
    playForkTone(selectedFork, 3.0, resonanceCloseness);

    // If near resonance and rider hasn't fallen, trigger paper rider fly off!
    if (resonanceCloseness > 0.85 && !riderFallen) {
      setTimeout(() => {
        setRiderFallen(true);
        // Random fly off velocity
        setRiderFlyOffset({
          x: (Math.random() - 0.5) * 60,
          y: -40 - Math.random() * 30,
          rot: (Math.random() - 0.5) * Math.PI
        });
      }, 350);
    }
  };

  const handleResetRider = () => {
    setRiderFallen(false);
    setRiderFlyOffset({ x: 0, y: 0, rot: 0 });
  };

  // Add observation record
  const addObservation = () => {
    const newRecord: SonometerObservation = {
      srNo: observationTable.length + 1,
      forkFreq: selectedFork,
      massKg: hangingMass,
      tensionN: parseFloat(tension.toFixed(2)),
      lengthCm: parseFloat(vibratingLengthCm.toFixed(1)),
      flValue: parseFloat((selectedFork * vibratingLengthCm).toFixed(1)),
      naturalFreqHz: parseFloat(naturalFreq.toFixed(1)),
      status: isResonance ? 'Resonance (Rider fell)' : resonanceCloseness > 0.5 ? 'Partial Flutter' : 'No Resonance'
    };
    setObservationTable([...observationTable, newRecord]);
  };

  // Render simulation canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      timeRef.current += 0.03;
      const t = timeRef.current;

      // Dimensions
      const width = canvas.width;
      const height = canvas.height;

      // Clear & Background - Lab bench
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Lab bench dot grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      const dotSpacing = 24;
      for (let x = 0; x < width; x += dotSpacing) {
        for (let y = 0; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bench surface subtle gradient
      const benchGrad = ctx.createLinearGradient(0, 0, 0, height);
      benchGrad.addColorStop(0, 'rgba(248, 250, 252, 0.5)');
      benchGrad.addColorStop(1, 'rgba(241, 245, 249, 0.8)');
      ctx.fillStyle = benchGrad;
      ctx.fillRect(0, 0, width, height);

      // Sonometer Geometry
      const boxLeft = 60;
      const boxRight = width - 120;
      const boxWidth = boxRight - boxLeft;
      const boxTop = 130;
      const boxHeight = 110;
      const wireY = boxTop + 24;

      // 1. Draw Wooden Resonant Sonometer Soundbox (Mahogany / Teak wood style)
      // Soundbox Drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#D97706'; // Base wood
      ctx.beginPath();
      ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.restore();

      // Wood Texture / Gradient
      const woodGrad = ctx.createLinearGradient(boxLeft, boxTop, boxLeft, boxTop + boxHeight);
      woodGrad.addColorStop(0, '#B45309');
      woodGrad.addColorStop(0.15, '#D97706');
      woodGrad.addColorStop(0.5, '#92400E');
      woodGrad.addColorStop(0.85, '#B45309');
      woodGrad.addColorStop(1, '#78350F');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(boxLeft, boxTop, boxWidth, boxHeight, 8);
      ctx.fill();

      // Soundbox border brass inlay
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wood grain lines
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 6; i++) {
        const yGrain = boxTop + (boxHeight / 7) * i;
        ctx.beginPath();
        ctx.moveTo(boxLeft + 10, yGrain);
        ctx.bezierCurveTo(
          boxLeft + boxWidth * 0.3, yGrain + 2,
          boxLeft + boxWidth * 0.7, yGrain - 2,
          boxRight - 10, yGrain
        );
        ctx.stroke();
      }

      // Sonometer Sound Holes (Two acoustic resonance sound holes in soundbox)
      const holeY = boxTop + boxHeight * 0.65;
      const hole1X = boxLeft + boxWidth * 0.25;
      const hole2X = boxLeft + boxWidth * 0.75;
      [hole1X, hole2X].forEach(hx => {
        // Outer brass ring
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hx, holeY, 14, 0, Math.PI * 2);
        ctx.stroke();
        // Inner cavity
        ctx.fillStyle = '#1E1B18';
        ctx.beginPath();
        ctx.arc(hx, holeY, 12, 0, Math.PI * 2);
        ctx.fill();
      });

      // Soundbox Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SONOMETER RESONANCE SOUNDBOX (100 cm SCALE)', boxLeft + boxWidth / 2, boxTop + boxHeight - 12);

      // 2. Fixed End Pegs & Frictionless Pulley
      // Left fixed peg / tuning peg
      ctx.fillStyle = '#475569';
      ctx.fillRect(boxLeft - 18, wireY - 8, 20, 16);
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.arc(boxLeft - 8, wireY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Right frictionless metal Pulley
      const pulleyX = boxRight + 20;
      const pulleyY = wireY + 8;
      const pulleyR = 18;

      // Pulley bracket
      ctx.fillStyle = '#64748B';
      ctx.fillRect(boxRight, wireY - 6, 22, 28);

      // Pulley wheel with metallic sheen
      const pulleyGrad = ctx.createRadialGradient(pulleyX - 4, pulleyY - 4, 3, pulleyX, pulleyY, pulleyR);
      pulleyGrad.addColorStop(0, '#FFFFFF');
      pulleyGrad.addColorStop(0.4, '#CBD5E1');
      pulleyGrad.addColorStop(0.8, '#475569');
      pulleyGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = pulleyGrad;
      ctx.beginPath();
      ctx.arc(pulleyX, pulleyY, pulleyR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulley center screw
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(pulleyX, pulleyY, 4, 0, Math.PI * 2);
      ctx.fill();

      // 3. Millimeter Scale alongside the box
      const scaleY = boxTop + 42;
      ctx.fillStyle = '#FEF3C7'; // Pale ruler yellow
      ctx.fillRect(boxLeft + 15, scaleY, boxWidth - 30, 20);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxLeft + 15, scaleY, boxWidth - 30, 20);

      // Scale markings (0 to 100 cm)
      const scaleStartPx = boxLeft + 25;
      const scaleEndPx = boxRight - 25;
      const scaleLenPx = scaleEndPx - scaleStartPx;

      ctx.fillStyle = '#0F172A';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';

      for (let cm = 0; cm <= 100; cm += 2) {
        const xPos = scaleStartPx + (cm / 100) * scaleLenPx;
        const isTen = cm % 10 === 0;
        const isFive = cm % 5 === 0;
        const markH = isTen ? 10 : isFive ? 6 : 3;

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = isTen ? 1.5 : 0.75;
        ctx.beginPath();
        ctx.moveTo(xPos, scaleY);
        ctx.lineTo(xPos, scaleY + markH);
        ctx.stroke();

        if (isTen) {
          ctx.fillText(`${cm}`, xPos, scaleY + 16);
        }
      }

      // Convert cm to Canvas X & vice-versa
      const cmToPx = (cm: number) => scaleStartPx + (cm / 100) * scaleLenPx;

      const b1Px = cmToPx(bridge1Cm);
      const b2Px = cmToPx(bridge2Cm);

      // 4. Knife-Edge Movable Wooden/Ivory Bridges (Bridge A & Bridge B)
      const drawBridge = (x: number, label: string, cmVal: number, isDragging: boolean) => {
        const bw = 16;
        const bh = 30;
        const by = wireY;

        ctx.save();
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 4;

        // Triangular/Trapezoidal wooden bridge with steel knife-edge tip
        ctx.fillStyle = isDragging ? '#0284C7' : '#B45309';
        ctx.beginPath();
        ctx.moveTo(x - bw / 2, by + bh);
        ctx.lineTo(x + bw / 2, by + bh);
        ctx.lineTo(x + 2, by);
        ctx.lineTo(x - 2, by);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Metallic knife-edge tip at wire contact
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(x - 3, by - 2, 6, 4);

        // Highlight ring if active
        if (isDragging) {
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - bw / 2 - 2, by - 4, bw + 4, bh + 6);
        }

        // Bridge label & reading badge
        ctx.fillStyle = '#0EA5E9';
        ctx.beginPath();
        ctx.roundRect(x - 22, by + bh + 4, 44, 18, 4);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${label}: ${cmVal.toFixed(1)}`, x, by + bh + 16);
      };

      drawBridge(b1Px, 'B1', bridge1Cm, isDraggingBridge1.current);
      drawBridge(b2Px, 'B2', bridge2Cm, isDraggingBridge2.current);

      // 5. Sonometer Taut Wire & Standing Wave Vibration Animation
      // Calculate instantaneous vibration amplitude
      let currentWaveAmp = 0;
      if (isStriking && strikeEnergy > 0.01) {
        // Vibration amplitude depends on resonance match and time decay
        const baseVibe = resonanceCloseness * strikeEnergy * 7;
        currentWaveAmp = baseVibe;
      }

      ctx.save();
      // Tension wire path from left peg -> bridge 1 -> bridge 2 -> pulley -> hanger
      ctx.strokeStyle = currentMaterial.color;
      ctx.lineWidth = Math.max(1.5, currentMaterial.diameterMm * 3.5);
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 2;

      // Segment 1: Left peg to Bridge 1 (static)
      ctx.beginPath();
      ctx.moveTo(boxLeft - 8, wireY);
      ctx.lineTo(b1Px, wireY);
      ctx.stroke();

      // Segment 2: Vibrating segment between Bridge 1 and Bridge 2
      const segLen = b2Px - b1Px;
      ctx.beginPath();
      ctx.moveTo(b1Px, wireY);

      if (currentWaveAmp > 0.2) {
        // Standing wave: y(x, t) = Amp * sin(pi * x / L) * sin(2 * pi * f * t)
        const waveFreq = naturalFreq;
        const oscVal = Math.sin(t * 35); // visual oscillation
        const numSteps = 40;
        for (let s = 1; s <= numSteps; s++) {
          const frac = s / numSteps;
          const xPos = b1Px + frac * segLen;
          // Fundamental standing wave shape sin(pi * frac)
          const envelope = Math.sin(Math.PI * frac);
          const yDisp = currentWaveAmp * envelope * oscVal;
          ctx.lineTo(xPos, wireY + yDisp);
        }
      } else {
        ctx.lineTo(b2Px, wireY);
      }
      ctx.stroke();

      // Segment 3: Bridge 2 to Pulley
      ctx.beginPath();
      ctx.moveTo(b2Px, wireY);
      ctx.lineTo(pulleyX, wireY);
      // Curved around pulley
      ctx.arc(pulleyX, pulleyY, pulleyR, -Math.PI / 2, 0, false);
      // Segment 4: Hanging vertical wire to mass
      const hangerTopY = pulleyY + pulleyR + 30;
      ctx.lineTo(pulleyX + pulleyR, hangerTopY);
      ctx.stroke();
      ctx.restore();

      // 6. Paper Rider (Small inverted V paper rider placed at midpoint of bridges)
      const riderMidCm = (bridge1Cm + bridge2Cm) / 2;
      const riderMidPx = cmToPx(riderMidCm);
      const riderY = wireY - 2;

      ctx.save();
      if (!riderFallen) {
        // Paper Rider resting on wire
        // Rider vibration jitter when wire vibrates
        const jitterY = currentWaveAmp > 0.5 ? Math.sin(t * 40) * (currentWaveAmp * 0.9) : 0;
        const jitterRot = currentWaveAmp > 0.5 ? Math.sin(t * 28) * 0.15 : 0;

        ctx.translate(riderMidPx, riderY + jitterY);
        ctx.rotate(jitterRot);

        // Inverted V shape paper
        ctx.fillStyle = '#EF4444'; // Bright red paper rider for high visibility
        ctx.strokeStyle = '#B91C1C';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-7, 2);
        ctx.lineTo(-4, 2);
        ctx.lineTo(0, -6);
        ctx.lineTo(4, 2);
        ctx.lineTo(7, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Label tooltip
        ctx.fillStyle = '#1E293B';
        ctx.font = '8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paper Rider', 0, -14);
      } else {
        // Fallen Paper Rider on soundbox surface with fly-off displacement
        const fallenX = riderMidPx + riderFlyOffset.x;
        const fallenY = boxTop + boxHeight - 24 + (riderFlyOffset.y * 0.1);

        ctx.translate(fallenX, fallenY);
        ctx.rotate(riderFlyOffset.rot);

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(6, -4);
        ctx.lineTo(4, 3);
        ctx.lineTo(-4, 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 7. Hanging Slotted Weights & Hanger
      const hangerX = pulleyX + pulleyR;
      const numDisks = Math.round(hangingMass / 0.5); // 0.5kg per slotted disc

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Chrome Hanger Rod & Base
      const hangerBaseY = hangerTopY + 20 + numDisks * 10;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hangerX, hangerTopY);
      ctx.lineTo(hangerX, hangerBaseY + 6);
      ctx.stroke();

      // Hanger bottom plate
      ctx.fillStyle = '#475569';
      ctx.fillRect(hangerX - 16, hangerBaseY, 32, 6);

      // Slotted weight discs (metallic brass/chrome)
      for (let d = 0; d < numDisks; d++) {
        const diskY = hangerTopY + 16 + d * 10;
        const diskGrad = ctx.createLinearGradient(hangerX - 22, diskY, hangerX + 22, diskY);
        diskGrad.addColorStop(0, '#CBD5E1');
        diskGrad.addColorStop(0.3, '#F8FAFC');
        diskGrad.addColorStop(0.7, '#94A3B8');
        diskGrad.addColorStop(1, '#475569');

        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.roundRect(hangerX - 22, diskY, 44, 9, 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Slot cutout in disk
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(hangerX - 2, diskY + 1, 4, 7);
      }
      ctx.restore();

      // Mass label
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${hangingMass.toFixed(1)} kg`, hangerX, hangerBaseY + 24);
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`T = ${tension.toFixed(1)} N`, hangerX, hangerBaseY + 36);

      // 8. Tuning Fork Illustration & Vibration Waves
      const forkX = 90;
      const forkY = 60;
      const forkProngLen = 32;

      ctx.save();
      // Fork Stem
      ctx.fillStyle = '#475569';
      ctx.fillRect(forkX - 4, forkY + 20, 8, 25);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(forkX, forkY + 45, 6, 0, Math.PI * 2);
      ctx.fill();

      // Fork U-Prongs
      const prongVibe = isStriking && strikeEnergy > 0.05 ? Math.sin(t * 50) * 3 * strikeEnergy : 0;

      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';

      // Left prong
      ctx.beginPath();
      ctx.moveTo(forkX - 8, forkY + 20);
      ctx.lineTo(forkX - 8 + prongVibe, forkY + 20 - forkProngLen);
      ctx.stroke();

      // Right prong
      ctx.beginPath();
      ctx.moveTo(forkX + 8, forkY + 20);
      ctx.lineTo(forkX + 8 - prongVibe, forkY + 20 - forkProngLen);
      ctx.stroke();

      // Fork base arch
      ctx.beginPath();
      ctx.arc(forkX, forkY + 20, 8, 0, Math.PI);
      ctx.stroke();

      // Tuning Fork Label
      ctx.fillStyle = '#0EA5E9';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Tuning Fork: ${selectedFork} Hz`, forkX + 24, forkY + 10);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(isStriking ? '⚡ Vibrating (Sound waves coupled)' : 'Ready to strike', forkX + 24, forkY + 26);

      // Acoustic wave pulses if vibrating
      if (isStriking && strikeEnergy > 0.05) {
        ctx.strokeStyle = 'rgba(14, 165, 233, ' + (strikeEnergy * 0.6) + ')';
        ctx.lineWidth = 2;
        for (let w = 1; w <= 3; w++) {
          const waveR = 15 + w * 12 + (t * 25) % 15;
          ctx.beginPath();
          ctx.arc(forkX + 60, forkY + 16, waveR, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 9. Resonance Status Banner in Canvas
      ctx.save();
      const bannerX = width / 2 - 140;
      const bannerY = 18;
      const bannerW = 280;
      const bannerH = 34;

      let bannerBg = 'rgba(241, 245, 249, 0.9)';
      let bannerBorder = '#CBD5E1';
      let bannerText = `Natural Freq: ${naturalFreq.toFixed(1)} Hz | Target: ${selectedFork} Hz`;
      let bannerSubtext = `Adjust length L to resonance`;

      if (isResonance) {
        bannerBg = 'rgba(236, 253, 245, 0.95)';
        bannerBorder = '#10B981';
        bannerText = `🎯 PERFECT RESONANCE! (f = ${naturalFreq.toFixed(1)} Hz)`;
        bannerSubtext = riderFallen ? 'Rider flew off with high amplitude!' : 'Paper rider vibrating vigorously!';
      } else if (resonanceCloseness > 0.6) {
        bannerBg = 'rgba(254, 243, 199, 0.95)';
        bannerBorder = '#F59E0B';
        bannerText = `⚡ Close to Resonance (Δf = ${freqDiff.toFixed(1)} Hz)`;
        bannerSubtext = 'Paper rider fluttering gently';
      }

      ctx.fillStyle = bannerBg;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
      ctx.fill();
      ctx.strokeStyle = bannerBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isResonance ? '#065F46' : resonanceCloseness > 0.6 ? '#92400E' : '#0F172A';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bannerText, bannerX + bannerW / 2, bannerY + 14);

      ctx.fillStyle = isResonance ? '#059669' : '#64748B';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(bannerSubtext, bannerX + bannerW / 2, bannerY + 28);
      ctx.restore();

      // Energy decay for strike
      if (strikeEnergy > 0) {
        setStrikeEnergy(prev => Math.max(0, prev - 0.006));
        if (strikeEnergy <= 0.01) {
          setIsStriking(false);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }, [
    selectedFork,
    hangingMass,
    bridge1Cm,
    bridge2Cm,
    selectedMaterialIdx,
    isStriking,
    strikeEnergy,
    riderFallen,
    riderFlyOffset,
    naturalFreq,
    resonanceCloseness,
    isResonance,
    freqDiff,
    currentMaterial,
    tension
  ]);

  // Mouse / Touch handlers for dragging bridges
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const boxLeft = 60;
    const boxRight = canvas.width - 120;
    const scaleStartPx = boxLeft + 25;
    const scaleEndPx = boxRight - 25;
    const scaleLenPx = scaleEndPx - scaleStartPx;

    const cmToPx = (cm: number) => scaleStartPx + (cm / 100) * scaleLenPx;
    const b1Px = cmToPx(bridge1Cm);
    const b2Px = cmToPx(bridge2Cm);

    // Hit test within 20px horizontally and near wire/bridge vertical range
    if (Math.abs(x - b1Px) < 20 && y >= 110 && y <= 210) {
      isDraggingBridge1.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (Math.abs(x - b2Px) < 20 && y >= 110 && y <= 210) {
      isDraggingBridge2.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!isDraggingBridge1.current && !isDraggingBridge2.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;

    const boxLeft = 60;
    const boxRight = canvas.width - 120;
    const scaleStartPx = boxLeft + 25;
    const scaleEndPx = boxRight - 25;
    const scaleLenPx = scaleEndPx - scaleStartPx;

    const pxToCm = (px: number) => {
      const frac = (px - scaleStartPx) / scaleLenPx;
      return Math.max(0, Math.min(100, frac * 100));
    };

    const newCm = Math.round(pxToCm(x) * 10) / 10;

    if (isDraggingBridge1.current) {
      // Keep bridge 1 between 0 and bridge2 - 5 cm
      const clamped = Math.min(bridge2Cm - 5, Math.max(0, newCm));
      setBridge1Cm(clamped);
    } else if (isDraggingBridge2.current) {
      // Keep bridge 2 between bridge1 + 5 cm and 100 cm
      const clamped = Math.max(bridge1Cm + 5, Math.min(100, newCm));
      setBridge2Cm(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingBridge1.current = false;
    isDraggingBridge2.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Theoretical resonant length for current fork & tension: L = (1 / 2f) * sqrt(T / mu)
  const theoreticalResonantLengthCm = Math.min(
    100,
    ((1 / (2 * selectedFork)) * Math.sqrt(tension / mu)) * 100
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 select-none">
      {/* Simulation Header / Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Sonometer — Frequency vs Length & Tension
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Determine the frequency of a tuning fork and verify laws of transverse vibrations of stretched strings: <span className="font-semibold text-slate-700">f = (1 / 2L) √(T / μ)</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              soundEnabled
                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle Web Audio sound effect"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Sound On' : 'Sound Muted'}
          </button>

          <button
            onClick={handleResetRider}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Paper Rider
          </button>
        </div>
      </div>

      {/* Main Simulation Stage Canvas */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col items-center">
        {/* Canvas */}
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

        {/* Primary Action Button Bar */}
        <div className="w-full bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block animate-pulse"></span>
              Drag Bridge 1 & Bridge 2 on the canvas to vary vibrating length L
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStrikeFork}
              disabled={isStriking}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition ${
                isStriking
                  ? 'bg-sky-100 text-sky-400 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-600 text-white active:scale-95 shadow-sky-200 shadow-md'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {isStriking ? 'Fork Vibrating...' : 'Strike Tuning Fork'}
            </button>

            <button
              onClick={addObservation}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Record Reading
            </button>
          </div>
        </div>
      </div>

      {/* Live Measurement Cards & Parameter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Tuning Fork Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Tuning Fork Frequency (f)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {TUNING_FORKS.map(freq => (
                <button
                  key={freq}
                  onClick={() => setSelectedFork(freq)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                    selectedFork === freq
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Target f:</span>
            <span className="font-mono font-bold text-sky-600 text-sm">{selectedFork} Hz</span>
          </div>
        </div>

        {/* Card 2: Hanging Mass / Tension */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Hanging Mass (M)
              </label>
              <span className="text-xs font-bold font-mono text-slate-800">{hangingMass.toFixed(1)} kg</span>
            </div>

            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={hangingMass}
              onChange={e => setHangingMass(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0.5 kg</span>
              <span>2.0 kg</span>
              <span>4.0 kg</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Tension (T = Mg):</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{tension.toFixed(2)} N</span>
          </div>
        </div>

        {/* Card 3: Wire Material & Linear Density */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Wire Material (μ)
            </label>
            <select
              value={selectedMaterialIdx}
              onChange={e => setSelectedMaterialIdx(parseInt(e.target.value))}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {WIRE_MATERIALS.map((mat, idx) => (
                <option key={mat.name} value={idx}>
                  {mat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Linear Mass μ:</span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {(mu * 1000).toFixed(2)} g/m
            </span>
          </div>
        </div>

        {/* Card 4: Vibrating Length & Resonance Closeness */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vibrating Length (L)</span>
              <span className="text-sm font-mono font-bold text-sky-600">{vibratingLengthCm.toFixed(1)} cm</span>
            </div>
            <div className="text-[11px] text-slate-500">
              B1 = {bridge1Cm.toFixed(1)} cm | B2 = {bridge2Cm.toFixed(1)} cm
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Theoretical L:</span>
              <span className="font-mono font-semibold text-emerald-600">
                {theoreticalResonantLengthCm.toFixed(1)} cm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Natural Freq f₀:</span>
              <span className="font-mono font-bold text-slate-800">
                {naturalFreq.toFixed(1)} Hz
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
              Verification of the 1st Law of Stretched Strings: <span className="font-semibold text-slate-700">f × L = Constant</span> (at constant Tension T)
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
            No readings recorded yet. Strike the tuning fork, adjust bridges to resonance, and click &quot;Record Reading&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Fork Freq f (Hz)</th>
                  <th className="py-2.5 px-3">Hanging Mass M (kg)</th>
                  <th className="py-2.5 px-3">Tension T (N)</th>
                  <th className="py-2.5 px-3">Resonating Length L (cm)</th>
                  <th className="py-2.5 px-3">Product f × L (Hz·cm)</th>
                  <th className="py-2.5 px-3">Wire f₀ (Hz)</th>
                  <th className="py-2.5 px-3">Observation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observationTable.map(row => (
                  <tr key={row.srNo} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.srNo}</td>
                    <td className="py-2.5 px-3 font-bold font-mono text-sky-600">{row.forkFreq}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.massKg.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{row.tensionN.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{row.lengthCm.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.flValue.toFixed(1)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{row.naturalFreqHz.toFixed(1)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.status.includes('Resonance')
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status.includes('Partial')
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

        {/* Theoretical Summary Box */}
        <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-sky-950">
          <div>
            <div className="font-bold text-sky-900 mb-0.5">Key Sonometer Laws:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Law of Length:</strong> At constant tension T and linear mass μ, <span className="font-mono font-semibold">f ∝ 1/L</span> (i.e., <span className="font-mono font-semibold">f · L = const</span>).</li>
              <li><strong>Law of Tension:</strong> At constant length L and linear mass μ, <span className="font-mono font-semibold">f ∝ √T</span> (i.e., <span className="font-mono font-semibold">f / √T = const</span>).</li>
              <li><strong>Law of Mass:</strong> At constant length L and tension T, <span className="font-mono font-semibold">f ∝ 1/√μ</span>.</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Fundamental Frequency</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">f = (1 / 2L) √(T / μ)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SonometerLab;
