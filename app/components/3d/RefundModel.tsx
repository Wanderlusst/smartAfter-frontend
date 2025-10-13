'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Refund {
  id: string;
  amount: number;
  status: 'eligible' | 'urgent' | 'pending' | 'completed';
  vendor: string;
  product: string;
  date: string;
  daysUntilDeadline: number;
  reason: string;
  category: string;
}

interface RefundModelProps {
  refunds: Refund[];
  onItemClick: (refund: Refund) => void;
}

function RefundPoint({ refund, position, onClick }: { refund: Refund; position: [number, number, number]; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return '#ef4444';
      case 'eligible': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'completed': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getSize = (amount: number) => {
    if (amount > 1000) return 0.8;
    if (amount > 500) return 0.6;
    return 0.4;
  };

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[getSize(refund.amount), 16, 16]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={getStatusColor(refund.status)}
          transparent
          opacity={0.8}
          emissive={getStatusColor(refund.status)}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </Sphere>
      
      {hovered && (
        <Html position={[0, 1.5, 0]} center>
          <div className="bg-black/80 text-white p-3 rounded-lg text-sm whitespace-nowrap backdrop-blur-sm border border-white/20">
            <div className="font-semibold">{refund.product}</div>
            <div className="text-xs opacity-80">{refund.vendor}</div>
            <div className="font-bold text-green-400">₹{refund.amount.toFixed(2)}</div>
            <div className="text-xs opacity-60">{refund.status}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function RefundScene({ refunds, onItemClick }: RefundModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  // Arrange refunds in a spiral pattern
  const getRefundPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 4;
    const radius = 3 + (index / total) * 2;
    const height = Math.sin(angle * 2) * 2;
    
    return [
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    ] as [number, number, number];
  };

  if (refunds.length === 0) {
    return (
      <Html center>
        <div className="text-center text-white/60">
          <div className="text-2xl mb-2">No refunds available</div>
          <div className="text-sm">Add purchases to see refund opportunities</div>
        </div>
      </Html>
    );
  }

  return (
    <group ref={groupRef}>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Refund points */}
      {refunds.map((refund, index) => (
        <RefundPoint
          key={refund.id}
          refund={refund}
          position={getRefundPosition(index, refunds.length)}
          onClick={() => onItemClick(refund)}
        />
      ))}
      
      {/* Central axis */}
      <Box args={[0.1, 10, 0.1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#374151" transparent opacity={0.3} />
      </Box>
    </group>
  );
}

export default function RefundModel({ refunds, onItemClick }: RefundModelProps) {
  return (
    <div className="w-full h-96 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <RefundScene refunds={refunds} onItemClick={onItemClick} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={20}
          minDistance={5}
        />
      </Canvas>
    </div>
  );
} 