"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameWebSocket } from "../lib/websocket";
import { useGameContract, getGamePDA } from "../lib/anchor";
import { PublicKey } from "@solana/web3.js";

export default function LobbyPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const {
    lobbyState,
    joinLobby,
    joinGame,
    connected: wsConnected,
    currentUserWallet,
    socket,
  } = useGameWebSocket();
  const gameContract = useGameContract();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);

  useEffect(() => {
    if (!connected) {
      router.push("/");
      return;
    }

    if (wsConnected && publicKey && !hasJoined) {
      joinLobby(publicKey.toBase58());
      setHasJoined(true);
    }
  }, [connected, wsConnected, publicKey, joinLobby, hasJoined, router]);

  // Listen for game redirect events
  useEffect(() => {
    if (!socket) return;

    const handleGameStarting = (data: { gameId: string; message: string }) => {
      console.log("🚀 Game starting event received:", data);
    };

    const handleRedirectToGame = (data: { gameId: string }) => {
      console.log("🚀 Countdown finished! Redirecting to game...", data);
      // Use Next.js router instead of window.location to preserve WebSocket connection
      router.push("/game");
    };

    socket.on("gameStarting", handleGameStarting);
    socket.on("redirectToGame", handleRedirectToGame);

    return () => {
      socket.off("gameStarting", handleGameStarting);
      socket.off("redirectToGame", handleRedirectToGame);
    };
  }, [socket, router]);

  const handleJoinGame = async () => {
    if (!publicKey) return;

    setIsJoining(true);
    try {
      console.log("🎯 Joining lobby and preparing entry fee...");

      // For now, just join the lobby
      // The actual blockchain transaction will happen when the countdown finishes
      // and we transition to the game

      // This will automatically trigger lobby join via useEffect
      // No need to manually call anything here

      console.log("✅ Ready to play! Waiting for other players...");
    } catch (error: any) {
      console.error("Failed to join lobby:", error);
      alert("Failed to join lobby. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleInitializeNewGame = async () => {
    if (!gameContract) return;

    try {
      const gameId = Math.floor(Date.now() / 1000);
      const result = await gameContract.initializeGame(gameId, 5, 6);
      console.log("New game initialized:", result);
      setCurrentGameId(gameId);
    } catch (error) {
      console.error("Failed to initialize game:", error);
    }
  };

  if (!connected) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 p-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            ← Back to Home
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
              Game Lobby
            </h1>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-400">Wallet Connected</p>
            <p className="text-xs text-gray-500">
              {publicKey?.toBase58().slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Rules */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">
              Game Rules
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>
                  <strong>Entry Fee:</strong> 5 gGOR to join the arena
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>
                  <strong>Game Time:</strong> 60 seconds of intense action
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>
                  <strong>Collect Tokens:</strong> Grab orbs worth 1-5 gGOR each
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>
                  <strong>Freeze Power-up:</strong> Burn 1 gGOR to freeze
                  opponents
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>
                  <strong>Prizes:</strong> Top 3 players split the entry pool
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-pink-500/20 rounded-lg border border-yellow-500/30">
              <h3 className="font-bold text-yellow-400 mb-2">
                Prize Distribution
              </h3>
              <div className="text-sm space-y-1">
                <div>🥇 1st Place: 50% of pool</div>
                <div>🥈 2nd Place: 30% of pool</div>
                <div>🥉 3rd Place: 20% of pool</div>
              </div>
            </div>

            {/* Blockchain Info */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
              <h3 className="font-bold text-blue-400 mb-2">
                🔗 Blockchain Features
              </h3>
              <div className="text-sm space-y-1 text-gray-300">
                <div>• Entry fees secured in smart contract vault</div>
                <div>• Power-up burns verified on-chain</div>
                <div>• Automatic prize distribution</div>
                <div>• Gorbagana testnet integration</div>
              </div>
            </div>
          </div>

          {/* Players Waiting */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">
              Players in Lobby
            </h2>

            {!wsConnected ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Connecting to game server...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {lobbyState?.players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border ${
                        player.wallet === currentUserWallet
                          ? "bg-green-500/20 border-green-500"
                          : "bg-gray-700/50 border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">
                          {player.wallet.slice(0, 6)}...
                          {player.wallet.slice(-4)}
                          {player.wallet === currentUserWallet && (
                            <span className="ml-2 text-green-400 font-bold">
                              (You)
                            </span>
                          )}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            player.ready
                              ? "bg-green-500 text-white"
                              : "bg-yellow-500 text-black"
                          }`}
                        >
                          {player.ready ? "Ready" : "Waiting"}
                        </span>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-400">
                      No players in lobby yet...
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-4">
                    {lobbyState?.players.length || 0}/6 players • Minimum 2 to
                    start
                  </p>

                  {lobbyState?.gameStarting ? (
                    <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4 rounded-lg">
                      <div className="text-2xl font-bold">
                        Game Starting in {lobbyState.countdown}s
                      </div>
                      <div className="text-sm text-green-100 mt-2">
                        🎮 Get ready for battle!
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 p-4 rounded-lg border border-green-500/30 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400 mb-2">
                            ✅ You're in the lobby!
                          </div>
                          <div className="text-sm text-gray-300">
                            {lobbyState?.players.length === 1
                              ? "Waiting for more players to join..."
                              : "Ready to start when countdown begins!"}
                          </div>
                        </div>
                      </div>

                      {/* Developer Tools */}
                      <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                        <p className="text-xs text-gray-400 mb-2">
                          Developer Tools:
                        </p>
                        <button
                          onClick={handleInitializeNewGame}
                          disabled={!gameContract}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition"
                        >
                          Initialize New Game
                        </button>
                        {currentGameId && (
                          <p className="text-xs text-gray-400 mt-2">
                            Current Game ID: {currentGameId}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Controls Help */}
        <div className="mt-8 bg-gray-800/30 p-4 rounded-xl border border-gray-700">
          <h3 className="font-bold mb-2 text-center">Game Controls</h3>
          <div className="flex justify-center space-x-8 text-sm text-gray-400">
            <div>WASD or Arrow Keys: Move</div>
            <div>Space: Use Freeze Power-up</div>
            <div>Mouse: Look Around</div>
          </div>
        </div>
      </div>
    </div>
  );
}
