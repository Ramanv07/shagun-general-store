
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField({ count = 3000 }) {
  const points = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    const t = state.clock.getElapsedTime();
    points.current.rotation.y = t * 0.03;
    points.current.rotation.x = t * 0.01;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.08}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </Points>
    </group>
  );
}

function FloatingShapes() {
  return (
    <>
      {[...Array(12)].map((_, i) => (
        <Float key={i} speed={1.5} rotationIntensity={1.5} floatIntensity={2}>
          <mesh
            position={[
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 15,
              (Math.random() - 0.5) * 10
            ]}
            scale={Math.random() * 0.4 + 0.1}
          >
            {i % 2 === 0 ? <octahedronGeometry /> : <tetrahedronGeometry />}
            <meshStandardMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={0.15}
              emissive="#ffffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export const Hero3D: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-midnight-950">
      <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <spotLight position={[-10, 10, 20]} angle={0.3} penumbra={1} intensity={2} color="#ffffff" />
        <ParticleField />
        <FloatingShapes />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-950/20 via-transparent to-midnight-950"></div>
    </div>
  );
};

