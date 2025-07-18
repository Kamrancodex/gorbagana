"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getBalanceForDisplay, payEntryFeeForDisplay } from "../lib/blockchain";
import { useSocket } from "../lib/websocket";
import {
  getMockBalance,
  payMockEntryFee,
  getMockWalletAddress,
  generateMockTxSignature,
} from "../lib/mock-wallet";
import {
  requiresWalletConnection,
  isMockMode,
  getWalletAddress,
  getGameBalance,
  processGamePayment,
} from "../lib/game-utils";
import dynamic from "next/dynamic";

// Dynamic import for 3D scene to avoid SSR issues
const OrbCollectorScene = dynamic(
  () => import("../components/OrbCollectorScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-black rounded-xl flex items-center justify-center">
        <div className="text-white text-xl">Loading 3D Arena...</div>
      </div>
    ),
  }
);

const OrbCollectorHUD = dynamic(() => import("../components/OrbCollectorHUD"), {
  ssr: false,
});

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

export default function OrbCollectorPage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const router = useRouter();
  const searchParams = useSearchParams();
  const socket = useSocket();
  // Mock mode is now handled by game-utils

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

  // Load balance
  useEffect(() => {
    const loadBalance = async () => {
      const balance = await getGameBalance(publicKey);
      setMyBalance(balance);
    };
    loadBalance();
  }, [publicKey]);

  // Socket event handlers
  useEffect(() => {
    const walletAddress = isMockMode()
      ? getMockWalletAddress()
      : publicKey?.toBase58();
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
      console.log("🏁 Orb collector game ended:", results);

      // Store game results in localStorage for results page
      const gameResults = {
        gameType: "orb-collector",
        gameId: results.gameId || gameState.gameId,
        leaderboard: results.leaderboard || [],
        totalEscrowed: results.totalEscrowed || 0,
        playerWallet: walletAddress,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(
          "orbCollectorResults",
          JSON.stringify(gameResults)
        );
        localStorage.setItem("lastGameType", "orb-collector");
        console.log("📝 Stored orb collector results:", gameResults);
      } catch (error) {
        console.error("Failed to store game results:", error);
      }

      // Navigate to results page with game data
      router.push(`/results?game=orb-collector&gameId=${gameResults.gameId}`);
    };

    // Use different event names based on real wallet mode
    const gameStateEvent = isMockMode() ? "orbGameState" : "realOrbGameState";
    const orbCollectedEvent = isMockMode()
      ? "orbCollected"
      : "realOrbCollected";

    const handlePaymentError = (error: string) => {
      setPaymentStatus("failed");
      console.error("❌ Orb collector payment error:", error);
      alert(`Payment failed: ${error}`);
    };

    const handleError = (data: { message: string }) => {
      console.error("❌ Orb collector error:", data.message);
      alert(`Error: ${data.message}`);
    };

    socket.on(gameStateEvent, handleGameState);
    socket.on(orbCollectedEvent, handleOrbCollected);
    socket.on("gameEnd", handleGameEnd);

    if (!isMockMode()) {
      socket.on("paymentError", handlePaymentError);
      socket.on("error", handleError);
    }

    return () => {
      socket.off(gameStateEvent, handleGameState);
      socket.off(orbCollectedEvent, handleOrbCollected);
      socket.off("gameEnd", handleGameEnd);

      if (!isMockMode()) {
        socket.off("paymentError", handlePaymentError);
        socket.off("error", handleError);
      }
    };
  }, [socket, publicKey, isMockMode, gameStarted, gameState.gameId, router]);

  // Handle player movement
  const handlePlayerMove = (newPosition: {
    x: number;
    y: number;
    z: number;
  }) => {
    setPlayerPosition(newPosition);

    const walletAddress = isMockMode()
      ? getMockWalletAddress()
      : publicKey?.toBase58();
    if (socket && walletAddress) {
      console.log(`🎮 [${isMockMode() ? "MOCK" : "REAL"}] Player move:`, {
        gameId: gameState.gameId,
        playerId: walletAddress,
        position: newPosition,
        socketConnected: socket.connected,
        isMockMode: isMockMode(),
      });

      socket.emit("playerMove", {
        gameId: gameState.gameId,
        playerId: walletAddress,
        position: newPosition,
      });
    } else {
      console.warn(`❌ Cannot move player - missing requirements:`, {
        socket: !!socket,
        socketConnected: socket?.connected,
        walletAddress,
        isMockMode: isMockMode(),
      });
    }
  };

  // Handle orb collection
  const handleOrbCollect = (orbId: string) => {
    const walletAddress = isMockMode()
      ? getMockWalletAddress()
      : publicKey?.toBase58();
    if (socket && walletAddress) {
      const collectEvent = isMockMode() ? "collectOrb" : "collectRealOrb";
      socket.emit(collectEvent, {
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
    const walletAddress = isMockMode()
      ? getMockWalletAddress()
      : publicKey?.toBase58();
    if (!walletAddress || !socket) return;

    setPaymentStatus("processing");

    try {
      let paymentResult: {
        success: boolean;
        txSignature?: string;
        error?: string;
      };

      if (isMockMode()) {
        // Use mock payment system
        const mockResult = payMockEntryFee(
          betAmount,
          `orb-collector-${Date.now()}`
        );
        paymentResult = {
          success: mockResult.success,
          txSignature: mockResult.success
            ? generateMockTxSignature()
            : undefined,
          error: mockResult.error,
        };
      } else {
        // Process entry fee payment
        paymentResult = await payEntryFeeForDisplay(
          wallet,
          betAmount,
          `orb-collector-${Date.now()}`
        );
      }

      if (paymentResult.success) {
        setPaymentStatus("success");

        // Update balance
        if (isMockMode()) {
          setMyBalance(getMockBalance());
        }

        // Join the game room - use different events for real vs mock
        console.log(
          `🔗 [${isMockMode() ? "MOCK" : "REAL"}] Joining orb game:`,
          {
            walletAddress: walletAddress,
            betAmount: betAmount,
            nickname: `${walletAddress.slice(0, 6)}...`,
            isMockMode: isMockMode(),
            socketConnected: socket.connected,
          }
        );

        const joinEvent = isMockMode() ? "joinOrbGame" : "joinRealOrbGame";
        socket.emit(joinEvent, {
          playerId: walletAddress,
          playerNickname: `${walletAddress.slice(0, 6)}...`,
          betAmount: betAmount,
          ...(!isMockMode() ? { txSignature: paymentResult.txSignature } : {}),
          ...(isMockMode() ? { walletAddress: walletAddress } : {}),
        });
      } else {
        setPaymentStatus("failed");
        console.error("Payment failed:", paymentResult.error);

        // Show user-friendly error message
        const errorMessage = paymentResult.error?.toLowerCase() || "";
        if (
          errorMessage.includes("confirmation failed") ||
          errorMessage.includes("confirmation timed out")
        ) {
          // Special handling for confirmation timeouts - payment might have succeeded
          const shouldCheckBalance = confirm(
            "⚠️ Payment confirmation timed out!\n\n" +
              "Your payment may have actually succeeded but the network confirmation failed. " +
              "This is common on testnets when the network is busy.\n\n" +
              "Please check:\n" +
              "1. Did your balance decrease by " +
              betAmount +
              " GOR?\n" +
              "2. If yes, your payment likely succeeded\n" +
              "3. If no, please try again\n\n" +
              "Would you like to refresh the page to check your balance?"
          );

          if (shouldCheckBalance) {
            // Reload the page to refresh balance
            window.location.reload();
          }
        } else if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("connection")
        ) {
          alert(
            "⚠️ Network connection issue detected. Please try again in a moment. The blockchain network may be experiencing high traffic."
          );
        } else if (errorMessage.includes("insufficient")) {
          alert(
            "💰 Insufficient balance. Please ensure you have enough GOR tokens to pay the entry fee."
          );
        } else {
          alert(`❌ Payment failed: ${paymentResult.error}`);
        }
      }
    } catch (error) {
      setPaymentStatus("failed");
      console.error("Error processing payment:", error);
    }
  };

  // Check if player is in game
  const walletAddress = isMockMode()
    ? getMockWalletAddress()
    : publicKey?.toBase58();
  const myPlayer = gameState.players.find(
    (p) => p.walletAddress === walletAddress
  );
  const isInGame = !!myPlayer;

  if (requiresWalletConnection(connected)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Connect Wallet</h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to play Neon Orb Collector 3D
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      {/* Header */}
      <div className="p-2 md:p-4 bg-black/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center max-w-7xl mx-auto gap-2 md:gap-4">
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() =>
                router.push(isMockMode() ? "/mock-games" : "/games")
              }
              className="text-blue-400 hover:text-blue-300 text-sm md:text-lg"
            >
              ← Back to Games
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-white">
                🔮 Neon Orb Collector 3D
              </h1>
              {isMockMode() && (
                <div className="text-xs md:text-sm text-orange-400 font-bold flex items-center gap-1">
                  <span>🎭</span>
                  <span>DEMO MODE</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-row md:flex-row items-center space-x-2 md:space-x-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-white text-center md:text-right">
              <div className="text-xs md:text-sm text-gray-300">Balance</div>
              <div className="text-sm md:text-lg font-bold text-yellow-400">
                💰 {myBalance.toFixed(2)} GOR{isMockMode() ? " (Demo)" : ""}
              </div>
            </div>
            <div className="text-white text-center md:text-right">
              <div className="text-xs md:text-sm text-gray-300">Bet Amount</div>
              <div className="text-sm md:text-lg font-bold text-green-400">
                🎯 {betAmount} GOR{isMockMode() ? " (Demo)" : ""}
              </div>
            </div>
            <button
              onClick={toggleFullscreen}
              className="bg-purple-500 hover:bg-purple-400 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? "🔲 Exit" : "⛶ Full"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-2 md:p-4">
        {/* Game Instructions Modal */}
        {showInstructions && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-800 to-blue-800 p-4 md:p-8 rounded-2xl max-w-md mx-4 border border-purple-400 w-full">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
                🔮 How to Play
              </h2>
              <div className="text-white space-y-3 text-xs md:text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">⚡</span>
                  <span>
                    Use WASD keys or touch controls to move around the arena
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">💎</span>
                  <span>Collect glowing orbs to earn points</span>
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
                    Game lasts 60 seconds - collect as many as you can!
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400">🎯</span>
                  <span>Highest score wins the prize pool!</span>
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
        <div className="mb-4 md:mb-6 text-center">
          {gameState.status === "waiting" && !isInGame && (
            <div className="bg-purple-500/20 p-4 md:p-6 rounded-xl border border-purple-400">
              <h2 className="text-lg md:text-2xl font-bold text-white mb-4">
                🎮 Ready to Enter the Neon Arena?
              </h2>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                Entry Fee: {betAmount} GOR{isMockMode() ? " (Demo)" : ""} |
                Prize Pool: Distributed to top players
                {isMockMode() ? " (Virtual rewards in demo mode)" : ""}
              </p>

              {paymentStatus === "processing" && (
                <div className="text-yellow-400 font-bold text-sm md:text-base">
                  Processing payment... Please wait
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="space-y-3">
                  <div className="text-red-400 font-bold text-sm md:text-base">
                    Payment confirmation failed.
                  </div>
                  <div className="text-yellow-300 text-xs md:text-sm">
                    ⚠️ If your balance decreased, the payment may have succeeded
                    despite the error.
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded font-medium text-sm"
                  >
                    🔄 Refresh Balance
                  </button>
                </div>
              )}

              {paymentStatus === "none" && (
                <button
                  onClick={handleJoinGame}
                  disabled={myBalance < betAmount}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 md:px-8 py-2 md:py-3 rounded-lg font-bold hover:from-purple-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {myBalance < betAmount
                    ? "Insufficient Balance"
                    : `Join Game (${betAmount} GOR)`}
                </button>
              )}
            </div>
          )}

          {gameState.status === "waiting" && isInGame && (
            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-400">
              <div className="text-white font-bold text-base md:text-lg">
                🎯 Waiting for more players... ({gameState.players.length}/6)
              </div>
              <div className="text-gray-300 mt-2 text-sm md:text-base">
                Game starts when we have enough players!
              </div>
            </div>
          )}

          {gameState.status === "countdown" && (
            <div className="bg-yellow-500/20 p-4 rounded-xl border border-yellow-400">
              <div className="text-yellow-400 font-bold text-xl md:text-2xl">
                🚀 Starting in {gameState.countdownTime}...
              </div>
              <div className="text-white text-sm md:text-base">
                Get ready to collect orbs!
              </div>
            </div>
          )}

          {gameState.status === "playing" && (
            <div className="bg-green-500/20 p-4 rounded-xl border border-green-400">
              <div className="text-green-400 font-bold text-xl md:text-2xl">
                ⏰ {gameState.timeRemaining}s remaining
              </div>
              <div className="text-white text-sm md:text-base">
                Collect orbs to score points!
              </div>
            </div>
          )}
        </div>

        {/* Game Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* 3D Game Scene */}
          <div className="lg:col-span-3">
            <div
              ref={gameContainerRef}
              className={`bg-black rounded-xl overflow-hidden border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                isFullscreen
                  ? "fixed inset-0 z-50 !rounded-none"
                  : "h-40 md:h-96"
              }`}
              tabIndex={0}
              onClick={() => gameContainerRef.current?.focus()}
              style={isFullscreen ? { width: "100vw", height: "100vh" } : {}}
            >
              <OrbCollectorScene
                gameState={gameState}
                playerPosition={playerPosition}
                onPlayerMove={handlePlayerMove}
                onOrbCollect={handleOrbCollect}
                myPlayerId={walletAddress || ""}
                isActive={gameState.status === "playing"}
                isFullscreen={isFullscreen}
              />
            </div>
          </div>

          {/* Game HUD */}
          <div className="lg:col-span-1">
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
