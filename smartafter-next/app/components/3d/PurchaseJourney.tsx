'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Box, 
  Sphere, 
  Cylinder, 
  Html, 
  Torus, 
  Ring, 
  Plane,
  Points,
  PointMaterial
} from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

interface PurchaseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  vendor: string;
  date: string;
  timestamp?: number;
}

interface PurchaseJourneyProps {
  purchases: PurchaseItem[];
  onItemClick?: (item: PurchaseItem) => void;
}

function JourneyNode({ 
  item, 
  position, 
  index, 
  onClick, 
  isActive,
  isHovered,
  onHover 
}: { 
  item: PurchaseItem; 
  position: [number, number, number];
  index: number; 
  onClick: () => void;
  isActive: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [localHovered, setLocalHovered] = useState(false);

  // Spring animations
  const { scale, rotation } = useSpring({
    scale: isActive || isHovered ? 1.3 : 1,
    rotation: [0, isActive ? Math.PI * 2 : 0, 0],
    config: { mass: 1, tension: 280, friction: 60 }
  });

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + index) * 0.2 + position[1];
      meshRef.current.rotation.y += 0.01;
    }
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': '#F59E0B',
      'Shopping': '#3B82F6',
      'Transportation': '#10B981',
      'Entertainment': '#EF4444',
      'Healthcare': '#8B5CF6',
      'Utilities': '#6B7280',
      'Investment': '#059669',
      'Digital': '#6366F1',
      'default': '#6366F1'
    };
    return colors[category] || colors.default;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Food & Dining': '🍽️',
      'Shopping': '🛍️',
      'Transportation': '🚗',
      'Entertainment': '🎬',
      'Healthcare': '🏥',
      'Utilities': '⚡',
      'Investment': '📈',
      'Digital': '📱',
      'default': '💰'
    };
    return icons[category] || icons.default;
  };

  const handleHover = (hover: boolean) => {
    setLocalHovered(hover);
    onHover(hover);
  };

  return (
    <animated.mesh
      ref={meshRef}
      position={position}
      scale={scale}
      rotation={rotation as any}
      onClick={onClick}
      onPointerOver={() => handleHover(true)}
      onPointerOut={() => handleHover(false)}
    >
      {/* Main Node */}
      <Sphere args={[0.4, 16, 16]}>
        <meshStandardMaterial 
          color={getCategoryColor(item.category)}
          emissive={getCategoryColor(item.category)}
          emissiveIntensity={isActive ? 0.8 : isHovered ? 0.4 : 0.2}
        />
      </Sphere>

      {/* Glow Effect */}
      {(isActive || isHovered) && (
        <mesh position={[0, 0, 0]}>
          <Ring args={[0.6, 0.8, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial 
              color={getCategoryColor(item.category)} 
              transparent 
              opacity={0.6} 
            />
          </Ring>
        </mesh>
      )}

      {/* Glassmorphism Card */}
      <Html position={[0, 1.5, 0]} center>
        <div className={`
          bg-white/10 backdrop-blur-md border border-white/20 
          px-4 py-3 rounded-xl shadow-2xl
          ${isActive ? 'scale-125' : isHovered ? 'scale-110' : 'scale-100'}
          transition-all duration-300 ease-out
          min-w-[220px]
          ${isActive ? 'ring-2 ring-blue-400' : ''}
        `}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{getCategoryIcon(item.category)}</span>
            <span className="text-lg font-bold text-white">
              ₹{item.amount.toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            <div className="font-medium text-white">{item.category}</div>
            <div className="text-xs opacity-80">{item.vendor}</div>
            <div className="text-xs opacity-60">{item.date}</div>
          </div>
        </div>
      </Html>

      {/* Connection Lines */}
      {isHovered && (
        <mesh position={[0, 0, 0]}>
          <Cylinder args={[0.02, 0.02, 3, 8]} position={[0, -1.5, 0]}>
            <meshStandardMaterial 
              color={getCategoryColor(item.category)} 
              transparent 
              opacity={0.6} 
            />
          </Cylinder>
        </mesh>
      )}
    </animated.mesh>
  );
}

function JourneyPath({ points }: { points: THREE.Vector3[] }) {
  const curve = useMemo(() => {
    if (points.length < 2) return null;
    return new THREE.CatmullRomCurve3(points, true);
  }, [points]);

  const pathPoints = useMemo(() => {
    if (!curve) return [];
    return curve.getPoints(100);
  }, [curve]);

  return (
    <>
      {/* Path Line */}
      {curve && (
        <mesh>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(pathPoints.flatMap((p: THREE.Vector3) => [p.x, p.y, p.z])), 3]}
              count={pathPoints.length}
              array={new Float32Array(pathPoints.flatMap((p: THREE.Vector3) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3B82F6" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Glowing Particles along path */}
      {pathPoints.map((point: THREE.Vector3, index: number) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <Sphere args={[0.02]}>
            <meshStandardMaterial 
              color="#3B82F6" 
              transparent 
              opacity={0.4} 
              emissive="#3B82F6"
              emissiveIntensity={0.2}
            />
          </Sphere>
        </mesh>
      ))}
    </>
  );
}

function AnimatedCamera({ 
  curve, 
  progress, 
  isPlaying 
}: { 
  curve: THREE.CatmullRomCurve3 | null;
  progress: number;
  isPlaying: boolean;
}) {
  const cameraRef = useRef<THREE.Camera>(null);

  useFrame((state) => {
    if (curve && cameraRef.current) {
      const t = progress;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      
      if (point && tangent) {
        // Position camera on the curve
        cameraRef.current.position.copy(point);
        
        // Look ahead on the curve
        const lookAhead = curve.getPointAt(Math.min(t + 0.1, 1));
        cameraRef.current.lookAt(lookAhead);
      }
    }
  });

  return null;
}

function JourneyControls({ 
  isPlaying, 
  onPlayPause, 
  progress, 
  onProgressChange,
  totalDuration 
}: {
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  onProgressChange: (value: number) => void;
  totalDuration: number;
}) {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-8 py-4 flex items-center space-x-6">
        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Timeline Slider */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={progress}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
            className="w-96 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Duration Display */}
        <div className="text-white text-sm font-mono">
          {Math.floor(progress * totalDuration)}s / {totalDuration}s
        </div>
      </div>
    </div>
  );
}

function JourneyScene({ 
  purchases, 
  onItemClick, 
  activeIndex,
  progress,
  isPlaying 
}: {
  purchases: PurchaseItem[];
  onItemClick: (item: PurchaseItem) => void;
  activeIndex: number;
  progress: number;
  isPlaying: boolean;
}) {
  // Generate 3D points from purchases
  const points = useMemo(() => {
    return purchases.map((purchase, index) => {
      const angle = (index / purchases.length) * Math.PI * 4; // Multiple loops
      const radius = 8 + Math.sin(angle * 2) * 3; // Varying radius
      const height = Math.sin(angle) * 4 + 2; // Varying height
      
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
    });
  }, [purchases]);

  const curve = useMemo(() => {
    if (points.length < 2) return null;
    return new THREE.CatmullRomCurve3(points, true);
  }, [points]);

  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color="#3B82F6" />
      <pointLight position={[0, 10, 0]} intensity={0.6} color="#10B981" />
      <pointLight position={[0, -10, 0]} intensity={0.4} color="#8B5CF6" />
      
      {/* Atmospheric Grid */}
      <gridHelper args={[40, 40, '#1E293B', '#334155']} />
      
      {/* Floating Particles */}
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh key={i} position={[Math.random() * 80 - 40, Math.random() * 20, Math.random() * 80 - 40]}>
          <Sphere args={[0.01]}>
            <meshStandardMaterial color="#3B82F6" transparent opacity={0.3} />
          </Sphere>
        </mesh>
      ))}
      
      {/* Journey Path */}
      <JourneyPath points={points} />
      
      {/* Journey Nodes */}
      {purchases.map((item, index) => (
        <JourneyNode
          key={item.id}
          item={item}
          position={[points[index]?.x || 0, points[index]?.y || 0, points[index]?.z || 0]}
          index={index}
          onClick={() => onItemClick(item)}
          isActive={index === activeIndex}
          isHovered={false}
          onHover={() => {}}
        />
      ))}
      
      {/* Animated Camera */}
      <AnimatedCamera curve={curve} progress={progress} isPlaying={isPlaying} />
      
      {/* Central Hub */}
      <group position={[0, 10, 0]}>
        <mesh>
          <Torus args={[2, 0.5, 16, 32]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#3B82F6" transparent opacity={0.8} />
          </Torus>
        </mesh>
        
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.8}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          Purchase Journey
        </Text>
      </group>
    </>
  );
}

