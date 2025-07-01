"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Box, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Error Boundary for 3D Model Loading
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ReactNode;
    onError?: (error: Error) => void;
  },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

interface Player {
  id: string;
  walletAddress: string;
  position: { x: number; y: number; z: number };
  score: number;
  color: string;
  nickname: string;
}

interface Orb {
  id: string;
  position: { x: number; y: number; z: number };
  value: number;
  type: "common" | "rare" | "legendary";
  glowColor: string;
}

interface GameState {
  status: "waiting" | "countdown" | "playing" | "finished";
  players: Player[];
  orbs: Orb[];
  timeRemaining: number;
  gameId: string;
  countdownTime: number;
  leaderboard: Player[];
}

interface OrbCollectorSceneProps {
  gameState: GameState;
  playerPosition: { x: number; y: number; z: number };
  onPlayerMove: (position: { x: number; y: number; z: number }) => void;
  onOrbCollect: (orbId: string) => void;
  myPlayerId: string;
  isActive: boolean;
  isFullscreen?: boolean;
}

// Animated Orb Component
// Collection Effect Component - DISABLED for debugging
// function CollectionEffect({
//   position,
//   value,
//   onComplete,
// }: {
//   position: { x: number; y: number; z: number };
//   value: number;
//   onComplete: () => void;
// }) {
//   const textRef = useRef<any>(null!);
//   const sparkleRef = useRef<THREE.Mesh>(null!);
//   const [startTime] = useState(Date.now());

//   useFrame(() => {
//     const elapsed = (Date.now() - startTime) / 1000;
//     const progress = Math.min(elapsed / 1.5, 1);

//     if (textRef.current) {
//       // Rise and fade effect
//       const yOffset = progress * 2;
//       textRef.current.position.y = position.y + yOffset;

//       // Fade out
//       const opacity = Math.max(0, 1 - progress);
//       if (textRef.current.material) {
//         textRef.current.material.opacity = opacity;
//       }
//     }

//     if (sparkleRef.current) {
//       // Expanding sparkle effect
//       const scale = 1 + progress * 2;
//       sparkleRef.current.scale.setScalar(scale);
//       const material = sparkleRef.current.material as THREE.MeshBasicMaterial;
//       material.opacity = Math.max(0, 1 - progress);
//     }

//     if (progress >= 1) {
//       onComplete();
//     }
//   });

//   return (
//     <group>
//       {/* Rising score text */}
//       <Text
//         ref={textRef}
//         position={[position.x, position.y, position.z]}
//         fontSize={0.4}
//         color="#ffff00"
//         anchorX="center"
//         anchorY="middle"
//         outlineWidth={0.03}
//         outlineColor="black"
//       >
//         +{value}
//       </Text>

//       {/* Simple sparkle effect */}
//       <mesh ref={sparkleRef} position={[position.x, position.y, position.z]}>
//         <sphereGeometry args={[0.2, 8, 8]} />
//         <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
//       </mesh>
//     </group>
//   );
// }

