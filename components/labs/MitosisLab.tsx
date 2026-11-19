import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, Trash2, Eye, ZoomIn, Sparkles, Activity, Microscope } from 'lucide-react';

interface MitosisPhaseInfo {
  name: string;
  stageKey: 'interphase' | 'prophase' | 'metaphase' | 'anaphase' | 'telophase';
  durationPct: number; // approximate % of cell cycle
  color: string;
  description: string;
  keyFeatures: string[];
}

const PHASES: MitosisPhaseInfo[] = [
  {
    name: 'Interphase (G₁ - S - G₂)',
    stageKey: 'interphase',
    durationPct: 75,
    color: '#60A5FA',
    description: 'Period of active cell growth, metabolic synthesis, and DNA replication (S-phase).',
    keyFeatures: ['Intact nuclear envelope with visible nucleolus', 'Diffuse granular chromatin network (uncondensed DNA)', 'Cell prepares enzymes and tubulin for mitosis']
  },
  {
    name: 'Prophase',
    stageKey: 'prophase',
    durationPct: 12,
    color: '#A855F7',
    description: 'Chromatin threads condense and spiral into thick, visible double-stranded chromosomes.',
    keyFeatures: ['Chromosomes appear as paired sister chromatids joined at centromere', 'Nuclear membrane and nucleolus disintegrate', 'Bipolar spindle apparatus forms from microtubule organizing centers']
  },
  {
    name: 'Metaphase',
    stageKey: 'metaphase',
    durationPct: 5,
    color: '#F59E0B',
    description: 'Chromosomes line up along the equatorial plane (metaphase plate) of the cell.',
    keyFeatures: ['Maximum chromosome condensation (best stage for karyotype analysis)', 'Kinetochore fibers attach centromeres to spindle poles', 'Chromosomes oriented perpendicular to the spindle axis']
  },
  {
    name: 'Anaphase',
    stageKey: 'anaphase',
    durationPct: 3,
    color: '#EF4444',
    description: 'Centromeres split simultaneously; sister chromatids are pulled apart toward opposite poles.',
    keyFeatures: ['Chromatids become independent daughter chromosomes', 'Assume characteristic V or L shapes as kinetochores lead migration', 'Shortest and most rapid phase of active mitosis']
  },
  {
    name: 'Telophase & Cytokinesis',
    stageKey: 'telophase',
    durationPct: 5,
    color: '#10B981',
    description: 'Daughter chromosomes reach spindle poles, decondense, and cell plate divides the cytoplasm.',
    keyFeatures: ['Nuclear envelopes reconstruct around each chromosome cluster', 'Nucleoli reappear; chromosomes uncoil into chromatin', 'Phragmoplast guides pectin vesicle fusion to form cell plate']
  }
];

interface CellCountRecord {
  interphase: number;
  prophase: number;
  metaphase: number;
  anaphase: number;
  telophase: number;
}

