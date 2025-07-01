"use client";

import { useGameWebSocket } from "../lib/websocket";
import { useGameContract } from "../lib/anchor";
import { useState } from "react";

export default function TokenHUD() {
  const { gameState, usePowerUp } = useGameWebSocket();
  const gameContract = useGameContract();
  const [freezeReady, setFreezeReady] = useState(true);
  const [isUsingPowerUp, setIsUsingPowerUp] = useState(false);

  const playerData = gameState?.players.find((p) => p.isYou);
  const timeRemaining = gameState?.timeRemaining || 0;

  const handleFreezePowerUp = async () => {
    if (!freezeReady || !playerData || playerData.tokens < 1 || !gameContract)
      return;

    setFreezeReady(false);
    setIsUsingPowerUp(true);

    try {
      // Use smart contract to burn tokens for power-up
      const currentGameId = Math.floor(Date.now() / 1000); // In production, get this from game state
      const txSignature = await gameContract.usePowerUp(
        currentGameId,
        "FreezeRay"
      );

      console.log("Power-up transaction:", txSignature);

      // Notify WebSocket server about power-up usage
      usePowerUp("freeze");

      // Cooldown
      setTimeout(() => setFreezeReady(true), 5000);
    } catch (error: any) {
      console.error("Failed to use power-up:", error);

      // Show user-friendly error
      let errorMessage = "Failed to use Freeze Ray. ";
      if (error?.message?.includes("insufficient funds")) {
        errorMessage += "Not enough gGOR tokens.";
      } else if (error?.message?.includes("User rejected")) {
        errorMessage += "Transaction cancelled.";
      } else {
        errorMessage += "Please try again.";
      }

      alert(errorMessage);
      setFreezeReady(true); // Reset on error
    } finally {
      setIsUsingPowerUp(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!gameState || gameState.gameStatus === "waiting") {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Player Stats */}
        <div className="flex items-center space-x-6">
          <div className="bg-black/60 px-4 py-2 rounded-lg border border-yellow-500/50">
            <div className="text-yellow-400 font-bold text-lg">
              💰 {playerData?.tokens || 0} gGOR
            </div>
            <div className="text-xs text-gray-400">Collected Tokens</div>
          </div>

          <div className="bg-black/60 px-4 py-2 rounded-lg border border-blue-500/50">
            <div className="text-blue-400 font-bold text-lg">
              ⏰ {formatTime(timeRemaining)}
            </div>
            <div className="text-xs text-gray-400">Time Remaining</div>
          </div>
        </div>

        {/* Power-ups */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleFreezePowerUp}
            disabled={
              !freezeReady ||
              !playerData ||
              playerData.tokens < 1 ||
              !gameContract ||
              isUsingPowerUp
            }
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              freezeReady &&
              playerData &&
              playerData.tokens >= 1 &&
              gameContract &&
              !isUsingPowerUp
                ? "bg-blue-600 hover:bg-blue-500 text-white hover:scale-105"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isUsingPowerUp ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Using...
              </div>
            ) : (
              <>
                ❄️ Freeze Ray
                <div className="text-xs mt-1">
                  {!gameContract
                    ? "Connecting..."
                    : playerData && playerData.tokens < 1
                    ? "Need 1 gGOR"
                    : "Burns 1 gGOR"}
                </div>
              </>
            )}
          </button>
        </div>

        {/* Game Status */}
        <div className="text-right">
          <div className="bg-black/60 px-4 py-2 rounded-lg border border-gray-500/50">
            <div className="text-gray-300 font-bold">
              Players: {gameState.players.length}
            </div>
            <div className="text-xs text-gray-400">
              Status:{" "}
              {gameState.gameStatus === "playing"
                ? "🔥 Battle Active"
                : "⏳ Waiting"}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Mini */}
      {gameState.gameStatus === "playing" && (
        <div className="mt-4 bg-black/40 rounded-lg p-3 max-w-md mx-auto">
          <div className="text-center text-xs text-gray-400 mb-2">
            Live Leaderboard
          </div>
          <div className="space-y-1">
            {gameState.players
              .sort((a, b) => b.tokens - a.tokens)
              .slice(0, 3)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between text-sm ${
                    player.isYou ? "text-green-400 font-bold" : "text-gray-300"
                  }`}
                >
                  <span>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    {player.isYou ? " You" : ` Player ${index + 1}`}
                  </span>
                  <span>{player.tokens} gGOR</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Blockchain Status */}
      <div className="mt-2 text-center">
        <div className="text-xs text-gray-500">
          🔗{" "}
          {gameContract
            ? "Smart Contract Connected"
            : "Connecting to Gorbagana..."}
        </div>
      </div>
    </div>
  );
}