function AnimatedOrb({
  orb,
  onCollect,
  shouldCollect,
}: {
  orb: Orb;
  onCollect: (id: string) => void;
  shouldCollect?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  // const glowRef = useRef<THREE.Mesh>(null!); // Disabled for debugging
  const [hovered, setHovered] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  // Function to trigger collection animation
  const handleCollect = () => {
    if (!isCollecting) {
      console.log(`✨ Starting collection animation for orb ${orb.id}`);
      setIsCollecting(true);
    }
  };

  // Trigger collection when shouldCollect prop changes
  useEffect(() => {
    if (shouldCollect && !isCollecting) {
      handleCollect();
    }
  }, [shouldCollect, isCollecting]);

  useFrame((state) => {
    if (meshRef.current) {
      if (isCollecting) {
        // Collecting animation: shrink and fade
        const scale = Math.max(0, meshRef.current.scale.x - 0.05);
        meshRef.current.scale.setScalar(scale);

        // Fade out material
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        material.opacity = Math.max(0, material.opacity - 0.03);

        // Remove when fully shrunk
        if (scale <= 0.1) {
          onCollect(orb.id);
        }
      } else {
        // Normal animation
        // Reduced floating animation - keep orbs closer to ground
        const floatY =
          Math.sin(state.clock.elapsedTime * 2 + orb.position.x) * 0.1;
        meshRef.current.position.y = Math.max(0.2, floatY); // Don't go below ground

        // Enhanced rotation animation
        meshRef.current.rotation.x += 0.02;
        meshRef.current.rotation.y += 0.03;
        meshRef.current.rotation.z += 0.01;

        // Scale animation when hovered
        const targetScale = hovered ? 1.3 : 1;
        meshRef.current.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.1
        );
      }
    }
  });

  const getOrbColor = () => {
    switch (orb.type) {
      case "common":
        return "#00d4ff"; // Bright cyan
      case "rare":
        return "#ff00ff"; // Bright magenta
      case "legendary":
        return "#ffff00"; // Bright yellow/gold
      default:
        return "#00d4ff";
    }
  };

  const getOrbSize = () => {
    switch (orb.type) {
      case "common":
        return 0.4;
      case "rare":
        return 0.5;
      case "legendary":
        return 0.6;
      default:
        return 0.4;
    }
  };

  const orbColor = getOrbColor();
  const orbSize = getOrbSize();

  // Fix orb Y position to be near ground level
  const groundedPosition = {
    x: orb.position.x,
    y: Math.max(0.5, orb.position.y), // Keep orbs at least at ground level
    z: orb.position.z,
  };

  return (
    <group
      position={[groundedPosition.x, groundedPosition.y, groundedPosition.z]}
    >
      {/* Main orb - simplified */}
      <Sphere
        ref={meshRef}
        args={[orbSize, 16, 16]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleCollect}
      >
        <meshStandardMaterial
          color={orbColor}
          emissive={orbColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Value indicator */}
      <Text
        position={[0, orbSize + 0.4, 0]}
        fontSize={0.25}
        color={orbColor}
        anchorX="center"
        anchorY="middle"
      >
        +{orb.value}
      </Text>
    </group>
  );
}

// Simple wrapper that always uses fallback for now until GLB issues are resolved
function SafePlayerModel({ isMe, color }: { isMe: boolean; color: string }) {
  console.log("🎮 Using safe fallback character model");
  return <FallbackCharacter isMe={isMe} color={color} />;
}

