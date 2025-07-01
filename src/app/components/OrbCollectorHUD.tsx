"use client";

import { useEffect, useState } from "react";

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

interface OrbCollectorHUDProps {
  gameState: GameState;
  myPlayer?: Player;
  betAmount: number;
}

export default function OrbCollectorHUD({
  gameState,
  myPlayer,
  betAmount,
}: OrbCollectorHUDProps) {
  const [pulseActive, setPulseActive] = useState(false);

  // Create pulse effect when timer is low
  useEffect(() => {
    if (gameState.timeRemaining <= 10 && gameState.status === "playing") {
      setPulseActive(true);
    } else {
      setPulseActive(false);
    }
  }, [gameState.timeRemaining, gameState.status]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get player rank
  const getPlayerRank = () => {
    if (!myPlayer) return null;
    const sortedPlayers = [...gameState.players].sort(
      (a, b) => b.score - a.score
    );
    return (
      sortedPlayers.findIndex(
        (p) => p.walletAddress === myPlayer.walletAddress
      ) + 1
    );
  };

  // Calculate prize distribution
  const getTotalPrizePool = () => {
    return gameState.players.length * betAmount * 0.9; // 90% to winners, 10% platform fee
  };

  const getMyPotentialWinnings = () => {
    const rank = getPlayerRank();
    const totalPrize = getTotalPrizePool();

    if (!rank || rank > 3) return 0;

    // Prize distribution: 50% / 30% / 20% for top 3
    switch (rank) {
      case 1:
        return totalPrize * 0.5;
      case 2:
        return totalPrize * 0.3;
      case 3:
        return totalPrize * 0.2;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-4">
      {/* Game Timer */}
      <div
        className={`bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border-2 transition-all duration-300 ${
          pulseActive ? "border-red-500 animate-pulse" : "border-purple-400"
        }`}
      >
        <div className="text-center">
          <div className="text-gray-300 text-sm font-medium">
            Time Remaining
          </div>
          <div
            className={`text-3xl font-bold transition-colors ${
              gameState.timeRemaining <= 10 ? "text-red-400" : "text-white"
            }`}
          >
            {gameState.status === "playing"
              ? formatTime(gameState.timeRemaining)
              : "--:--"}
          </div>
          {gameState.status === "countdown" && (
            <div className="text-yellow-400 text-xl font-bold animate-bounce">
              Starting in {gameState.countdownTime}...
            </div>
          )}
        </div>
      </div>

      {/* My Stats */}
      {myPlayer && (
        <div className="bg-gradient-to-br from-blue-800/50 to-purple-800/50 p-4 rounded-xl border border-blue-400">
          <h3 className="text-white font-bold text-lg mb-3">Your Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Score:</span>
              <span className="text-yellow-400 font-bold text-xl">
                {myPlayer.score} pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Rank:</span>
              <span className="text-green-400 font-bold">
                #{getPlayerRank() || "--"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Bet:</span>
              <span className="text-blue-400 font-bold">{betAmount} gGOR</span>
            </div>
            {getMyPotentialWinnings() > 0 && (
              <div className="flex justify-between items-center border-t border-gray-600 pt-2 mt-2">
                <span className="text-gray-300">Potential Win:</span>
                <span className="text-green-400 font-bold">
                  {getMyPotentialWinnings().toFixed(2)} gGOR
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Leaderboard */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-purple-400">
        <h3 className="text-white font-bold text-lg mb-3 flex items-center">
          🏆 Live Leaderboard
          <span className="ml-2 text-sm text-gray-400">
            ({gameState.players.length}/6)
          </span>
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {[...gameState.players]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                  player.walletAddress === myPlayer?.walletAddress
                    ? "bg-blue-500/30 border border-blue-400"
                    : "bg-gray-700/50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? "bg-yellow-500 text-black"
                        : index === 1
                        ? "bg-gray-300 text-black"
                        : index === 2
                        ? "bg-orange-500 text-white"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">
                      {player.nickname}
                      {player.walletAddress === myPlayer?.walletAddress && (
                        <span className="text-blue-400 ml-1">(You)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">
                    {player.score}
                  </div>
                  <div className="text-gray-400 text-xs">pts</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Prize Pool */}
      <div className="bg-gradient-to-br from-green-800/50 to-emerald-800/50 p-4 rounded-xl border border-green-400">
        <h3 className="text-white font-bold text-lg mb-3">💰 Prize Pool</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Total Pool:</span>
            <span className="text-green-400 font-bold text-xl">
              {getTotalPrizePool().toFixed(2)} gGOR
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            <div>
              🥇 1st Place: {(getTotalPrizePool() * 0.5).toFixed(2)} gGOR (50%)
            </div>
            <div>
              🥈 2nd Place: {(getTotalPrizePool() * 0.3).toFixed(2)} gGOR (30%)
            </div>
            <div>
              🥉 3rd Place: {(getTotalPrizePool() * 0.2).toFixed(2)} gGOR (20%)
            </div>
          </div>
        </div>
      </div>

      {/* Orb Types Guide */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-purple-400">
        <h3 className="text-white font-bold text-lg mb-3">🔮 Orb Types</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-300">Common</span>
            </div>
            <span className="text-blue-400 font-bold">1 pt</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-300">Rare</span>
            </div>
            <span className="text-purple-400 font-bold">3 pts</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-300">Legendary</span>
            </div>
            <span className="text-yellow-400 font-bold">5 pts</span>
          </div>
        </div>
      </div>

      {/* Game Info */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-600">
        <div className="text-center">
          <div className="text-gray-400 text-sm">Game ID</div>
          <div className="text-gray-300 text-xs font-mono">
            {gameState.gameId || "Waiting..."}
          </div>
          <div className="text-gray-400 text-sm mt-2">Status</div>
          <div
            className={`text-sm font-bold capitalize ${
              gameState.status === "playing"
                ? "text-green-400"
                : gameState.status === "countdown"
                ? "text-yellow-400"
                : gameState.status === "waiting"
                ? "text-blue-400"
                : "text-gray-400"
            }`}
          >
            {gameState.status === "playing"
              ? "🎮 Active"
              : gameState.status === "countdown"
              ? "⏳ Starting"
              : gameState.status === "waiting"
              ? "⏸️ Waiting"
              : "✅ Finished"}
          </div>
        </div>
      </div>

      {/* Active Orbs Counter */}
      {gameState.status === "playing" && (
        <div className="bg-gradient-to-br from-indigo-800/50 to-purple-800/50 p-3 rounded-xl border border-indigo-400">
          <div className="text-center">
            <div className="text-indigo-300 text-sm">Active Orbs</div>
            <div className="text-white text-2xl font-bold">
              {gameState.orbs.length}
            </div>
            <div className="text-xs text-gray-400">Collect them all!</div>
          </div>
        </div>
      )}
    </div>
  );
}
