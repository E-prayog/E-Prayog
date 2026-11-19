/**
 * Curated authentic, high-resolution realistic laboratory photography
 * for subjects and practical experiments.
 *
 * Real laboratory equipment, optical benches, chemical glassware,
 * microscopes, electrical instruments, and computing setups.
 */

export interface SubjectImageMeta {
  url: string;
  alt: string;
  caption: string;
}

export const SUBJECT_REALISTIC_IMAGES: Record<string, SubjectImageMeta> = {
  physics: {
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1000&q=80',
    alt: 'Physics laboratory optical bench and laser apparatus',
    caption: 'Optics, Mechanics & Electrical Instrumentation',
  },
  chemistry: {
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1000&q=80',
    alt: 'Chemistry laboratory with volumetric glassware and solutions',
    caption: 'Titration, Qualitative Analysis & Physical Chemistry',
  },
  biology: {
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1000&q=80',
    alt: 'Biology laboratory with optical compound microscope',
    caption: 'Cytology, Plant Physiology & Molecular Biology',
  },
  math: {
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1000&q=80',
    alt: 'Mathematics geometric coordinate models and calculus',
    caption: 'Calculus, Trigonometry & Linear Algebra',
  },
  cs: {
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
    alt: 'Computer Science laboratory workstations and code terminal',
    caption: 'Data Structures, Algorithms & Digital Logic',
  },
};

export const EXPERIMENT_REALISTIC_IMAGES: Record<string, string> = {
  // ── Physics (p1 – p12) ──────────────────────────────────
  p1: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', // Ohm's Law - circuit board, resistors, voltmeter
  p2: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80', // Convex Lens - optical bench
  p3: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', // Concave Mirror - curved reflection
  p4: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80', // Glass Prism - light dispersion
  p5: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80', // Hooke's Law - spring and weights
  p6: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80', // Screw Gauge - precision micrometer
  p7: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80', // Vernier Calipers - steel caliper
  p8: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', // Simple Pendulum - brass bob and stand
  p9: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80', // Sonometer - acoustic vibrating wire
  p10: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', // Zener Diode - semiconductor circuit
  p11: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', // Metre Bridge - bridge resistance wire
  p12: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=800&q=80', // Potentiometer - electrical balance

  // ── Chemistry (c1 – c10) ────────────────────────────────
  c1: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80', // Titration - burette and conical flask
  c2: 'https://images.unsplash.com/photo-1603555501671-8f96b3fce8b4?auto=format&fit=crop&w=800&q=80', // KMnO4 Titration - purple solution
  c3: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=800&q=80', // pH Scale - test tubes and pH indicator
  c4: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80', // Rate of Reaction - kinetics reaction
  c5: 'https://images.unsplash.com/photo-1516387938699-a93567ec168e?auto=format&fit=crop&w=800&q=80', // Paper Chromatography - pigment separation
  c6: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80', // Salt Analysis - test tube rack
  c7: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=800&q=80', // Cation Analysis - flame test
  c8: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=800&q=80', // Anion Analysis - precipitate reaction
  c9: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', // Potash Alum - crystal formation
  c10: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80', // Thermochemistry - calorimeter

  // ── Biology (b1 – b8) ───────────────────────────────────
  b1: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80', // Mitosis - onion root tip under microscope
  b2: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80', // Osmosis - thistle funnel membrane
  b3: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80', // Photosynthesis - aquatic plant & bubbles
  b4: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80', // Blood Group - typing tile & serum
  b5: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80', // DNA Isolation - spooling precipitate
  b6: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80', // Seed Germination - emerging radicle
  b7: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80', // Stomata - epidermal peel stomatal cells
  b8: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', // Benedict's Test - reducing sugars test

  // ── Mathematics (m1 – m6) ───────────────────────────────
  m1: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', // Statistics - frequency histogram curve
  m2: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80', // Probability - probability trials
  m3: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80', // Matrix - coordinate transformation
  m4: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80', // Binomial Theorem - Pascal triangle lattice
  m5: 'https://images.unsplash.com/photo-1453733190028-5716f4778401?auto=format&fit=crop&w=800&q=80', // Conic Sections - geometric conic cuts
  m6: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80', // Unit Circle - trigonometric coordinate circle

  // ── Computer Science (cs1 – cs6) ────────────────────────
  cs1: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80', // Bubble Sort - terminal algorithm execution
  cs2: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80', // Insertion Sort - code IDE workspace
  cs3: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', // Binary Search - binary search index
  cs4: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', // Logic Gates - integrated digital IC circuits
  cs5: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=800&q=80', // Stack LIFO - system stack memory
  cs6: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80', // Queue FIFO - queue buffer structure
};

/**
 * Get realistic image URL for an experiment with fallback to subject image.
 */
export function getRealisticExperimentImage(labId: string, subjectId?: string): string {
  if (EXPERIMENT_REALISTIC_IMAGES[labId]) {
    return EXPERIMENT_REALISTIC_IMAGES[labId];
  }
  if (subjectId && SUBJECT_REALISTIC_IMAGES[subjectId]) {
    return SUBJECT_REALISTIC_IMAGES[subjectId].url;
  }
  return 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80';
}
