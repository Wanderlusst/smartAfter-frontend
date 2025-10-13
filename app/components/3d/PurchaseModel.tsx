'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Purchase {
  id: string;
  name: string;
  amount: number;
  category: string;
  vendor: string;
  date: string;
  timestamp?: number;
}

interface PurchaseModelProps {
  purchases: Purchase[];
  onItemClick: (purchase: Purchase) => void;
}

function PurchasePoint({ purchase, position, onClick }: { purchase: Purchase; position: [number, number, number]; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': '#f97316',
      'Shopping': '#3b82f6',
      'Transportation': '#22c55e',
      'Entertainment': '#ef4444',
      'Healthcare': '#a855f7',
      'Utilities': '#6b7280',
      'Investment': '#10b981',
      'Digital': '#6366f1',
    };
    return colors[category] || '#6b7280';
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
        args={[getSize(purchase.amount), 16, 16]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={getCategoryColor(purchase.category)}
          transparent
          opacity={0.8}
          emissive={getCategoryColor(purchase.category)}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </Sphere>
      
      {hovered && (
        <Html position={[0, 1.5, 0]} center>
          <div className="bg-black/80 text-white p-3 rounded-lg text-sm whitespace-nowrap backdrop-blur-sm border border-white/20">
            <div className="font-semibold">{purchase.name}</div>
            <div className="text-xs opacity-80">{purchase.vendor}</div>
            <div className="font-bold text-green-400">₹{purchase.amount.toFixed(2)}</div>
            <div className="text-xs opacity-60">{purchase.category}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function PurchaseScene({ purchases, onItemClick }: PurchaseModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  // Arrange purchases in a spiral pattern
  const getPurchasePosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 4;
    const radius = 3 + (index / total) * 2;
    const height = Math.sin(angle * 2) * 2;
    
    return [
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    ] as [number, number, number];
  };

  if (purchases.length === 0) {
    return (
      <Html center>
        <div className="text-center text-white/60">
          <div className="text-2xl mb-2">No purchases available</div>
          <div className="text-sm">Add purchases to see 3D visualization</div>
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
      
      {/* Purchase points */}
      {purchases.map((purchase, index) => (
        <PurchasePoint
          key={purchase.id}
          purchase={purchase}
          position={getPurchasePosition(index, purchases.length)}
          onClick={() => onItemClick(purchase)}
        />
      ))}
      
      {/* Central axis */}
      <Box args={[0.1, 10, 0.1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#374151" transparent opacity={0.3} />
      </Box>
    </group>
  );
}

export default function PurchaseModel({ purchases, onItemClick }: PurchaseModelProps) {
  return (
    <div className="w-full h-96 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <PurchaseScene purchases={purchases} onItemClick={onItemClick} />
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