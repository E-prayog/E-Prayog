// Map of experiment IDs to YouTube video metadata.
// Language-aware: if separate kn/hi videos exist, use { en, kn, hi }.
// Falls back to English if no language-specific video exists.
//
// HOW TO ADD A VIDEO:
//   Single language:    'p1': { videoId: 'ABC123xyz', title: "Ohm's Law" },
//   Multi-language:     'p2': { en: { videoId: 'AAA', title: 'Convex Lens' },
//                                kn: { videoId: 'BBB', title: 'ಸಂಭಾವ್ಯ ಮಸೂರ' } },
//
// Find the videoId in the YouTube URL: youtube.com/watch?v=<videoId>

export type SingleVideo = { videoId: string; title: string };

export type VideoEntry =
  | SingleVideo
  | {
      en: SingleVideo;
      kn?: SingleVideo;
      hi?: SingleVideo;
    };

export const experimentVideos: Record<string, VideoEntry> = {
  // ── PHYSICS (p1 – p12) ────────────────────────────────────────────────────
  // 'p1':  { videoId: '', title: "Ohm's Law" },
  // 'p2':  { videoId: '', title: 'Convex Lens' },
  // 'p3':  { videoId: '', title: 'Concave Mirror' },
  // 'p4':  { videoId: '', title: 'Prism' },
  // 'p5':  { videoId: '', title: "Hooke's Law" },
  // 'p6':  { videoId: '', title: 'Screw Gauge' },
  // 'p7':  { videoId: '', title: 'Vernier Calipers' },
  // 'p8':  { videoId: '', title: 'Simple Pendulum' },
  // 'p9':  { videoId: '', title: 'Sonometer' },
  // 'p10': { videoId: '', title: 'Zener Diode' },
  // 'p11': { videoId: '', title: 'Metre Bridge' },
  // 'p12': { videoId: '', title: 'Potentiometer' },

  // ── CHEMISTRY (c1 – c10) ──────────────────────────────────────────────────
  // 'c1':  { videoId: '', title: 'Titration' },
  // 'c2':  { videoId: '', title: 'KMnO₄ Titration' },
  // 'c3':  { videoId: '', title: 'pH Lab' },
  // 'c4':  { videoId: '', title: 'Rate of Reaction' },
  // 'c5':  { videoId: '', title: 'Chromatography' },
  // 'c6':  { videoId: '', title: 'Salt Analysis' },
  // 'c7':  { videoId: '', title: 'Cation Analysis' },
  // 'c8':  { videoId: '', title: 'Anion Analysis' },
  // 'c9':  { videoId: '', title: 'Potash Alum' },
  // 'c10': { videoId: '', title: 'Thermochemistry' },

  // ── BIOLOGY (b1 – b8) ─────────────────────────────────────────────────────
  // 'b1':  { videoId: '', title: 'Mitosis' },
  // 'b2':  { videoId: '', title: 'Osmosis' },
  // 'b3':  { videoId: '', title: 'Photosynthesis' },
  // 'b4':  { videoId: '', title: 'Blood Group' },
  // 'b5':  { videoId: '', title: 'DNA Isolation' },
  // 'b6':  { videoId: '', title: 'Seed Germination' },
  // 'b7':  { videoId: '', title: 'Stomata' },
  // 'b8':  { videoId: '', title: "Benedict's Test" },

  // ── MATHEMATICS (m1 – m6) ─────────────────────────────────────────────────
  // 'm1':  { videoId: '', title: 'Statistics' },
  // 'm2':  { videoId: '', title: 'Probability' },
  // 'm3':  { videoId: '', title: 'Matrix' },
  // 'm4':  { videoId: '', title: 'Binomial Theorem' },
  // 'm5':  { videoId: '', title: 'Conic Sections' },
  // 'm6':  { videoId: '', title: 'Unit Circle' },

  // ── COMPUTER SCIENCE (cs1 – cs6) ──────────────────────────────────────────
  // 'cs1': { videoId: '', title: 'Bubble Sort' },
  // 'cs2': { videoId: '', title: 'Insertion Sort' },
  // 'cs3': { videoId: '', title: 'Binary Search' },
  // 'cs4': { videoId: '', title: 'Logic Gates' },
  // 'cs5': { videoId: '', title: 'Stack' },
  // 'cs6': { videoId: '', title: 'Queue' },
};