// Player Avatar Component with 3D Models
function PlayerAvatar({ player, isMe }: { player: Player; isMe: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null!);

  // Assign models based on player ID for consistency
  const getPlayerModel = (playerId: string) => {
    const models = [
      "/models/Cartoon_Plumber_Hero_0701043630_texture.glb",
      "/models/Cartoon_Plumber_in_Pu_0701043022_texture.glb",
    ];
    // Use player ID to consistently assign the same model to the same player
    const hash = playerId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return models[Math.abs(hash) % models.length];
  };

  useFrame((state) => {
    // Enhanced glow effect for current player
    if (isMe && glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    }
  });

  // Ensure player is positioned at ground level
  const groundedPlayerPosition = {
    x: player.position.x,
    y: Math.max(0.5, player.position.y), // Keep player at ground level
    z: player.position.z,
  };

  return (
    <group
      position={[
        groundedPlayerPosition.x,
        groundedPlayerPosition.y,
        groundedPlayerPosition.z,
      ]}
    >
      {/* Use safe fallback character for now - TODO: Fix GLB loading */}
      <SafePlayerModel isMe={isMe} color={player.color} />

      {/* Enhanced glow effect for current player */}
      {isMe && (
        <>
          <Sphere ref={glowRef} args={[1.2, 16, 16]}>
            <meshBasicMaterial color="#00ffff" transparent opacity={0.15} />
          </Sphere>

          {/* Movement indicator - pulsing ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
            <ringGeometry args={[0.8, 1.0, 16]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Player nickname with enhanced styling */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.22}
        color={isMe ? "#00ffff" : "white"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {player.nickname}
        {isMe && " 🎮"}
      </Text>

      {/* Score display with enhanced styling */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.16}
        color="#ffff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="black"
      >
        ⭐ {player.score} pts
      </Text>

      {/* Position debug display for current player */}
      {isMe && (
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="black"
        >
          X: {player.position.x.toFixed(1)} Z: {player.position.z.toFixed(1)}
        </Text>
      )}
    </group>
  );
}

// Enhanced 3D Character Fallback
function FallbackCharacter({ isMe, color }: { isMe: boolean; color: string }) {
  const characterRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (characterRef.current) {
      // Floating animation
      characterRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 3) * 0.08;
      // Gentle rotation
      characterRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={characterRef}>
      {/* Body */}
      <Box args={[0.4, 0.7, 0.3]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={isMe ? "#00ffff" : color}
          emissive={isMe ? "#00ffff" : color}
          emissiveIntensity={isMe ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </Box>

      {/* Head */}
      <Box args={[0.3, 0.3, 0.3]} position={[0, 0.5, 0]}>
        <meshStandardMaterial
          color={isMe ? "#00ffff" : color}
          emissive={isMe ? "#00ffff" : color}
          emissiveIntensity={isMe ? 0.4 : 0.15}
          roughness={0.2}
          metalness={0.8}
        />
      </Box>

      {/* Arms */}
      <Box args={[0.15, 0.4, 0.15]} position={[-0.35, 0.1, 0]}>
        <meshStandardMaterial color={isMe ? "#00ffff" : color} />
      </Box>
      <Box args={[0.15, 0.4, 0.15]} position={[0.35, 0.1, 0]}>
        <meshStandardMaterial color={isMe ? "#00ffff" : color} />
      </Box>

      {/* Legs */}
      <Box args={[0.15, 0.4, 0.15]} position={[-0.15, -0.55, 0]}>
        <meshStandardMaterial color={isMe ? "#00ffff" : color} />
      </Box>
      <Box args={[0.15, 0.4, 0.15]} position={[0.15, -0.55, 0]}>
        <meshStandardMaterial color={isMe ? "#00ffff" : color} />
      </Box>
    </group>
  );
}

// Enhanced Neon Arena Component
function NeonArena() {
  const platformRef = useRef<THREE.Mesh>(null!);
  const borderRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (platformRef.current) {
      // Enhanced platform glow pulsing with color shifts
      const material = platformRef.current
        .material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.2 + Math.sin(time * 0.8) * 0.1;

      // Subtle color shifting
      material.emissive = new THREE.Color(
        0.1 + Math.sin(time * 0.5) * 0.05,
        0.05 + Math.sin(time * 0.7) * 0.03,
        0.3 + Math.sin(time * 0.3) * 0.1
      );
    }

    // Animate border colors with rainbow effect
    borderRefs.current.forEach((border, index) => {
      if (border) {
        const material = border.material as THREE.MeshStandardMaterial;
        const phase = time * 2 + (index * Math.PI) / 2;

        // Rainbow color cycling
        material.emissive = new THREE.Color(
          0.5 + Math.sin(phase) * 0.5,
          0.5 + Math.sin(phase + (2 * Math.PI) / 3) * 0.5,
          0.5 + Math.sin(phase + (4 * Math.PI) / 3) * 0.5
        );
        material.emissiveIntensity = 0.8 + Math.sin(time * 3 + index) * 0.3;
      }
    });
  });

  return (
    <group>
      {/* Enhanced main platform */}
      <Box ref={platformRef} args={[20, 0.5, 20]} position={[0, -0.5, 0]}>
        <meshStandardMaterial
          color="#0a0a2a"
          emissive="#000066"
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.8}
        />
      </Box>

      {/* Enhanced arena borders with rainbow glow */}
      {/* Front border */}
      <Box
        args={[20, 1.5, 0.3]}
        position={[0, 0.25, 10]}
        ref={(ref: THREE.Mesh) => {
          if (ref) borderRefs.current[0] = ref;
        }}
      >
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={0.8}
          transparent={true}
          opacity={0.9}
        />
      </Box>

      {/* Back border */}
      <Box
        args={[20, 1.5, 0.3]}
        position={[0, 0.25, -10]}
        ref={(ref: THREE.Mesh) => {
          if (ref) borderRefs.current[1] = ref;
        }}
      >
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.8}
          transparent={true}
          opacity={0.9}
        />
      </Box>

      {/* Left border */}
      <Box
        args={[0.3, 1.5, 20]}
        position={[-10, 0.25, 0]}
        ref={(ref: THREE.Mesh) => {
          if (ref) borderRefs.current[2] = ref;
        }}
      >
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffff00"
          emissiveIntensity={0.8}
          transparent={true}
          opacity={0.9}
        />
      </Box>

      {/* Right border */}
      <Box
        args={[0.3, 1.5, 20]}
        position={[10, 0.25, 0]}
        ref={(ref: THREE.Mesh) => {
          if (ref) borderRefs.current[3] = ref;
        }}
      >
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff6600"
          emissiveIntensity={0.8}
          transparent={true}
          opacity={0.9}
        />
      </Box>

      {/* Corner accent lights */}
      {[
        [-10, 1, -10] as [number, number, number],
        [10, 1, -10] as [number, number, number],
        [10, 1, 10] as [number, number, number],
        [-10, 1, 10] as [number, number, number],
      ].map((pos, index) => (
        <Sphere key={index} args={[0.3]} position={pos}>
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.0}
            transparent={true}
            opacity={0.8}
          />
        </Sphere>
      ))}
    </group>
  );
}

