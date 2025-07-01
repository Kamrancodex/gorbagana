"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameWebSocket } from "../lib/websocket";
import {
  isMockMode,
  getWalletAddress,
  getGameBalance,
  processGamePayment,
  validatePaymentRequirements,
  getBalanceDisplayText,
  requiresWalletConnection,
} from "../lib/game-utils";

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

export default function WordGridGame() {
  const router = useRouter();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
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
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [inputLetter, setInputLetter] = useState("");
  const [wordHighlights, setWordHighlights] = useState<WordHighlight[]>([]);
  const [gameTimer, setGameTimer] = useState<NodeJS.Timeout | null>(null);

  const { socket, connected: socketConnected } = useGameWebSocket();

  // Load balance on component mount and when wallet changes
  useEffect(() => {
    const loadBalance = async () => {
      if (!requiresWalletConnection(connected) || publicKey) {
        const currentBalance = await getGameBalance(publicKey);
        setBalance(currentBalance);
      }
    };
    loadBalance();
  }, [publicKey, connected]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("wordGridGameState", (gameState) => {
      console.log("📊 Word Grid game state:", gameState);
      setGrid(
        gameState.grid ||
          Array(64).fill({ letter: "", playerId: null, isNewWord: false })
      );
      setPlayers(gameState.players || []);
      setCurrentPlayer(gameState.currentPlayer);
      setGamePhase(gameState.gamePhase || "waiting");
      setWordHighlights(gameState.wordHighlights || []);
    });

    socket.on("wordGridGameStarted", (gameState) => {
      console.log("🎮 Word Grid game started!", gameState);
      setGamePhase("playing");
    });

    socket.on("wordGridGameFinished", (result) => {
      console.log("🏁 Word Grid game finished:", result);
      setGamePhase("finished");

      // Save results and redirect
      localStorage.setItem(
        "gameResults",
        JSON.stringify(result.finalStandings)
      );
      localStorage.setItem("lastGameType", "wordGrid");

      setTimeout(() => {
        router.push("/results");
      }, 3000);
    });

    socket.on("wordGridLetterPlaced", (data) => {
      console.log("📝 Letter placed:", data);
      setGrid(data.grid);
      setWordHighlights(data.newWords || []);
      setPlayers(data.players);
      setCurrentPlayer(data.nextPlayer);
      setSelectedCell(null);
      setInputLetter("");
    });

    socket.on("wordGridError", (error) => {
      console.error("❌ Word Grid error:", error);
      alert(error.message);
    });

    socket.on("wordGridRoomInfo", (roomInfo) => {
      console.log("📋 Word Grid room info:", roomInfo);
      // Update bet amount to match room's bet amount
      setBetAmount(roomInfo.betAmount);
    });

    return () => {
      socket.off("wordGridGameState");
      socket.off("wordGridGameStarted");
      socket.off("wordGridGameFinished");
      socket.off("wordGridLetterPlaced");
      socket.off("wordGridError");
      socket.off("wordGridRoomInfo");
    };
  }, [socket, router]);

  // Timer logic
  useEffect(() => {
    if (gamePhase !== "playing" || !currentPlayer) return;

    const activePlayer = players.find((p) => p.id === currentPlayer);
    if (!activePlayer) return;

    const timer = setInterval(() => {
      setPlayers((prev) =>
        prev.map((player) =>
          player.id === currentPlayer
            ? {
                ...player,
                timeRemaining: Math.max(0, player.timeRemaining - 1),
              }
            : player
        )
      );

      // Check if time ran out
      if (activePlayer.timeRemaining <= 1) {
        socket?.emit("wordGridTimeOut", { roomId });
      }
    }, 1000);

    setGameTimer(timer);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gamePhase, currentPlayer, players, socket, roomId]);

  const handleCreateRoom = async () => {
    // Validate requirements first
    if (requiresWalletConnection(connected)) {
      alert("Please connect your wallet first");
      return;
    }

    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }

    if (!roomPassword.trim()) {
      alert("Please enter a room password");
      return;
    }

    // Validate payment requirements
    const validation = await validatePaymentRequirements(wallet, betAmount);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsCreating(true);
    setPaymentStatus("pending");

    try {
      const gameId = `wordgrid_create_${roomId}`;
      const walletAddress = getWalletAddress(publicKey);

      if (!walletAddress) {
        throw new Error("Could not get wallet address");
      }

      console.log(
        `💰 Creating room with entry fee: ${betAmount} GOR${
          isMockMode() ? " (Mock)" : ""
        }`
      );

      // Process payment using unified system
      const paymentResult = await processGamePayment(wallet, betAmount, gameId);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      setPaymentStatus("success");
      console.log("✅ Payment successful:", paymentResult.txSignature);

      // Update balance after successful payment
      const newBalance = await getGameBalance(publicKey);
      setBalance(newBalance);

      // Create the game room
      socket?.emit("createWordGridRoom", {
        roomId,
        password: roomPassword,
        wallet: walletAddress,
        betAmount,
        txSignature: paymentResult.txSignature,
        isMockMode: isMockMode(),
      });

      setHasJoined(true);
    } catch (error) {
      console.error("❌ Failed to create room:", error);
      setPaymentStatus("failed");
      alert(
        `Failed to create room: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    // Validate requirements first
    if (requiresWalletConnection(connected)) {
      alert("Please connect your wallet first");
      return;
    }

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
      const walletAddress = getWalletAddress(publicKey);

      if (!walletAddress) {
        throw new Error("Could not get wallet address");
      }

      // First check the room's bet amount (this will update our betAmount state)
      socket?.emit("getWordGridRoomInfo", { roomId, password: roomPassword });

      // Use a small delay to allow room info to update betAmount
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Validate payment requirements with (potentially updated) bet amount
      const validation = await validatePaymentRequirements(wallet, betAmount);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const gameId = `wordgrid_join_${roomId}`;
      console.log(
        `💰 Joining room with entry fee: ${betAmount} GOR${
          isMockMode() ? " (Mock)" : ""
        }`
      );

      // Process payment using unified system
      const paymentResult = await processGamePayment(wallet, betAmount, gameId);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      setPaymentStatus("success");
      console.log("✅ Payment successful:", paymentResult.txSignature);

      // Update balance after successful payment
      const newBalance = await getGameBalance(publicKey);
      setBalance(newBalance);

      // Join the game room
      socket?.emit("joinWordGridGame", {
        roomId,
        password: roomPassword,
        wallet: walletAddress,
        betAmount,
        txSignature: paymentResult.txSignature,
        isMockMode: isMockMode(),
      });

      setHasJoined(true);
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      setPaymentStatus("failed");
      alert(
        `Failed to join room: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleCellClick = (cellIndex: number) => {
    if (gamePhase !== "playing") return;
    if (currentPlayer !== publicKey?.toBase58()) return;
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

  const myPlayer = players.find((p) => p.wallet === publicKey?.toBase58());
  const opponentPlayer = players.find(
    (p) => p.wallet !== publicKey?.toBase58()
  );
  const isMyTurn = currentPlayer === publicKey?.toBase58();

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 max-w-md w-full border border-white/10">
          <h1 className="text-3xl font-bold text-white text-center mb-6">
            🔤 Word Grid Battle
          </h1>

          {gameMode === "select" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-gray-300 mb-2">
                  Choose how you want to play:
                </p>
                <div className="text-sm text-yellow-400 font-bold">
                  💰 Balance: {getBalanceDisplayText(balance)}
                </div>
              </div>

              <button
                onClick={() => setGameMode("create")}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors"
              >
                🎨 Create New Room
              </button>

              <button
                onClick={() => setGameMode("join")}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                🚪 Join Existing Room
              </button>

              <button
                onClick={() => router.push("/lobby")}
                className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                ← Back to Lobby
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
                  placeholder="Create unique room ID..."
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
                  placeholder="Set room password..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Fee (Both Players)
                </label>
                <select
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={0.5}>0.5 GOR</option>
                  <option value={1}>1 GOR</option>
                  <option value={2}>2 GOR</option>
                  <option value={5}>5 GOR</option>
                  <option value={10}>10 GOR</option>
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
                  {paymentStatus === "pending" && "⏳ Creating room..."}
                  {paymentStatus === "success" &&
                    "✅ Room created! Waiting for opponent..."}
                  {paymentStatus === "failed" && "❌ Failed to create room"}
                </div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={isCreating || !connected}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? "Creating..." : `Create Room (${betAmount} GOR)`}
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
                  placeholder="Enter room ID..."
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
                  placeholder="Enter room password..."
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
                  {paymentStatus === "pending" && "⏳ Joining room..."}
                  {paymentStatus === "success" &&
                    "✅ Joined! Waiting for game to start..."}
                  {paymentStatus === "failed" && "❌ Failed to join room"}
                </div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !connected}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </button>

              <div className="text-xs text-gray-400 text-center">
                Entry fee will match the room creator's amount
              </div>
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
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔤 Word Grid Battle
          </h1>
          <p className="text-gray-300">Room: {roomId}</p>
        </div>

        {/* Game Status */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <span className="text-lg font-semibold">
                {gamePhase === "waiting" && "⏳ Waiting for players..."}
                {gamePhase === "playing" &&
                  (isMyTurn ? "🎯 Your turn!" : "⏰ Opponent's turn")}
                {gamePhase === "finished" && "🏁 Game finished!"}
              </span>
            </div>
            {gamePhase === "playing" && (
              <div className="text-yellow-300 font-mono text-lg">
                Total words found: {wordHighlights.length}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player 1 Info */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">
              {myPlayer ? "👤 You" : "👤 Player 1"}
            </h3>
            {myPlayer && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Score:</span>
                  <span className="text-green-400 font-bold">
                    {myPlayer.score} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Time:</span>
                  <span
                    className={`font-mono font-bold ${
                      myPlayer.timeRemaining < 30
                        ? "text-red-400"
                        : "text-blue-400"
                    }`}
                  >
                    {formatTime(myPlayer.timeRemaining)}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      myPlayer.timeRemaining < 30 ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{
                      width: `${(myPlayer.timeRemaining / 150) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Game Grid */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-8 gap-1 mb-4">
              {grid.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className={getCellClasses(index)}
                  disabled={
                    gamePhase !== "playing" || !isMyTurn || cell.letter !== ""
                  }
                >
                  {cell.letter}
                </button>
              ))}
            </div>

            {/* Letter Input */}
            {isMyTurn && selectedCell !== null && (
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-white">
                    Cell ({Math.floor(selectedCell / 8) + 1},{" "}
                    {(selectedCell % 8) + 1}):
                  </span>
                  <input
                    type="text"
                    value={inputLetter}
                    onChange={(e) =>
                      setInputLetter(e.target.value.toUpperCase())
                    }
                    onKeyPress={handleKeyPress}
                    maxLength={1}
                    className="w-12 h-12 text-center text-xl font-bold bg-white border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="?"
                    autoFocus
                  />
                  <button
                    onClick={handleLetterSubmit}
                    disabled={!inputLetter || inputLetter.length !== 1}
                    className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Place
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Player 2 Info */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">
              {opponentPlayer ? "🤖 Opponent" : "👤 Player 2"}
            </h3>
            {opponentPlayer && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Score:</span>
                  <span className="text-green-400 font-bold">
                    {opponentPlayer.score} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Time:</span>
                  <span
                    className={`font-mono font-bold ${
                      opponentPlayer.timeRemaining < 30
                        ? "text-red-400"
                        : "text-blue-400"
                    }`}
                  >
                    {formatTime(opponentPlayer.timeRemaining)}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      opponentPlayer.timeRemaining < 30
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${(opponentPlayer.timeRemaining / 150) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Words */}
        {wordHighlights.length > 0 && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 mt-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-3">
              🎯 Recent Words
            </h3>
            <div className="flex flex-wrap gap-2">
              {wordHighlights.slice(-10).map((highlight, index) => (
                <div
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    highlight.isNew
                      ? "bg-green-500/20 text-green-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {highlight.word} ({highlight.word.length} pts)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Controls */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => router.push("/lobby")}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
          >
            🏠 Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
