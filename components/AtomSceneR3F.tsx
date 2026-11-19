import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const COLOR_BRASS = '#C99A3A';
const COLOR_VERDIGRIS = '#2E7D6B';
const COLOR_PAPER = '#F1EBDD';
const COLOR_CHALK = '#B9B09A';
const COLOR_WARM_LIGHT = '#FFF8E7';

interface AtomProps {
  isMobile: boolean;
  atomGroupRef: React.RefObject<THREE.Group | null>;
}

function AtomSceneInner({ isMobile, atomGroupRef }: AtomProps) {
  const nucleusRef = useRef<THREE.Mesh>(null);

  // Group refs for the 3 rings
  const ring1GroupRef = useRef<THREE.Group>(null);
  const ring2GroupRef = useRef<THREE.Group>(null);
  const ring3GroupRef = useRef<THREE.Group>(null);

  // Electron refs (children of their ring groups)
  const electron1Ref = useRef<THREE.Mesh>(null);
  const electron2Ref = useRef<THREE.Mesh>(null);
  const electron3Ref = useRef<THREE.Mesh>(null);

  const R1 = 1.9;
  const R2 = 2.6;
  const R3 = 3.3;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Slow ambient rotation of whole atom assembly
    if (atomGroupRef.current) {
      atomGroupRef.current.rotation.y += delta * 0.08;
    }

    // Nucleus slow counter rotation
    if (nucleusRef.current) {
      nucleusRef.current.rotation.y -= delta * 0.15;
      nucleusRef.current.rotation.x += delta * 0.05;
    }

    // Rings rotate slowly as groups
    if (ring1GroupRef.current) {
      ring1GroupRef.current.rotation.z += delta * 0.05;
    }
    if (ring2GroupRef.current) {
      ring2GroupRef.current.rotation.y += delta * 0.06;
    }
    if (ring3GroupRef.current) {
      ring3GroupRef.current.rotation.x += delta * 0.04;
    }

    // Orbit 1: electron position in local ring space
    if (electron1Ref.current) {
      const theta1 = t * 1.5;
      electron1Ref.current.position.x = R1 * Math.cos(theta1);
      electron1Ref.current.position.z = R1 * Math.sin(theta1);
      electron1Ref.current.position.y = 0;
    }

    // Orbit 2: electron position in local ring space
    if (electron2Ref.current) {
      const theta2 = t * 1.1 + 1.8;
      electron2Ref.current.position.x = R2 * Math.cos(theta2);
      electron2Ref.current.position.z = R2 * Math.sin(theta2);
      electron2Ref.current.position.y = 0;
    }

    // Orbit 3: electron position in local ring space
    if (electron3Ref.current) {
      const theta3 = t * 0.85 + 3.5;
      electron3Ref.current.position.x = R3 * Math.cos(theta3);
      electron3Ref.current.position.z = R3 * Math.sin(theta3);
      electron3Ref.current.position.y = 0;
    }

    // Camera slow idle drift + damped mouse parallax
    const damp = isMobile ? 0.12 : 0.28;
    const targetX = state.pointer.x * damp;
    const targetY = state.pointer.y * damp + Math.sin(t * 0.5) * 0.08;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.035;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.035;
    state.camera.lookAt(0, 0, 0);
  });

  const tube = 0.008;
  const radialSegments = 16;
  const tubularSegments = isMobile ? 64 : 128;

  return (
    <group ref={atomGroupRef} scale={isMobile ? 0.72 : 1.05}>
      {/* Central Nucleus: IcosahedronGeometry, MeshStandardMaterial, Brass #C99A3A */}
      <mesh ref={nucleusRef}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color={COLOR_BRASS}
          roughness={0.4}
          metalness={0.65}
        />
      </mesh>

      {/* Orbit Ring 1: tilt [0, 0, 0], opacity 0.9 */}
      <group ref={ring1GroupRef} rotation={[0, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R1, tube, radialSegments, tubularSegments]} />
          <meshBasicMaterial
            color={COLOR_VERDIGRIS}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Electron 1: CHILD of Ring 1 group */}
        <mesh ref={electron1Ref}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={COLOR_PAPER} />
        </mesh>
      </group>

      {/* Orbit Ring 2: tilt [Math.PI/4, 0, 0], opacity 0.6 */}
      <group ref={ring2GroupRef} rotation={[Math.PI / 4, 0, 0.2]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R2, tube, radialSegments, tubularSegments]} />
          <meshBasicMaterial
            color={COLOR_VERDIGRIS}
            transparent
            opacity={0.6}
          />
        </mesh>
        {/* Electron 2: CHILD of Ring 2 group */}
        <mesh ref={electron2Ref}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={COLOR_PAPER} />
        </mesh>
      </group>

      {/* Orbit Ring 3: tilt [-Math.PI/3, 0, 0], opacity 0.4 */}
      <group ref={ring3GroupRef} rotation={[-Math.PI / 3, 0.3, -0.2]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R3, tube, radialSegments, tubularSegments]} />
          <meshBasicMaterial
            color={COLOR_VERDIGRIS}
            transparent
            opacity={0.4}
          />
        </mesh>
        {/* Electron 3: CHILD of Ring 3 group */}
        <mesh ref={electron3Ref}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={COLOR_PAPER} />
        </mesh>
      </group>
    </group>
  );
}

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export default function AtomSceneR3F() {
  const [webglSupported, setWebglSupported] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const atomGroupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    const hasWebGL = isWebGLAvailable();
    setWebglSupported(hasWebGL);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  // GSAP ScrollTrigger scrub: camera pulls back + atom rotates 40deg on scroll
  useEffect(() => {
    if (!containerRef.current || reducedMotion || !webglSupported) return;

    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        if (cameraRef.current) {
          // Camera pulls back on scroll
          cameraRef.current.position.z = 7.5 + progress * 2.5;
        }
        if (atomGroupRef.current) {
          // Atom rotates 40 degrees (approx 0.7 rad)
          atomGroupRef.current.rotation.x = progress * (40 * Math.PI / 180);
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, [reducedMotion, webglSupported]);

  // Static SVG fallback if WebGL fails or user prefers reduced motion
  if (!webglSupported || reducedMotion) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-4/5 h-4/5 max-w-[360px] opacity-75"
          fill="none"
        >
          <ellipse cx="100" cy="100" rx="70" ry="24" stroke={COLOR_VERDIGRIS} strokeWidth="1.2" opacity="0.9" />
          <ellipse cx="100" cy="100" rx="70" ry="24" stroke={COLOR_VERDIGRIS} strokeWidth="1.2" opacity="0.6" transform="rotate(45 100 100)" />
          <ellipse cx="100" cy="100" rx="70" ry="24" stroke={COLOR_VERDIGRIS} strokeWidth="1.2" opacity="0.4" transform="rotate(-60 100 100)" />
          <circle cx="100" cy="100" r="16" fill={COLOR_BRASS} />
          <circle cx="170" cy="100" r="3" fill={COLOR_PAPER} />
          <circle cx="149" cy="149" r="3" fill={COLOR_PAPER} />
          <circle cx="65" cy="160" r="3" fill={COLOR_PAPER} />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full pointer-events-none overflow-hidden"
    >
      <Canvas
        frameloop={isInView ? 'always' : 'never'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
      >
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={isMobile ? [0, 0, 8.2] : [0, 0, 7.5]}
          fov={48}
        />

        {/* ONE warm directional light (#FFF8E7, intensity 1.5) + low ambient (0.3) */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[6, 8, 5]}
          intensity={1.5}
          color={COLOR_WARM_LIGHT}
        />

        {/* Sparse dust field (< 60 points, color var(--chalk) #B9B09A, opacity 0.3) */}
        <Sparkles
          count={isMobile ? 25 : 45}
          scale={9}
          size={1.1}
          speed={0.2}
          opacity={0.3}
          color={COLOR_CHALK}
        />

        {/* 3D Atom Geometry */}
        <AtomSceneInner isMobile={isMobile} atomGroupRef={atomGroupRef} />
      </Canvas>
    </div>
  );
}