// Movement Controller Component
function MovementController({
  onMove,
  isActive,
  currentPosition,
}: {
  onMove: (position: { x: number; y: number; z: number }) => void;
  isActive: boolean;
  currentPosition: { x: number; y: number; z: number };
}) {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const moveSpeed = 0.2; // Increased speed
  const positionRef = useRef(currentPosition);
  const lastLoggedPosition = useRef(currentPosition);

  useEffect(() => {
    positionRef.current = currentPosition;
  }, [currentPosition]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for movement keys to avoid page scrolling
      if (["w", "a", "s", "d", "W", "A", "S", "D", " "].includes(event.key)) {
        event.preventDefault();
      }

      const key = event.key.toLowerCase();
      setKeys((prev) => {
        const newKeys = { ...prev, [key]: true };
        // Only log movement keys to reduce console spam
        if (["w", "a", "s", "d", " "].includes(key)) {
          console.log(
            `🎮 Key pressed: ${key === " " ? "SPACE" : key.toUpperCase()}`
          );
        }
        return newKeys;
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Prevent default for movement keys
      if (["w", "a", "s", "d", "W", "A", "S", "D", " "].includes(event.key)) {
        event.preventDefault();
      }

      const key = event.key.toLowerCase();
      setKeys((prev) => {
        const newKeys = { ...prev, [key]: false };
        // Only log movement keys to reduce console spam
        if (["w", "a", "s", "d", " "].includes(key)) {
          console.log(
            `🎮 Key released: ${key === " " ? "SPACE" : key.toUpperCase()}`
          );
        }
        return newKeys;
      });
    };

    // Add event listeners to both window and document for better compatibility
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [isActive]);

  useFrame(() => {
    if (!isActive) return;

    let newPosition = { ...positionRef.current };
    let moved = false;

    if (keys["w"]) {
      newPosition.z -= moveSpeed;
      moved = true;
    }
    if (keys["s"]) {
      newPosition.z += moveSpeed;
      moved = true;
    }
    if (keys["a"]) {
      newPosition.x -= moveSpeed;
      moved = true;
    }
    if (keys["d"]) {
      newPosition.x += moveSpeed;
      moved = true;
    }

    // Handle jumping with space bar
    if (keys["space"] || keys[" "]) {
      // Simple jump: increase Y position temporarily
      newPosition.y = Math.min(2.0, positionRef.current.y + 0.1);
      moved = true; // Mark as moved for position update
    } else {
      // Gravity: fall back down to ground
      const newY = Math.max(0.5, positionRef.current.y - 0.05);
      if (newY !== positionRef.current.y) {
        newPosition.y = newY;
        moved = true; // Mark as moved for gravity fall
      }
    }

    // Clamp position to arena bounds
    newPosition.x = Math.max(-9.5, Math.min(9.5, newPosition.x));
    newPosition.z = Math.max(-9.5, Math.min(9.5, newPosition.z));

    if (moved || newPosition.y !== positionRef.current.y) {
      positionRef.current = newPosition;
      onMove(newPosition);

      // Only log position every 1 unit of movement to reduce spam
      const lastPos = lastLoggedPosition.current;
      const distance = Math.sqrt(
        Math.pow(newPosition.x - lastPos.x, 2) +
          Math.pow(newPosition.z - lastPos.z, 2)
      );

      if (distance > 1.0) {
        console.log(
          `🏃 Player moved to: X=${newPosition.x.toFixed(
            1
          )}, Y=${newPosition.y.toFixed(1)}, Z=${newPosition.z.toFixed(1)}`
        );
        lastLoggedPosition.current = newPosition;
      }
    }
  });

  return null;
}

// Enhanced Particle Effects Component
function ParticleEffects() {
  const particlesRef = useRef<THREE.Points>(null!);
  const particleCount = 200; // Increased particle count

  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.elapsedTime;

      // Enhanced rotation and movement
      particlesRef.current.rotation.y += 0.002;
      particlesRef.current.rotation.x += 0.001;

      // Update particle positions for floating effect
      const positions = particlesRef.current.geometry.attributes.position
        .array as Float32Array;
      const colors = particlesRef.current.geometry.attributes.color
        .array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        // Floating animation
        positions[i * 3 + 1] += Math.sin(time * 2 + i * 0.1) * 0.002;

        // Color cycling for rainbow effect
        const colorPhase = time + i * 0.05;
        colors[i * 3] = 0.5 + Math.sin(colorPhase) * 0.5; // R
        colors[i * 3 + 1] = 0.5 + Math.sin(colorPhase + 2) * 0.5; // G
        colors[i * 3 + 2] = 0.5 + Math.sin(colorPhase + 4) * 0.5; // B
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    // More spread out positions
    particlePositions[i * 3] = (Math.random() - 0.5) * 40;
    particlePositions[i * 3 + 1] = Math.random() * 15 + 2;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 40;

    // Initial random colors
    particleColors[i * 3] = Math.random();
    particleColors[i * 3 + 1] = Math.random();
    particleColors[i * 3 + 2] = Math.random();
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );
  particleGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(particleColors, 3)
  );

  return (
    <points ref={particlesRef} geometry={particleGeometry}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  );
}

