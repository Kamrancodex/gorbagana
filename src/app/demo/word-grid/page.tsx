"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameWebSocket } from "../../lib/websocket";
import {
  getMockBalance,
  payMockEntryFee,
  getMockWalletAddress,
  generateMockTxSignature,
} from "../../lib/mock-wallet";

interface GridCell {
  letter: string;
  playerId: string | null;
  isNewWord: boolean;
}

interface Player {
  id: string;
  wallet: string;
  timeRemaining: number;
  score: number;
  isActive: boolean;
}

interface WordHighlight {
  cells: number[];
  word: string;
  isNew: boolean;
}

export default function DemoWordGridGame() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string>("");
  const [roomPassword, setRoomPassword] = useState<string>("");
  const [betAmount, setBetAmount] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [gameMode, setGameMode] = useState<"select" | "create" | "join">(
    "select"
  );
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "success" | "failed" | null
  >(null);
  const [balance, setBalance] = useState<number>(0);

  // Game state
  const [grid, setGrid] = useState<GridCell[]>(
    Array(64).fill({ letter: "", playerId: null, isNewWord: false })
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<
    "waiting" | "playing" | "finished"
  >("waiting");
  const [wordHighlights, setWordHighlights] = useState<WordHighlight[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [inputLetter, setInputLetter] = useState<string>("");

  const { socket, connected: socketConnected } = useGameWebSocket();

  // Load mock balance
  useEffect(() => {
    const balance = getMockBalance();
    setBalance(balance);
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: any) => {
      console.log("✅ Demo room created:", data);
      setHasJoined(true);
    };

    const handleRoomJoined = (data: any) => {
      console.log("✅ Demo room joined:", data);
      setHasJoined(true);
    };

    const handleGameState = (data: any) => {
      console.log("🎮 Demo game state update:", data);
      setGrid(data.grid || grid);
      setPlayers(data.players || []);
      setCurrentPlayer(data.currentPlayer);
      setGamePhase(data.gamePhase || "waiting");
      setWordHighlights(data.wordHighlights || []);
    };

    const handleError = (error: any) => {
      console.error("❌ Demo game error:", error);
      alert(`Demo game error: ${error.message || error}`);
      setPaymentStatus("failed");
    };

    socket.on("wordGridRoomCreated", handleRoomCreated);
    socket.on("wordGridRoomJoined", handleRoomJoined);
    socket.on("wordGridGameState", handleGameState);
    socket.on("wordGridError", handleError);

    return () => {
      socket.off("wordGridRoomCreated", handleRoomCreated);
      socket.off("wordGridRoomJoined", handleRoomJoined);
      socket.off("wordGridGameState", handleGameState);
      socket.off("wordGridError", handleError);
    };
  }, [socket, grid]);

  const handleCreateRoom = async () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }

    if (!roomPassword.trim()) {
      alert("Please enter a room password");
      return;
    }

    // Check demo balance
    if (balance < betAmount) {
      alert(
        `Insufficient demo balance. Need ${betAmount} GOR, have ${balance.toFixed(
          2
        )} GOR`
      );
      return;
    }

    setIsCreating(true);
    setPaymentStatus("pending");

    try {
      const gameId = `demo_wordgrid_create_${roomId}`;
      const walletAddress = getMockWalletAddress();

      console.log(
        `💰 Creating demo room with entry fee: ${betAmount} GOR (Demo)`
      );

      // Process demo payment
      const mockResult = payMockEntryFee(betAmount, gameId);
      const paymentResult = {
        success: mockResult.success,
        txSignature: mockResult.success ? generateMockTxSignature() : undefined,
        error: mockResult.error,
      };

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Demo payment failed");
      }

      setPaymentStatus("success");
      console.log("✅ Demo payment successful:", paymentResult.txSignature);

      // Update balance after successful payment
      const newBalance = getMockBalance();
      setBalance(newBalance);

      // Create the demo game room
      socket?.emit("createWordGridRoom", {
        roomId,
        password: roomPassword,
        wallet: walletAddress,
        betAmount,
        txSignature: paymentResult.txSignature,
        isMockMode: true,
      });

      setHasJoined(true);
    } catch (error) {
      console.error("❌ Failed to create demo room:", error);
      setPaymentStatus("failed");
      alert(
        `Failed to create demo room: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }

    if (!roomPassword.trim()) {
      alert("Please enter the room password");
      return;
    }

    setIsJoining(true);
    setPaymentStatus("pending");

    try {
      const walletAddress = getMockWalletAddress();

      // First check the room's bet amount
      socket?.emit("getWordGridRoomInfo", { roomId, password: roomPassword });

      // Use a small delay to allow room info to update betAmount
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check demo balance
      if (balance < betAmount) {
        throw new Error(
          `Insufficient demo balance. Need ${betAmount} GOR, have ${balance.toFixed(
            2
          )} GOR`
        );
      }

      const gameId = `demo_wordgrid_join_${roomId}`;
      console.log(
        `💰 Joining demo room with entry fee: ${betAmount} GOR (Demo)`
      );

      // Process demo payment
      const mockResult = payMockEntryFee(betAmount, gameId);
      const paymentResult = {
        success: mockResult.success,
        txSignature: mockResult.success ? generateMockTxSignature() : undefined,
        error: mockResult.error,
      };

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Demo payment failed");
      }

      setPaymentStatus("success");
      console.log("✅ Demo payment successful:", paymentResult.txSignature);

      // Update balance after successful payment
      const newBalance = getMockBalance();
      setBalance(newBalance);

      // Join the demo game room
      socket?.emit("joinWordGridGame", {
        roomId,
        password: roomPassword,
        wallet: walletAddress,
        betAmount,
        txSignature: paymentResult.txSignature,
        isMockMode: true,
      });

      setHasJoined(true);
    } catch (error) {
      console.error("❌ Failed to join demo room:", error);
      setPaymentStatus("failed");
      alert(
        `Failed to join demo room: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleCellClick = (cellIndex: number) => {
    if (gamePhase !== "playing") return;
    if (currentPlayer !== getMockWalletAddress()) return;
    if (grid[cellIndex].letter !== "") return; // Cell already occupied

    setSelectedCell(cellIndex);
  };

  const handleLetterSubmit = () => {
    if (!selectedCell && selectedCell !== 0) return;
    if (!inputLetter || inputLetter.length !== 1) return;
    if (!/^[A-Z]$/i.test(inputLetter)) {
      alert("Please enter a single letter (A-Z)");
      return;
    }

    socket?.emit("placeWordGridLetter", {
      roomId,
      cellIndex: selectedCell,
      letter: inputLetter.toUpperCase(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLetterSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCellClasses = (cellIndex: number) => {
    const cell = grid[cellIndex];
    let classes =
      "w-12 h-12 border-2 border-gray-300 flex items-center justify-center text-lg font-bold cursor-pointer transition-colors ";

    if (cell.letter) {
      classes += "bg-blue-100 text-blue-800 ";
    } else {
      classes += "bg-white hover:bg-gray-50 ";
    }

    if (selectedCell === cellIndex) {
      classes += "ring-4 ring-yellow-400 ";
    }

    if (cell.isNewWord) {
      classes += "bg-green-200 border-green-500 ";
    }

    // Check if cell is part of highlighted word
    const isHighlighted = wordHighlights.some(
      (highlight) => highlight.cells.includes(cellIndex) && highlight.isNew
    );
    if (isHighlighted) {
      classes += "bg-yellow-200 border-yellow-500 animate-pulse ";
    }

    return classes;
  };

  const myPlayer = players.find((p) => p.wallet === getMockWalletAddress());
  const opponentPlayer = players.find(
    (p) => p.wallet !== getMockWalletAddress()
  );
  const isMyTurn = currentPlayer === getMockWalletAddress();

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 max-w-md w-full border border-white/10">
          <h1 className="text-3xl font-bold text-white text-center mb-6">
            🔤 Demo Word Grid Battle
          </h1>

          {gameMode === "select" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-gray-300 mb-2">
                  Choose how you want to play:
                </p>
                <div className="text-sm text-yellow-400 font-bold">
                  💰 Demo Balance: {balance.toFixed(2)} GOR (Demo)
                </div>
                <div className="text-sm text-orange-400 font-bold flex items-center gap-1 justify-center mt-2">
                  <span>🎭</span>
                  <span>DEMO MODE</span>
                </div>
              </div>

              <button
                onClick={() => setGameMode("create")}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors"
              >
                🎨 Create Demo Room
              </button>

              <button
                onClick={() => setGameMode("join")}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                🚪 Join Demo Room
              </button>

              <button
                onClick={() => router.push("/mock-games")}
                className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                ← Back to Demo Games
              </button>
            </div>
          )}

          {gameMode === "create" && (
            <div className="space-y-4">
              <button
                onClick={() => setGameMode("select")}
                className="text-gray-400 hover:text-white mb-4"
              >
                ← Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Create unique demo room ID..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Password
                </label>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Set demo room password..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Fee (Both Players) - Demo
                </label>
                <select
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={0.5}>0.5 GOR (Demo)</option>
                  <option value={1}>1 GOR (Demo)</option>
                  <option value={2}>2 GOR (Demo)</option>
                  <option value={5}>5 GOR (Demo)</option>
                  <option value={10}>10 GOR (Demo)</option>
                </select>
              </div>

              {paymentStatus && (
                <div
                  className={`p-3 rounded-lg text-center ${
                    paymentStatus === "success"
                      ? "bg-green-500/20 text-green-300"
                      : paymentStatus === "failed"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {paymentStatus === "pending" && "⏳ Creating demo room..."}
                  {paymentStatus === "success" &&
                    "✅ Demo room created! Waiting for opponent..."}
                  {paymentStatus === "failed" &&
                    "❌ Failed to create demo room"}
                </div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={isCreating || balance < betAmount}
                className={`w-full py-3 px-4 font-bold rounded-lg transition-colors ${
                  isCreating || balance < betAmount
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isCreating
                  ? "Creating Demo Room..."
                  : balance < betAmount
                  ? "Insufficient Demo Balance"
                  : `Create Demo Room (${betAmount} GOR Demo)`}
              </button>
            </div>
          )}

          {gameMode === "join" && (
            <div className="space-y-4">
              <button
                onClick={() => setGameMode("select")}
                className="text-gray-400 hover:text-white mb-4"
              >
                ← Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter demo room ID..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Password
                </label>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter demo room password..."
                />
              </div>

              {paymentStatus && (
                <div
                  className={`p-3 rounded-lg text-center ${
                    paymentStatus === "success"
                      ? "bg-green-500/20 text-green-300"
                      : paymentStatus === "failed"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {paymentStatus === "pending" && "⏳ Joining demo room..."}
                  {paymentStatus === "success" &&
                    "✅ Joined demo! Waiting for game to start..."}
                  {paymentStatus === "failed" && "❌ Failed to join demo room"}
                </div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className={`w-full py-3 px-4 font-bold rounded-lg transition-colors ${
                  isJoining
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isJoining ? "Joining Demo Room..." : "Join Demo Room"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/mock-games")}
              className="text-blue-400 hover:text-blue-300"
            >
              ← Back to Demo Games
            </button>
            <h1 className="text-3xl font-bold text-white">
              🔤 Demo Word Grid Battle
            </h1>
            <div className="text-sm text-orange-400 font-bold flex items-center gap-1">
              <span>🎭</span>
              <span>DEMO MODE</span>
            </div>
          </div>
          <div className="text-white text-right">
            <div className="text-sm text-gray-300">Demo Balance</div>
            <div className="text-lg font-bold text-yellow-400">
              💰 {balance.toFixed(2)} GOR (Demo)
            </div>
          </div>
        </div>

        {/* Game Grid and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Grid */}
          <div className="lg:col-span-3">
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-8 gap-1 max-w-2xl mx-auto mb-6">
                {Array.from({ length: 64 }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    className={getCellClasses(index)}
                    disabled={gamePhase !== "playing" || !isMyTurn}
                  >
                    {grid[index]?.letter || ""}
                  </button>
                ))}
              </div>

              {/* Letter Input */}
              {gamePhase === "playing" && isMyTurn && selectedCell !== null && (
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <input
                    type="text"
                    value={inputLetter}
                    onChange={(e) =>
                      setInputLetter(e.target.value.toUpperCase())
                    }
                    onKeyPress={handleKeyPress}
                    className="w-16 h-16 text-center text-2xl font-bold bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1}
                    placeholder="?"
                  />
                  <button
                    onClick={handleLetterSubmit}
                    disabled={!inputLetter}
                    className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Place Letter
                  </button>
                </div>
              )}

              {/* Game Status */}
              <div className="text-center text-white">
                {gamePhase === "waiting" && (
                  <div className="text-lg">⏳ Waiting for demo opponent...</div>
                )}
                {gamePhase === "playing" && (
                  <div className="text-lg">
                    {isMyTurn ? "🎯 Your turn!" : "⏳ Opponent's turn..."}
                    {selectedCell !== null && (
                      <div className="text-sm text-gray-300 mt-2">
                        Selected cell: {selectedCell + 1}
                      </div>
                    )}
                  </div>
                )}
                {gamePhase === "finished" && (
                  <div className="text-lg">🏁 Demo game finished!</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Player Info */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">
                👥 Demo Players
              </h3>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border ${
                      player.wallet === getMockWalletAddress()
                        ? "border-green-400 bg-green-500/20"
                        : "border-gray-400 bg-gray-500/20"
                    }`}
                  >
                    <div className="text-white font-bold">
                      {player.wallet === getMockWalletAddress()
                        ? "You"
                        : "Opponent"}{" "}
                      (Demo)
                    </div>
                    <div className="text-sm text-gray-300">
                      Score: {player.score} | Time:{" "}
                      {formatTime(player.timeRemaining)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Info */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">
                🏠 Demo Room
              </h3>
              <div className="space-y-2 text-white">
                <div className="flex justify-between">
                  <span>Room ID:</span>
                  <span className="font-mono">{roomId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entry Fee:</span>
                  <span>{betAmount} GOR (Demo)</span>
                </div>
                <div className="flex justify-between">
                  <span>Game Phase:</span>
                  <span className="capitalize">{gamePhase}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
