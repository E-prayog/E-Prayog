import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Restrained Color System Accent Token
const SKY_BLUE = '#38BDF8';

interface AtomModelProps {
  isMobile: boolean;
}

// ── Atom Model (Nucleus + Torus Rings + Locked Electrons) ──
function AtomModel({ isMobile }: AtomModelProps) {
  const atomGroupRef = useRef<THREE.Group>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  
  // Refs for electrons
  const electron1Ref = useRef<THREE.Mesh>(null);
  const electron2Ref = useRef<THREE.Mesh>(null);
  const electron3Ref = useRef<THREE.Mesh>(null);

  // Exact radii matching TorusGeometry args
  const RADIUS_1 = 2.0;
  const RADIUS_2 = 2.7;
  const RADIUS_3 = 3.4;

  useFrame((state, delta) => {
    // Ambient slow idle rotation of the entire atom assembly
    if (atomGroupRef.current) {
      atomGroupRef.current.rotation.y += delta * 0.12;
      atomGroupRef.current.rotation.x += delta * 0.03;
    }

    // Nucleus subtle rotation & breathing pulse
    if (nucleusRef.current) {
      nucleusRef.current.rotation.y -= delta * 0.25;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      nucleusRef.current.scale.setScalar(pulse);
    }

    const t = state.clock.elapsedTime;

    // Electron 1 on Ring 1 (Radius 2.0)
    if (electron1Ref.current) {
      const angle1 = t * 1.4;
      electron1Ref.current.position.x = Math.cos(angle1) * RADIUS_1;
      electron1Ref.current.position.y = Math.sin(angle1) * RADIUS_1;
      electron1Ref.current.position.z = 0;
    }

    // Electron 2 on Ring 2 (Radius 2.7)
    if (electron2Ref.current) {
      const angle2 = t * 1.0 + 2.1;
      electron2Ref.current.position.x = Math.cos(angle2) * RADIUS_2;
      electron2Ref.current.position.y = Math.sin(angle2) * RADIUS_2;
      electron2Ref.current.position.z = 0;
    }

    // Electron 3 on Ring 3 (Radius 3.4)
    if (electron3Ref.current) {
      const angle3 = t * 0.8 + 4.3;
      electron3Ref.current.position.x = Math.cos(angle3) * RADIUS_3;
      electron3Ref.current.position.y = Math.sin(angle3) * RADIUS_3;
      electron3Ref.current.position.z = 0;
    }

    // Camera mouse parallax smooth damp
    const dampFactor = isMobile ? 0.15 : 0.3;
    const pointerX = state.pointer.x * dampFactor;
    const pointerY = state.pointer.y * dampFactor;
    state.camera.position.x += (pointerX - state.camera.position.x) * 0.04;
    state.camera.position.y += (pointerY - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });

  const scale = isMobile ? 0.65 : 1.0;
  const positionY = isMobile ? -0.2 : 0;

  return (
    <group ref={atomGroupRef} scale={scale} position={[0, positionY, 0]}>
      {/* Central Nucleus: Clean Wireframe Icosahedron */}
      <mesh ref={nucleusRef}>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshBasicMaterial
          color={SKY_BLUE}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Nucleus Core Sphere */}
      <mesh>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshBasicMaterial color={SKY_BLUE} transparent opacity={0.25} />
      </mesh>

      {/* ── Orbit Ring 1 (Tilted Group 1) ── */}
      <group rotation={[0.4, 0.2, 0.8]}>
        <mesh>
          <torusGeometry args={[RADIUS_1, 0.012, 16, 100]} />
          <meshBasicMaterial
            color={SKY_BLUE}
            transparent
            opacity={0.5}
          />
        </mesh>
        {/* Electron 1 */}
        <mesh ref={electron1Ref}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color={SKY_BLUE} />
        </mesh>
      </group>

      {/* ── Orbit Ring 2 (Tilted Group 2) ── */}
      <group rotation={[-0.6, 0.5, -0.4]}>
        <mesh>
          <torusGeometry args={[RADIUS_2, 0.012, 16, 100]} />
          <meshBasicMaterial
            color={SKY_BLUE}
            transparent
            opacity={0.35}
          />
        </mesh>
        {/* Electron 2 */}
        <mesh ref={electron2Ref}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={SKY_BLUE} />
        </mesh>
      </group>

      {/* ── Orbit Ring 3 (Tilted Group 3) ── */}
      <group rotation={[0.9, -0.3, 0.2]}>
        <mesh>
          <torusGeometry args={[RADIUS_3, 0.012, 16, 100]} />
          <meshBasicMaterial
            color={SKY_BLUE}
            transparent
            opacity={0.2}
          />
        </mesh>
        {/* Electron 3 */}
        <mesh ref={electron3Ref}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color={SKY_BLUE} />
        </mesh>
      </group>
    </group>
  );
}

// ── WebGL Availability Check ──
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// ── Main Component ──
export default function AtomSceneR3F() {
  const [webglSupported, setWebglSupported] = useState(true);
  const [isInView, setIsInView] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());

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

  if (!webglSupported) {
    return (
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0B1120] via-transparent to-transparent pointer-events-none" />
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <Canvas
        frameloop={isInView ? 'always' : 'never'}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
      >
        <PerspectiveCamera makeDefault position={isMobile ? [0, 0, 8.5] : [0, 0, 7.5]} fov={50} />
        
        {/* Soft Ambient & Directional Lighting — neutral white, no colour cast */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />
        
        {/* Subtle Ambient Sparkles */}
        <Sparkles count={isMobile ? 20 : 35} scale={10} size={1.2} speed={0.3} opacity={0.18} color="#94A3B8" />

        {/* 3D Atom Geometry */}
        <AtomModel isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
