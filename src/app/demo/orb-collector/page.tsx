"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSocket } from "../../lib/websocket";
import {
  getMockBalance,
  payMockEntryFee,
  getMockWalletAddress,
  generateMockTxSignature,
} from "../../lib/mock-wallet";
import dynamic from "next/dynamic";

// Dynamic import for 3D scene to avoid SSR issues
const OrbCollectorScene = dynamic(
  () => import("../../components/OrbCollectorScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-black rounded-xl flex items-center justify-center">
        <div className="text-white text-xl">Loading 3D Arena...</div>
      </div>
    ),
  }
);

const OrbCollectorHUD = dynamic(
  () => import("../../components/OrbCollectorHUD"),
  {
    ssr: false,
  }
);

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

export default function DemoOrbCollectorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socket = useSocket();

  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    players: [],
    orbs: [],
    timeRemaining: 60,
    gameId: "",
    countdownTime: 0,
    leaderboard: [],
  });

  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0.5, z: 0 }); // Start at ground level
  const [myBalance, setMyBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [paymentStatus, setPaymentStatus] = useState<
    "none" | "processing" | "success" | "failed"
  >("none");
  const [gameStarted, setGameStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get bet amount from URL
  useEffect(() => {
    const urlBet = searchParams.get("bet");
    if (urlBet) {
      setBetAmount(parseFloat(urlBet));
    }
  }, [searchParams]);

  // Load mock balance
  useEffect(() => {
    const balance = getMockBalance();
    setMyBalance(balance);
  }, []);

  // Socket event handlers
  useEffect(() => {
    const walletAddress = getMockWalletAddress();
    if (!socket || !walletAddress) return;

    const handleGameState = (state: GameState) => {
      setGameState(state);

      if (state.status === "playing" && !gameStarted) {
        setGameStarted(true);
        setShowInstructions(false);
      }
    };

    const handleOrbCollected = (data: {
      orbId: string;
      playerId: string;
      value: number;
    }) => {
      // Visual feedback for orb collection
      if (data.playerId === walletAddress) {
        // Show score popup or particle effect
      }
    };

    const handleGameEnd = (results: any) => {
      // Navigate to results page with game data
      router.push(
        `/results?game=orb-collector&gameId=${gameState.gameId}&demo=true`
      );
    };

    socket.on("orbGameState", handleGameState);
    socket.on("orbCollected", handleOrbCollected);
    socket.on("gameEnd", handleGameEnd);

    return () => {
      socket.off("orbGameState", handleGameState);
      socket.off("orbCollected", handleOrbCollected);
      socket.off("gameEnd", handleGameEnd);
    };
  }, [socket, gameStarted, gameState.gameId, router]);

  // Handle player movement
  const handlePlayerMove = (newPosition: {
    x: number;
    y: number;
    z: number;
  }) => {
    setPlayerPosition(newPosition);

    const walletAddress = getMockWalletAddress();
    if (socket && walletAddress) {
      console.log(`🎮 [DEMO] Player move:`, {
        gameId: gameState.gameId,
        playerId: walletAddress,
        position: newPosition,
        socketConnected: socket.connected,
      });

      socket.emit("playerMove", {
        gameId: gameState.gameId,
        playerId: walletAddress,
        position: newPosition,
      });
    } else {
      console.warn(`❌ Cannot move demo player - missing requirements:`, {
        socket: !!socket,
        socketConnected: socket?.connected,
        walletAddress,
      });
    }
  };

  // Handle orb collection
  const handleOrbCollect = (orbId: string) => {
    const walletAddress = getMockWalletAddress();
    if (socket && walletAddress) {
      socket.emit("collectOrb", {
        gameId: gameState.gameId,
        playerId: walletAddress,
        orbId: orbId,
      });
    }
  };

  // Game container fullscreen functionality
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const gameContainer = gameContainerRef.current;
    if (!gameContainer) return;

    if (!isFullscreen) {
      if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Join game after payment
  const handleJoinGame = async () => {
    const walletAddress = getMockWalletAddress();
    if (!walletAddress || !socket) return;

    setPaymentStatus("processing");

    try {
      // Use mock payment system
      const mockResult = payMockEntryFee(
        betAmount,
        `demo-orb-collector-${Date.now()}`
      );
      const paymentResult = {
        success: mockResult.success,
        txSignature: mockResult.success ? generateMockTxSignature() : undefined,
        error: mockResult.error,
      };

      if (paymentResult.success) {
        console.log(
          `💰 [DEMO] Payment successful: ${paymentResult.txSignature}`
        );
        setPaymentStatus("success");

        // Update balance
        setMyBalance(getMockBalance());

        console.log(`🔗 [DEMO] Joining orb game:`, {
          gameId: `demo-orb-${Date.now()}`,
          playerId: walletAddress,
          betAmount: betAmount,
          txSignature: paymentResult.txSignature,
        });

        // Join the game
        socket.emit("joinOrbGame", {
          playerId: walletAddress,
          playerNickname: `DemoPlayer_${walletAddress.slice(-4)}`,
          betAmount: betAmount,
          txSignature: paymentResult.txSignature,
        });
      } else {
        setPaymentStatus("failed");
        console.error("❌ Demo payment failed:", paymentResult.error);
      }
    } catch (error) {
      setPaymentStatus("failed");
      console.error("Error processing demo payment:", error);
    }
  };

  // Check if player is in game
  const walletAddress = getMockWalletAddress();
  const myPlayer = gameState.players.find(
    (p) => p.walletAddress === walletAddress
  );
  const isInGame = !!myPlayer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      {/* Header */}
      <div className="p-4 bg-black/50">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/mock-games")}
              className="text-blue-400 hover:text-blue-300 text-lg"
            >
              ← Back to Demo Games
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                🔮 Demo Neon Orb Collector 3D
              </h1>
              <div className="text-sm text-orange-400 font-bold flex items-center gap-1">
                <span>🎭</span>
                <span>DEMO MODE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-white text-right">
              <div className="text-sm text-gray-300">Balance</div>
              <div className="text-lg font-bold text-yellow-400">
                💰 {myBalance.toFixed(2)} GOR (Demo)
              </div>
            </div>
            <div className="text-white text-right">
              <div className="text-sm text-gray-300">Bet Amount</div>
              <div className="text-lg font-bold text-green-400">
                🎯 {betAmount} GOR (Demo)
              </div>
            </div>
            <button
              onClick={toggleFullscreen}
              className="bg-purple-500 hover:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? "🔲 Exit" : "⛶ Fullscreen"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Game Instructions Modal */}
        {showInstructions && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-purple-800 to-blue-800 p-8 rounded-2xl max-w-md mx-4 border border-purple-400">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">
                🔮 Demo Mode - How to Play
              </h2>
              <div className="text-white space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">⚡</span>
                  <span>Use WASD keys to move around the demo arena</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">💎</span>
                  <span>Collect glowing orbs to earn demo points</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">🏆</span>
                  <span>
                    Blue orbs = 1 point, Purple = 3 points, Gold = 5 points
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">⏰</span>
                  <span>
                    Demo game lasts 60 seconds - collect as many as you can!
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400">🎯</span>
                  <span>Highest score wins the demo prize pool!</span>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-400 transition-colors"
              >
                Got It!
              </button>
            </div>
          </div>
        )}

        {/* Game Status */}
        <div className="mb-6 text-center">
          {gameState.status === "waiting" && !isInGame && (
            <div className="bg-purple-500/20 p-6 rounded-xl border border-purple-400">
              <h2 className="text-2xl font-bold text-white mb-4">
                🎮 Ready to Enter the Demo Neon Arena?
              </h2>
              <p className="text-gray-300 mb-4">
                Demo Entry Fee: {betAmount} GOR (Demo) | Demo Prize Pool:
                Distributed to top players
              </p>

              {paymentStatus === "processing" && (
                <div className="text-yellow-400 font-bold">
                  Processing demo payment... Please wait
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="space-y-3">
                  <div className="text-red-400 font-bold">
                    Demo payment failed.
                  </div>
                  <button
                    onClick={() => setPaymentStatus("none")}
                    className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded font-medium text-sm"
                  >
                    🔄 Try Again
                  </button>
                </div>
              )}

              {paymentStatus === "none" && (
                <button
                  onClick={handleJoinGame}
                  disabled={myBalance < betAmount}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-lg font-bold hover:from-purple-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {myBalance < betAmount
                    ? "Insufficient Demo Balance"
                    : `Join Demo Game (${betAmount} GOR Demo)`}
                </button>
              )}
            </div>
          )}

          {gameState.status === "waiting" && isInGame && (
            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-400">
              <div className="text-white font-bold text-lg">
                🎯 Waiting for more demo players... ({gameState.players.length}
                /6)
              </div>
              <div className="text-gray-300 mt-2">
                Demo game starts when we have enough players!
              </div>
            </div>
          )}

          {gameState.status === "countdown" && (
            <div className="bg-yellow-500/20 p-4 rounded-xl border border-yellow-400">
              <div className="text-yellow-400 font-bold text-2xl">
                🚀 Demo Starting in {gameState.countdownTime}...
              </div>
              <div className="text-white">Get ready to collect demo orbs!</div>
            </div>
          )}

          {gameState.status === "playing" && (
            <div className="bg-green-500/20 p-4 rounded-xl border border-green-400">
              <div className="text-green-400 font-bold text-2xl">
                ⏰ {gameState.timeRemaining}s remaining
              </div>
              <div className="text-white">
                Collect demo orbs to score points!
              </div>
            </div>
          )}
        </div>

        {/* Game Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3D Game Scene */}
          <div className="lg:col-span-3">
            <div
              ref={gameContainerRef}
              className={`relative bg-black rounded-xl overflow-hidden ${
                isFullscreen ? "h-screen" : "h-96 lg:h-[600px]"
              }`}
            >
              <OrbCollectorScene
                gameState={gameState}
                playerPosition={playerPosition}
                onPlayerMove={handlePlayerMove}
                onOrbCollect={handleOrbCollect}
                isFullscreen={isFullscreen}
                myPlayerId={walletAddress}
                isActive={gameState.status === "playing"}
              />
            </div>
          </div>

          {/* Game HUD */}
          <div className="space-y-4">
            <OrbCollectorHUD
              gameState={gameState}
              myPlayer={myPlayer}
              betAmount={betAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
