"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useGameWebSocket } from "../lib/websocket";
import { useState, useRef, useEffect } from "react";
import * as THREE from "three";

interface Player {
  id: string;
  position: [number, number, number];
  isYou: boolean;
  tokens: number;
  frozen: boolean;
}

interface TokenOrb {
  id: string;
  position: [number, number, number];
  value: number;
}

interface GameState {
  players: Player[];
  tokens: TokenOrb[];
  timeRemaining: number;
  gameStatus: "waiting" | "playing" | "finished";
}

const PlayerModel = ({
  position,
  isYou,
  frozen,
}: {
  position: [number, number, number];
  isYou: boolean;
  frozen: boolean;
}) => {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.8, 1.6, 0.4]} />
        <meshStandardMaterial
          color={frozen ? "#3b82f6" : isYou ? "#10b981" : "#ef4444"}
          transparent={frozen}
          opacity={frozen ? 0.7 : 1}
        />
      </mesh>
      {isYou && (
        <Text position={[0, 2, 0]} fontSize={0.3} color="white">
          YOU
        </Text>
      )}
      {frozen && (
        <Text position={[0, 2.5, 0]} fontSize={0.25} color="#3b82f6">
          FROZEN
        </Text>
      )}
    </group>
  );
};

const TokenOrbComponent = ({
  position,
  value,
}: {
  position: [number, number, number];
  value: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 2) * 0.2 + position[1];
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial
        color={value > 3 ? "#fbbf24" : "#10b981"}
        emissive={value > 3 ? "#fbbf24" : "#10b981"}
        emissiveIntensity={0.2}
      />
      <Text position={[0, 0.6, 0]} fontSize={0.2} color="white">
        {value}
      </Text>
    </mesh>
  );
};

const Arena = () => {
  return (
    <group>
      {/* Arena floor */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Arena walls */}
      {[
        { pos: [0, 2, 10], rot: [0, 0, 0] },
        { pos: [0, 2, -10], rot: [0, 0, 0] },
        { pos: [10, 2, 0], rot: [0, Math.PI / 2, 0] },
        { pos: [-10, 2, 0], rot: [0, Math.PI / 2, 0] },
      ].map((wall, i) => (
        <mesh
          key={i}
          position={wall.pos as [number, number, number]}
          rotation={wall.rot as [number, number, number]}
        >
          <planeGeometry args={[20, 4]} />
          <meshStandardMaterial color="#374151" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

export default function GameScene({
  onPlayerMove,
}: {
  onPlayerMove: (direction: string) => void;
}) {
  const { gameState } = useGameWebSocket();
  const [localGameState, setLocalGameState] = useState<GameState>({
    players: [],
    tokens: [],
    timeRemaining: 60,
    gameStatus: "waiting",
  });

  useEffect(() => {
    if (gameState) {
      setLocalGameState(gameState);
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      console.log("🎮 Key pressed:", event.key);
      switch (event.key.toLowerCase()) {
        case "w":
        case "arrowup":
          console.log("⬆️ Moving up");
          onPlayerMove("w");
          break;
        case "s":
        case "arrowdown":
          console.log("⬇️ Moving down");
          onPlayerMove("s");
          break;
        case "a":
        case "arrowleft":
          console.log("⬅️ Moving left");
          onPlayerMove("a");
          break;
        case "d":
        case "arrowright":
          console.log("➡️ Moving right");
          onPlayerMove("d");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onPlayerMove]);

  return (
    <Canvas shadows camera={{ position: [0, 10, 15], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Arena />

      {/* Players */}
      {localGameState.players.map((player) => (
        <PlayerModel
          key={player.id}
          position={player.position}
          isYou={player.isYou}
          frozen={player.frozen}
        />
      ))}

      {/* Tokens */}
      {localGameState.tokens.map((token) => (
        <TokenOrbComponent
          key={token.id}
          position={token.position}
          value={token.value}
        />
      ))}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
      />
    </Canvas>
  );
}