// Main Scene Component
function GameScene({
  gameState,
  playerPosition,
  onPlayerMove,
  onOrbCollect,
  myPlayerId,
  isActive,
}: OrbCollectorSceneProps) {
  console.log("🎮 GameScene render:", {
    status: gameState.status,
    isActive,
    playersCount: gameState.players.length,
    orbsCount: gameState.orbs.length,
  });
  const [collectingOrbs, setCollectingOrbs] = useState<Set<string>>(new Set());

  // Auto-collect orbs when close enough
  useFrame(() => {
    if (!isActive || gameState.status !== "playing") return;

    gameState.orbs.forEach((orb) => {
      // Use grounded positions for distance calculation
      const orbGroundedPos = {
        x: orb.position.x,
        y: Math.max(0.5, orb.position.y),
        z: orb.position.z,
      };

      const playerGroundedPos = {
        x: playerPosition.x,
        y: Math.max(0.5, playerPosition.y),
        z: playerPosition.z,
      };

      const distance = Math.sqrt(
        Math.pow(orbGroundedPos.x - playerGroundedPos.x, 2) +
          Math.pow(orbGroundedPos.z - playerGroundedPos.z, 2)
      );

      // Debug: Log distances for troubleshooting (very reduced spam)
      if (distance < 1.5 && Math.random() < 0.05) {
        // Only log 5% of the time when very close
        console.log(`🔍 Orb ${orb.id} distance: ${distance.toFixed(2)}`);
      }

      // Auto-collect if within collection radius
      if (distance < 1.2) {
        // Touch distance for smooth collection
        if (!collectingOrbs.has(orb.id)) {
          console.log(
            `🔮 Touching orb ${orb.id} at distance ${distance.toFixed(
              2
            )} - starting collection!`
          );
          setCollectingOrbs((prev) => new Set([...prev, orb.id]));
        }
      }
    });
  });

  const handleOrbCollect = useCallback(
    (orbId: string) => {
      const orb = gameState.orbs.find((o) => o.id === orbId);
      if (!orb) return;

      console.log(`✅ Orb ${orbId} collected! Worth ${orb.value} points!`);
      onOrbCollect(orbId);
    },
    [gameState.orbs, onOrbCollect]
  );

  return (
    <>
      {/* Enhanced Lighting System */}
      <ambientLight intensity={0.3} color="#1a1a2e" />
      <directionalLight
        position={[0, 20, 10]}
        intensity={0.8}
        color="#00d4ff"
        castShadow
      />

      {/* Dynamic Colored Point Lights */}
      <pointLight
        position={[0, 15, 0]}
        intensity={1.5}
        color="#ff00ff"
        distance={30}
      />
      <pointLight
        position={[15, 8, 15]}
        intensity={1.2}
        color="#00ffff"
        distance={25}
      />
      <pointLight
        position={[-15, 8, -15]}
        intensity={1.2}
        color="#ffff00"
        distance={25}
      />
      <pointLight
        position={[15, 8, -15]}
        intensity={1.0}
        color="#ff6600"
        distance={20}
      />
      <pointLight
        position={[-15, 8, 15]}
        intensity={1.0}
        color="#6600ff"
        distance={20}
      />

      {/* Arena */}
      <NeonArena />

      {/* Enhanced Particle Effects */}
      <ParticleEffects />

      {/* Players */}
      {gameState.players.map((player) => {
        // Use local playerPosition for current player, server position for others
        const actualPosition =
          player.walletAddress === myPlayerId
            ? playerPosition
            : player.position;

        return (
          <PlayerAvatar
            key={player.id}
            player={{ ...player, position: actualPosition }}
            isMe={player.walletAddress === myPlayerId}
          />
        );
      })}

      {/* Orbs */}
      {gameState.orbs.map((orb) => (
        <AnimatedOrb
          key={orb.id}
          orb={orb}
          onCollect={(orbId) => {
            // Remove from collecting set and call the actual collect function
            setCollectingOrbs((prev) => {
              const newSet = new Set(prev);
              newSet.delete(orbId);
              return newSet;
            });
            handleOrbCollect(orbId);
          }}
          shouldCollect={collectingOrbs.has(orb.id)}
        />
      ))}

      {/* Collection Effects - Temporarily disabled for debugging */}
      {/* {collectionEffects.map((effect) => (
        <CollectionEffect
          key={effect.id}
          position={effect.position}
          value={effect.value}
          onComplete={() => {
            setCollectionEffects((prev) =>
              prev.filter((e) => e.id !== effect.id)
            );
          }}
        />
      ))} */}

      {/* Movement Controller */}
      <MovementController
        onMove={onPlayerMove}
        isActive={isActive}
        currentPosition={playerPosition}
      />

      {/* Camera Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={12}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function OrbCollectorScene(props: OrbCollectorSceneProps) {
  // Enhanced game container with auto-adjust settings
  const { isFullscreen } = props;

  return (
    <div
      className={`relative ${
        isFullscreen ? "w-screen h-screen" : "w-full h-[70vh]"
      } bg-gradient-to-b from-purple-900 via-blue-900 to-black`}
    >
      <Canvas
        camera={{
          position: [0, 15, 15],
          fov: isFullscreen ? 70 : 60,
          near: 0.1,
          far: 1000,
        }}
        shadows={true}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        {/* Enhanced lighting setup */}
        <ambientLight intensity={0.4} color="#4a00ff" />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <pointLight position={[0, 10, 0]} intensity={0.8} color="#00ffff" />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#ff00ff" />
        <pointLight position={[10, 5, 10]} intensity={0.5} color="#ffff00" />

        {/* Game scene */}
        <Suspense fallback={null}>
          <GameScene {...props} />
        </Suspense>

        {/* Enhanced camera controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={8}
          maxDistance={25}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />

        {/* Fog for depth and atmosphere */}
        <fog attach="fog" args={["#000033", 20, 80]} />
      </Canvas>

      {/* Game overlay UI */}
      <div className="absolute top-4 left-4 right-4 pointer-events-none">
        <div className="flex justify-between items-start">
          {/* Game status */}
          <div className="bg-black/70 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-white font-bold text-lg">
              {props.gameState.status === "waiting" &&
                "⏳ Waiting for players..."}
              {props.gameState.status === "countdown" &&
                `🕐 Starting in ${props.gameState.countdownTime}s`}
              {props.gameState.status === "playing" &&
                `⏱️ ${props.gameState.timeRemaining}s remaining`}
              {props.gameState.status === "finished" && "🎉 Game finished!"}
            </div>
          </div>

          {/* Live leaderboard */}
          <div className="bg-black/70 rounded-lg p-3 backdrop-blur-sm max-w-xs">
            <div className="text-yellow-400 font-bold text-sm mb-2">
              🏆 Live Rankings
            </div>
            {props.gameState.players
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`text-xs flex justify-between ${
                    player.id === props.myPlayerId
                      ? "text-cyan-400 font-bold"
                      : "text-white"
                  }`}
                >
                  <span>
                    {index + 1}. {player.nickname}
                    {player.id === props.myPlayerId && " (You)"}
                  </span>
                  <span>{player.score} pts</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// TODO: Re-enable GLB model preloading once loading issues are resolved
// useGLTF.preload("/models/Cartoon_Plumber_Hero_0701043630_texture.glb");
// useGLTF.preload("/models/Cartoon_Plumber_in_Pu_0701043022_texture.glb");
