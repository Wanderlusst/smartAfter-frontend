'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Cylinder, Html, Torus, Ring, Cone } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

interface WarrantyItem {
  id: string;
  product: string;
  expiryDate: string;
  status: string;
  daysLeft: number;
}

interface WarrantyModelProps {
  warranties: WarrantyItem[];
  onItemClick?: (item: WarrantyItem) => void;
}

function FloatingWarrantyPoint({ 
  item, 
  index, 
  onClick, 
  isSelected,
  onHover 
}: { 
  item: WarrantyItem; 
  index: number; 
  onClick: () => void;
  isSelected: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Spring animations
  const { scale, position } = useSpring({
    scale: hovered || isSelected ? 1.5 : 1,
    position: [index * 3 - 6, Math.sin(index * 0.5) * 2 + 3, 0],
    config: { mass: 1, tension: 280, friction: 60 }
  });

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.015;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + index) * 0.35 + 2;
      meshRef.current.position.x = Math.cos(state.clock.elapsedTime * 0.6 + index) * 0.25;
    }
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': '#10B981',
      'expired': '#EF4444',
      'expiring': '#F59E0B',
      'default': '#6B7280'
    };
    return colors[status] || colors.default;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      'active': '🛡️',
      'expired': '⚠️',
      'expiring': '⏰',
      'default': '🔒'
    };
    return icons[status] || icons.default;
  };

  const handleHover = (hover: boolean) => {
    setHovered(hover);
    onHover(hover);
  };

  return (
    <animated.mesh
      ref={meshRef}
      scale={scale}
      position={position as any}
      onClick={onClick}
      onPointerOver={() => handleHover(true)}
      onPointerOut={() => handleHover(false)}
    >
      {/* Main Floating Point */}
      <Sphere args={[0.3, 16, 16]}>
        <meshStandardMaterial 
          color={getStatusColor(item.status)}
          emissive={getStatusColor(item.status)}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </Sphere>

      {/* Glow Effect */}
      {hovered && (
        <mesh position={[0, 0, 0]}>
          <Ring args={[0.5, 0.7, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial 
              color={getStatusColor(item.status)} 
              transparent 
              opacity={0.4} 
            />
          </Ring>
        </mesh>
      )}

      {/* Glassmorphism Label */}
      <Html position={[0, 1.2, 0]} center>
        <div className={`
          bg-white/10 backdrop-blur-md border border-white/20 
          px-4 py-3 rounded-xl shadow-2xl
          ${hovered ? 'scale-110' : 'scale-100'}
          transition-all duration-300 ease-out
          min-w-[200px]
        `}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{getStatusIcon(item.status)}</span>
            <span className="text-lg font-bold text-white">
              {item.daysLeft} days
            </span>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            <div className="font-medium text-white capitalize">{item.status}</div>
            <div className="text-xs opacity-80">{item.product}</div>
          </div>
        </div>
      </Html>

      {/* Connection Lines */}
      {hovered && (
        <mesh position={[0, 0, 0]}>
          <Cylinder args={[0.02, 0.02, 2, 8]} position={[0, -1, 0]}>
            <meshStandardMaterial 
              color={getStatusColor(item.status)} 
              transparent 
              opacity={0.6} 
            />
          </Cylinder>
        </mesh>
      )}
    </animated.mesh>
  );
}

function TimelineSlider({ warranties, currentIndex, onIndexChange }: {
  warranties: WarrantyItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3">
        <input
          type="range"
          min={0}
          max={Math.max(0, warranties.length - 1)}
          value={currentIndex}
          onChange={(e) => onIndexChange(parseInt(e.target.value))}
          className="w-64 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="text-center text-white text-sm mt-2">
          {warranties[currentIndex]?.expiryDate || 'No warranties'}
        </div>
      </div>
    </div>
  );
}

function StatusLegend({ statuses, visibleStatuses, onToggleStatus }: {
  statuses: string[];
  visibleStatuses: Set<string>;
  onToggleStatus: (status: string) => void;
}) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': '#10B981',
      'expired': '#EF4444',
      'expiring': '#F59E0B',
      'default': '#6B7280'
    };
    return colors[status] || colors.default;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      'active': '🛡️',
      'expired': '⚠️',
      'expiring': '⏰',
      'default': '🔒'
    };
    return icons[status] || icons.default;
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Status</h3>
        <div className="space-y-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => onToggleStatus(status)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg transition-all
                ${visibleStatuses.has(status) 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 text-gray-400'
                }
              `}
            >
              <span className="text-lg">{getStatusIcon(status)}</span>
              <span className="text-sm capitalize">{status}</span>
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(status) }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WarrantyScene({ 
  warranties, 
  onItemClick, 
  visibleStatuses,
  selectedItem 
}: {
  warranties: WarrantyItem[];
  onItemClick: (item: WarrantyItem) => void;
  visibleStatuses: Set<string>;
  selectedItem: WarrantyItem | null;
}) {
  const filteredWarranties = useMemo(() => 
    warranties.filter(w => visibleStatuses.has(w.status)), 
    [warranties, visibleStatuses]
  );

  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color="#8B5CF6" />
      <pointLight position={[0, 10, 0]} intensity={0.6} color="#A855F7" />
      <pointLight position={[0, -10, 0]} intensity={0.4} color="#C084FC" />
      
      {/* Atmospheric Grid */}
      <gridHelper args={[30, 30, '#1E293B', '#334155']} />
      
      {/* Floating Particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={i} position={[Math.random() * 40 - 20, Math.random() * 20, Math.random() * 40 - 20]}>
          <Sphere args={[0.01]}>
            <meshStandardMaterial color="#8B5CF6" transparent opacity={0.4} />
          </Sphere>
        </mesh>
      ))}
      
      {/* Warranty Points */}
      {filteredWarranties.map((item, index) => (
        <FloatingWarrantyPoint
          key={item.id}
          item={item}
          index={index}
          onClick={() => onItemClick(item)}
          isSelected={selectedItem?.id === item.id}
          onHover={() => {}}
        />
      ))}
      
      {/* Central Protection Hub */}
      <group position={[0, 8, 0]}>
        {/* Main Torus */}
        <mesh>
          <Torus args={[1.5, 0.4, 16, 32]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#8B5CF6" transparent opacity={0.8} />
          </Torus>
        </mesh>
        
        {/* Orbiting Rings */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <Ring args={[2, 2.2, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#A855F7" transparent opacity={0.6} />
          </Ring>
        </mesh>
        
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <Ring args={[2.2, 2.4, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#C084FC" transparent opacity={0.4} />
          </Ring>
        </mesh>
        
        {/* Central Shield */}
        <mesh position={[0, 0, 0]}>
          <Box args={[0.4, 0.6, 0.1]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#8B5CF6" />
          </Box>
        </mesh>
        
        {/* Protection Text */}
        <Text
          position={[0, 2, 0]}
          fontSize={0.6}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          Protection
        </Text>
      </group>
    </>
  );
}

export default function WarrantyModel({ warranties, onItemClick }: WarrantyModelProps) {
  const [selectedItem, setSelectedItem] = useState<WarrantyItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(
    new Set(['active', 'expired', 'expiring'])
  );

  const statuses = useMemo(() => 
    Array.from(new Set(warranties.map(w => w.status))), 
    [warranties]
  );

  const handleItemClick = (item: WarrantyItem) => {
    setSelectedItem(item);
    onItemClick?.(item);
  };

  const handleToggleStatus = (status: string) => {
    const newVisible = new Set(visibleStatuses);
    if (newVisible.has(status)) {
      newVisible.delete(status);
    } else {
      newVisible.add(status);
    }
    setVisibleStatuses(newVisible);
  };

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <Canvas camera={{ position: [0, 10, 20], fov: 45 }}>
        <WarrantyScene 
          warranties={warranties} 
          onItemClick={handleItemClick}
          visibleStatuses={visibleStatuses}
          selectedItem={selectedItem}
        />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
          autoRotate={true}
          autoRotateSpeed={0.3}
        />
      </Canvas>
      
      {/* Timeline Slider */}
      <TimelineSlider 
        warranties={warranties}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
      />
      
      {/* Status Legend */}
      <StatusLegend 
        statuses={statuses}
        visibleStatuses={visibleStatuses}
        onToggleStatus={handleToggleStatus}
      />
      
      {/* Selected Item Details */}
      {selectedItem && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-xl p-4 max-w-sm">
            <h3 className="text-white font-semibold mb-2">Selected Warranty</h3>
            <div className="text-white text-sm space-y-1">
              <div><strong>Product:</strong> {selectedItem.product}</div>
              <div><strong>Status:</strong> {selectedItem.status}</div>
              <div><strong>Days Left:</strong> {selectedItem.daysLeft}</div>
              <div><strong>Expiry:</strong> {selectedItem.expiryDate}</div>
            </div>
            <button 
              onClick={() => setSelectedItem(null)}
              className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 