export default function PurchaseJourney({ purchases, onItemClick }: PurchaseJourneyProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<PurchaseItem | null>(null);

  const totalDuration = 30; // 30 seconds for full journey

  // Auto-play animation
  useEffect(() => {
    if (isPlaying) {
      // DISABLED: Background animation interval to prevent background processing
      // const interval = setInterval(() => {
      //   setProgress(prev => {
      //     const newProgress = prev + 0.01;
      //     if (newProgress >= 1) {
      //       setIsPlaying(false);
      //       return 0;
      //       }
      //     return newProgress;
      //   });
      // }, 300); // Update every 300ms

      // return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Update active index based on progress
  useEffect(() => {
    const index = Math.floor(progress * purchases.length);
    setActiveIndex(Math.min(index, purchases.length - 1));
  }, [progress, purchases.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (value: number) => {
    setProgress(value);
    setIsPlaying(false);
  };

  const handleItemClick = (item: PurchaseItem) => {
    setSelectedItem(item);
    onItemClick?.(item);
  };

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      <Canvas camera={{ position: [0, 10, 20], fov: 45 }}>
        <JourneyScene 
          purchases={purchases} 
          onItemClick={handleItemClick}
          activeIndex={activeIndex}
          progress={progress}
          isPlaying={isPlaying}
        />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
          autoRotate={false}
        />
      </Canvas>
      
      {/* Journey Controls */}
      <JourneyControls 
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        progress={progress}
        onProgressChange={handleProgressChange}
        totalDuration={totalDuration}
      />
      
      {/* Selected Item Details */}
      {selectedItem && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-xl p-4 max-w-sm">
            <h3 className="text-white font-semibold mb-2">Journey Stop</h3>
            <div className="text-white text-sm space-y-1">
              <div><strong>Amount:</strong> ₹{selectedItem.amount.toFixed(2)}</div>
              <div><strong>Category:</strong> {selectedItem.category}</div>
              <div><strong>Vendor:</strong> {selectedItem.vendor}</div>
              <div><strong>Date:</strong> {selectedItem.date}</div>
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