export const MitosisLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [activeTab, setActiveTab] = useState<'microscope' | 'cytology'>('microscope');
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState<number>(2); // Default to Metaphase
  const [magnification, setMagnification] = useState<'10x' | '40x' | '100x'>('40x');
  const [focusLevel, setFocusLevel] = useState<number>(100); // 0 to 100 (100 = crystal clear)
  const [lightIntensity, setLightIntensity] = useState<number>(85); // %

  // Cell counting tally for Mitotic Index
  const [cellCounts, setCellCounts] = useState<CellCountRecord>({
    interphase: 38,
    prophase: 6,
    metaphase: 3,
    anaphase: 2,
    telophase: 3
  });

  const totalCells = cellCounts.interphase + cellCounts.prophase + cellCounts.metaphase + cellCounts.anaphase + cellCounts.telophase;
  const dividingCells = cellCounts.prophase + cellCounts.metaphase + cellCounts.anaphase + cellCounts.telophase;
  const mitoticIndex = totalCells > 0 ? (dividingCells / totalCells) * 100 : 0;

  const currentPhase = PHASES[selectedPhaseIdx];

  // Increment cell tally
  const handleIncrement = (phaseKey: keyof CellCountRecord) => {
    setCellCounts(prev => ({
      ...prev,
      [phaseKey]: prev[phaseKey] + 1
    }));
  };

  const handleDecrement = (phaseKey: keyof CellCountRecord) => {
    setCellCounts(prev => ({
      ...prev,
      [phaseKey]: Math.max(0, prev[phaseKey] - 1)
    }));
  };

  const handleResetCounts = () => {
    setCellCounts({
      interphase: 0,
      prophase: 0,
      metaphase: 0,
      anaphase: 0,
      telophase: 0
    });
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.04;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Lab bench background
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

      if (activeTab === 'microscope') {
        // --- MICROSCOPE FIELD OF VIEW ---
        const fovCenterX = width * 0.42;
        const fovCenterY = height / 2;
        const fovRadius = 135;

        // Microscope Stage Collar Frame (Black Matte Metal)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(fovCenterX, fovCenterY, fovRadius + 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Inner Brass Retaining Ring
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fovCenterX, fovCenterY, fovRadius + 3, 0, Math.PI * 2);
        ctx.stroke();

        // Optical Field Circular Clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(fovCenterX, fovCenterY, fovRadius, 0, Math.PI * 2);
        ctx.clip();

        // Substage Condenser Light Illumination (Warm tinted microscope field)
        const lightRatio = lightIntensity / 100;
        const lightGrad = ctx.createRadialGradient(
          fovCenterX, fovCenterY, 10,
          fovCenterX, fovCenterY, fovRadius
        );
        lightGrad.addColorStop(0, `rgba(255, 252, 240, ${0.9 * lightRatio})`);
        lightGrad.addColorStop(0.7, `rgba(254, 243, 199, ${0.75 * lightRatio})`);
        lightGrad.addColorStop(1, `rgba(217, 119, 6, ${0.35 * lightRatio})`);
        ctx.fillStyle = lightGrad;
        ctx.fillRect(fovCenterX - fovRadius, fovCenterY - fovRadius, fovRadius * 2, fovRadius * 2);

        // Realistic Focal Plane Depth-of-Field Blur
        const defocusBlur = Math.abs(100 - focusLevel) * 0.12;
        ctx.filter = defocusBlur > 0.5 ? `blur(${defocusBlur.toFixed(1)}px)` : 'none';

        // Draw Onion Root Tip Meristematic Cells Smear
        // Acetocarmine Stained Cells Grid
        const cellCols = magnification === '10x' ? 8 : magnification === '40x' ? 5 : 3;
        const cellRows = magnification === '10x' ? 8 : magnification === '40x' ? 5 : 3;
        const cellW = (fovRadius * 2.2) / cellCols;
        const cellH = (fovRadius * 2.2) / cellRows;

        for (let c = -cellCols / 2; c <= cellCols / 2; c++) {
          for (let r = -cellRows / 2; r <= cellRows / 2; r++) {
            const cx = fovCenterX + c * cellW;
            const cy = fovCenterY + r * cellH;

            // Seeded deterministic phase assignment for smear realism
            const hash = Math.abs(Math.sin(c * 37.1 + r * 91.7)) * 100;
            let cellPhase: 'interphase' | 'prophase' | 'metaphase' | 'anaphase' | 'telophase' = 'interphase';

            if (hash < 68) cellPhase = 'interphase';
            else if (hash < 80) cellPhase = 'prophase';
            else if (hash < 89) cellPhase = 'metaphase';
            else if (hash < 94) cellPhase = 'anaphase';
            else cellPhase = 'telophase';

            // Plant Cell Wall (Rectangular/Hexagonal with rounded corners)
            ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
            ctx.beginPath();
            ctx.roundRect(cx - cellW * 0.46, cy - cellH * 0.44, cellW * 0.92, cellH * 0.88, 3);
            ctx.fill();
            ctx.stroke();

            // Cytoplasm pale eosin/acetocarmine background
            ctx.fillStyle = 'rgba(244, 114, 182, 0.15)';
            ctx.fill();

            // Nucleus / Chromosomes based on phase (Acetocarmine deep purple-red #9333EA / #831843)
            ctx.fillStyle = '#831843';
            ctx.strokeStyle = '#500724';

            if (cellPhase === 'interphase') {
              // Intact round nucleus with nucleolus
              ctx.beginPath();
              ctx.arc(cx, cy, cellW * 0.22, 0, Math.PI * 2);
              ctx.fill();
              // Darker nucleolus dot
              ctx.fillStyle = '#4C0519';
              ctx.beginPath();
              ctx.arc(cx + cellW * 0.05, cy - cellH * 0.05, cellW * 0.07, 0, Math.PI * 2);
              ctx.fill();
            } else if (cellPhase === 'prophase') {
              // Tangled condensed chromatin threads
              ctx.strokeStyle = '#831843';
              ctx.lineWidth = 1.8;
              for (let line = 0; line < 5; line++) {
                ctx.beginPath();
                ctx.arc(cx + (line - 2) * 2, cy, cellW * 0.18, line * 0.6, line * 0.6 + 2.5);
                ctx.stroke();
              }
            } else if (cellPhase === 'metaphase') {
              // Condensed chromosomes aligned tightly on equatorial line
              ctx.fillStyle = '#831843';
              for (let chrom = -2; chrom <= 2; chrom++) {
                ctx.fillRect(cx - cellW * 0.06, cy + chrom * (cellH * 0.09) - 3, cellW * 0.12, 6);
              }
            } else if (cellPhase === 'anaphase') {
              // Two separate clusters of V-shaped chromatids moving to poles
              ctx.fillStyle = '#831843';
              [-1, 1].forEach(pole => {
                const px = cx + pole * (cellW * 0.18);
                ctx.beginPath();
                ctx.moveTo(px, cy - cellH * 0.15);
                ctx.lineTo(px + pole * 4, cy);
                ctx.lineTo(px, cy + cellH * 0.15);
                ctx.fill();
              });
            } else if (cellPhase === 'telophase') {
              // Two reforming nuclei at opposite poles with central cell plate line
              [-1, 1].forEach(pole => {
                ctx.beginPath();
                ctx.arc(cx + pole * (cellW * 0.22), cy, cellW * 0.12, 0, Math.PI * 2);
                ctx.fill();
              });
              // Faint cell plate forming
              ctx.strokeStyle = '#D97706';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx, cy - cellH * 0.35);
              ctx.lineTo(cx, cy + cellH * 0.35);
              ctx.stroke();
            }
          }
        }

        ctx.filter = 'none'; // reset filter
        ctx.restore(); // restore clipping

        // Eyepiece crosshairs & Scale Bar in Field of View
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(fovCenterX - 15, fovCenterY);
        ctx.lineTo(fovCenterX + 15, fovCenterY);
        ctx.moveTo(fovCenterX, fovCenterY - 15);
        ctx.lineTo(fovCenterX, fovCenterY + 15);
        ctx.stroke();

        // Micron Scale Bar in Microscope View
        const scaleBarW = magnification === '10x' ? 50 : magnification === '40x' ? 80 : 120;
        const scaleBarY = fovCenterY + fovRadius - 20;
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fovCenterX - scaleBarW / 2, scaleBarY);
        ctx.lineTo(fovCenterX + scaleBarW / 2, scaleBarY);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(magnification === '10x' ? '100 µm' : magnification === '40x' ? '25 µm' : '10 µm', fovCenterX, scaleBarY - 4);

        // Microscope Controls & Readouts on the Right Side
        const panelX = width * 0.72;
        const panelY = 40;
        const panelW = 200;

        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, 230, 8);
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Header
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('OPTICAL SPECIFICATIONS', panelX + 14, panelY + 22);

        // Info List
        const items = [
          { label: 'Specimen', val: 'Onion Root Tip (Allium cepa)' },
          { label: 'Stain', val: 'Acetocarmine / 1N HCl' },
          { label: 'Magnification', val: magnification },
          { label: 'Field Quality', val: focusLevel > 90 ? 'Crisp (Focused)' : 'Blurred (Adjust Focus)' },
          { label: 'Illumination', val: `${lightIntensity}% LED` }
        ];

        items.forEach((item, idx) => {
          const iy = panelY + 48 + idx * 34;
          ctx.fillStyle = '#64748B';
          ctx.font = '9px system-ui';
          ctx.fillText(item.label, panelX + 14, iy);
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 10px system-ui';
          ctx.fillText(item.val, panelX + 14, iy + 14);
        });
        ctx.restore();

      } else {
        // --- CYTOLOGY HIGH-RES CELL EXPLORER ---
        const cellCenterX = width * 0.42;
        const cellCenterY = height / 2;
        const cellRadius = 120;

        // Large High-Res Plant Cell
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // Plant Cell Wall (Pectin & Cellulose double border)
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 6;
        ctx.fillStyle = 'rgba(254, 249, 195, 0.4)';
        ctx.beginPath();
        ctx.roundRect(cellCenterX - 180, cellCenterY - cellRadius, 360, cellRadius * 2, 16);
        ctx.fill();
        ctx.stroke();

        // Inner Plasma Membrane
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cellCenterX - 176, cellCenterY - cellRadius + 4, 352, cellRadius * 2 - 8, 14);
        ctx.stroke();

        // Cytoplasm with organelles
        ctx.fillStyle = 'rgba(244, 114, 182, 0.12)';
        ctx.fill();
        ctx.restore();

        // Draw Stage-Specific Chromosome Architecture
        const phase = currentPhase.stageKey;

        if (phase === 'interphase') {
          // Intact Nuclear Membrane
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.arc(cellCenterX, cellCenterY, 65, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Nucleoplasm
          ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
          ctx.fill();

          // Dense Nucleolus
          ctx.fillStyle = '#4C0519';
          ctx.beginPath();
          ctx.arc(cellCenterX - 18, cellCenterY - 14, 14, 0, Math.PI * 2);
          ctx.fill();

          // Diffuse Chromatin Network
          ctx.strokeStyle = '#831843';
          ctx.lineWidth = 1.2;
          for (let w = 0; w < 12; w++) {
            ctx.beginPath();
            ctx.arc(cellCenterX + Math.sin(w) * 25, cellCenterY + Math.cos(w) * 25, 20, w, w + 1.8);
            ctx.stroke();
          }

          // Label
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Diffuse Chromatin & Intact Nucleolus', cellCenterX, cellCenterY + 85);

        } else if (phase === 'prophase') {
          // Dissolving Nuclear Envelope (dashed fragmenting circle)
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(cellCenterX, cellCenterY, 70, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Thick Condensed Chromosomes (4 pairs of sister chromatids)
          ctx.fillStyle = '#831843';
          ctx.strokeStyle = '#4C0519';
          ctx.lineWidth = 2;

          for (let p = 0; p < 6; p++) {
            const angle = (p / 6) * Math.PI * 2 + 0.3;
            const px = cellCenterX + Math.cos(angle) * 35;
            const py = cellCenterY + Math.sin(angle) * 35;

            // X-shaped double chromatid chromosome
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
            ctx.moveTo(14, -14); ctx.lineTo(-14, 14);
            ctx.stroke();
            // Centromere dot
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Condensing Chromosomes (Sister Chromatids)', cellCenterX, cellCenterY + 95);

        } else if (phase === 'metaphase') {
          // Spindle Poles at Left and Right
          const poleL = cellCenterX - 130;
          const poleR = cellCenterX + 130;

          // Spindle Fibers converging from poles to equator
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
          ctx.lineWidth = 1.2;

          for (let f = -3; f <= 3; f++) {
            const eqY = cellCenterY + f * 22;
            ctx.beginPath();
            ctx.moveTo(poleL, cellCenterY);
            ctx.lineTo(cellCenterX, eqY);
            ctx.lineTo(poleR, cellCenterY);
            ctx.stroke();
          }

          // Equatorial Metaphase Plate (Vertical line of chromosomes)
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(cellCenterX, cellCenterY - 80);
          ctx.lineTo(cellCenterX, cellCenterY + 80);
          ctx.stroke();
          ctx.setLineDash([]);

          // 5 Chromosomes aligned along equatorial plate
          for (let c = -2; c <= 2; c++) {
            const cy = cellCenterY + c * 26;
            ctx.fillStyle = '#831843';
            ctx.strokeStyle = '#4C0519';
            ctx.lineWidth = 2.5;

            ctx.save();
            ctx.translate(cellCenterX, cy);
            // Chromosome arms oriented along plate
            ctx.beginPath();
            ctx.moveTo(-16, -4); ctx.lineTo(16, -4);
            ctx.moveTo(-16, 4); ctx.lineTo(16, 4);
            ctx.stroke();
            // Kinetochore / Centromere
            ctx.fillStyle = '#0284C7';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Equatorial Alignment on Metaphase Plate', cellCenterX, cellCenterY + 95);

        } else if (phase === 'anaphase') {
          const poleL = cellCenterX - 130;
          const poleR = cellCenterX + 130;

          // Shortened Kinetochore Spindle Microtubules
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)';
          ctx.lineWidth = 1.2;

          for (let f = -2; f <= 2; f++) {
            const cy = cellCenterY + f * 24;
            // Left fibers
            ctx.beginPath();
            ctx.moveTo(poleL, cellCenterY);
            ctx.lineTo(cellCenterX - 55, cy);
            ctx.stroke();
            // Right fibers
            ctx.beginPath();
            ctx.moveTo(poleR, cellCenterY);
            ctx.lineTo(cellCenterX + 55, cy);
            ctx.stroke();
          }

          // V-shaped Daughter Chromatids migrating towards poles
          ctx.strokeStyle = '#831843';
          ctx.lineWidth = 3;

          for (let c = -2; c <= 2; c++) {
            const cy = cellCenterY + c * 24;

            // Moving Left (V pointing toward Left pole)
            ctx.beginPath();
            ctx.moveTo(cellCenterX - 42, cy - 10);
            ctx.lineTo(cellCenterX - 58, cy);
            ctx.lineTo(cellCenterX - 42, cy + 10);
            ctx.stroke();

            // Moving Right (V pointing toward Right pole)
            ctx.beginPath();
            ctx.moveTo(cellCenterX + 42, cy - 10);
            ctx.lineTo(cellCenterX + 58, cy);
            ctx.lineTo(cellCenterX + 42, cy + 10);
            ctx.stroke();
          }

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Centromeres Split: Chromatids Move to Opposite Poles', cellCenterX, cellCenterY + 95);

        } else if (phase === 'telophase') {
          // Two Reforming Nuclear Envelopes
          [-1, 1].forEach(pole => {
            const nx = cellCenterX + pole * 85;
            ctx.strokeStyle = '#8B5CF6';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.arc(nx, cellCenterY, 38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Decondensing Chromatin threads
            ctx.strokeStyle = '#831843';
            ctx.lineWidth = 1.2;
            for (let tLine = 0; tLine < 5; tLine++) {
              ctx.beginPath();
              ctx.arc(nx, cellCenterY, 18, tLine, tLine + 1.5);
              ctx.stroke();
            }
          });

          // Cell Plate Formation (Phragmoplast vesicles fusing at equator)
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cellCenterX, cellCenterY - 80);
          ctx.lineTo(cellCenterX, cellCenterY + 80);
          ctx.stroke();

          // Pectin droplets along cell plate
          for (let pY = cellCenterY - 70; pY <= cellCenterY + 70; pY += 15) {
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(cellCenterX, pY, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Cell Plate (Phragmoplast) & Nuclear Reconstitution', cellCenterX, cellCenterY + 95);
        }

        // Details Panel on Right
        const panelX = width * 0.72;
        const panelY = 40;
        const panelW = 200;

        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, 230, 8);
        ctx.fill();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = currentPhase.color;
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(currentPhase.name.toUpperCase(), panelX + 14, panelY + 22);

        ctx.fillStyle = '#64748B';
        ctx.font = '9px system-ui';
        ctx.fillText(`Duration: ~${currentPhase.durationPct}% of cycle`, panelX + 14, panelY + 36);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 9px system-ui';
        ctx.fillText('Diagnostic Cytological Features:', panelX + 14, panelY + 58);

        currentPhase.keyFeatures.forEach((feat, idx) => {
          ctx.fillStyle = '#475569';
          ctx.font = '8.5px system-ui';
          const fy = panelY + 76 + idx * 45;
          ctx.fillText(`• ${feat.slice(0, 30)}`, panelX + 14, fy);
          if (feat.length > 30) {
            ctx.fillText(`  ${feat.slice(30)}`, panelX + 14, fy + 12);
          }
        });
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, selectedPhaseIdx, magnification, focusLevel, lightIntensity, currentPhase]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 select-none">
      {/* Simulation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            Mitosis in Onion Root Tip Cells (Allium Cepa)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Observe and identify the 5 stages of mitosis in meristematic root cells, calculate the <span className="font-semibold text-slate-700">Mitotic Index (MI)</span>, and study chromosomal dynamics.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('microscope')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'microscope' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            Microscope Field View
          </button>
          <button
            onClick={() => setActiveTab('cytology')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'cytology' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            High-Res Stage Cytology
          </button>
        </div>
      </div>

      {/* Main Simulation Stage Canvas */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={320}
          className="w-full h-auto"
        />

        {/* Action Controls Bar */}
        <div className="w-full bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {activeTab === 'microscope' ? (
            <>
              <div className="flex items-center gap-4 text-xs">
                <span className="font-semibold text-slate-500">Objective:</span>
                {(['10x', '40x', '100x'] as const).map(mag => (
                  <button
                    key={mag}
                    onClick={() => setMagnification(mag)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      magnification === mag
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mag}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFocusLevel(100)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition"
                >
                  Auto-Fine Focus (100%)
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto w-full">
              <span className="text-xs font-semibold text-slate-500 shrink-0 mr-2">Mitotic Phase:</span>
              {PHASES.map((p, idx) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPhaseIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                    selectedPhaseIdx === idx
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Controls & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Focus Knob Adjustment */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Fine Focus Knob
              </label>
              <span className="text-sm font-bold font-mono text-sky-600">{focusLevel}%</span>
            </div>

            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={focusLevel}
              onChange={e => setFocusLevel(parseInt(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Coarse</span>
              <span>Sub-optimal</span>
              <span>Sharp Focus</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Optics Status:</span>
            <span className={`font-bold ${focusLevel >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {focusLevel >= 95 ? '✓ Crisp Focus' : 'Blurry (Adjust)'}
            </span>
          </div>
        </div>

        {/* Card 2: Light Illumination */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Condenser Diaphragm
              </label>
              <span className="text-sm font-bold font-mono text-slate-800">{lightIntensity}%</span>
            </div>

            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={lightIntensity}
              onChange={e => setLightIntensity(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Dim</span>
              <span>Optimal</span>
              <span>Bright</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Stain Contrast:</span>
            <span className="font-semibold text-slate-800">Acetocarmine</span>
          </div>
        </div>

        {/* Card 3: Mitotic Index (MI) Calculator */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mitotic Index (MI)</span>
              <span className="text-base font-mono font-bold text-indigo-600">{mitoticIndex.toFixed(1)}%</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {dividingCells} dividing cells / {totalCells} total counted
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Standard Root MI:</span>
            <span className="font-mono font-bold text-emerald-600">15% &ndash; 25%</span>
          </div>
        </div>

        {/* Card 4: Action / Reset Tally */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Cell Counter Controls
            </span>
            <div className="text-[11px] text-slate-500">
              Tally cells in the table below to calculate Mitotic Index
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={handleResetCounts}
              className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Cell Counts
            </button>
          </div>
        </div>
      </div>

      {/* Observation Table: Cell Counter & Mitotic Index Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Observation Table: Cell Stage Frequencies</h3>
            <p className="text-xs text-slate-500">
              Count cells in each mitotic stage across the field of view to compute <span className="font-semibold text-slate-700">Mitotic Index = (Dividing Cells / Total Cells) &times; 100%</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2.5 px-3">Stage of Cell Division</th>
                <th className="py-2.5 px-3">Distinct Cytological Features</th>
                <th className="py-2.5 px-3">Number of Cells Counted</th>
                <th className="py-2.5 px-3">Quick Tally Controls</th>
                <th className="py-2.5 px-3">Stage Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PHASES.map(p => {
                const count = cellCounts[p.stageKey];
                const pct = totalCells > 0 ? ((count / totalCells) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={p.stageKey} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs">{p.keyFeatures[0]}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-sm">{count}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDecrement(p.stageKey)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleIncrement(p.stageKey)}
                          className="w-6 h-6 rounded bg-sky-500 hover:bg-sky-600 text-white font-bold flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-900">
                <td className="py-2.5 px-3" colSpan={2}>
                  Total Cells Counted: {totalCells} (Dividing: {dividingCells})
                </td>
                <td className="py-2.5 px-3 font-mono text-indigo-700" colSpan={3}>
                  Calculated Mitotic Index (MI) = {mitoticIndex.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Theoretical Summary */}
        <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-sky-950">
          <div>
            <div className="font-bold text-sky-900 mb-0.5">Key Biological Principles:</div>
            <ul className="list-disc list-inside text-sky-800 space-y-0.5">
              <li><strong>Meristematic Zone:</strong> Onion root tip apical meristem contains rapidly proliferating diploid cells (2n = 16).</li>
              <li><strong>Mitotic Index Formula:</strong> MI = (P + M + A + T) / (Total Cells) &times; 100%.</li>
              <li><strong>Fixation &amp; Hydrolysis:</strong> Warm 1N HCl hydrolyzes middle lamella pectin for single-layer squashing.</li>
            </ul>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg border border-sky-200 text-center shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Mitotic Index</div>
            <div className="font-mono font-bold text-sm text-sky-600 mt-0.5">MI = (Dividing / Total) &times; 100%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MitosisLab;
