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
  paymentConfirmed: boolean;
}

interface WordHighlight {
  cells: number[];
  word: string;
  isNew: boolean;
  points: number;
  playerId?: string;
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
  const [isMobile, setIsMobile] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [isGeneratingRoom, setIsGeneratingRoom] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<any>(null);
  const [grid, setGrid] = useState<GridCell[]>(
    Array(64).fill({ letter: "", playerId: null, isNewWord: false })
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<
    "waiting" | "countdown" | "playing" | "finished"
  >("waiting");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [inputLetter, setInputLetter] = useState("");
  const [wordHighlights, setWordHighlights] = useState<WordHighlight[]>([]);
  const [gameTimer, setGameTimer] = useState<NodeJS.Timeout | null>(null);
  const [recentWords, setRecentWords] = useState<WordHighlight[]>([]);

  const { socket, connected: socketConnected } = useGameWebSocket();

  // Detect mobile device
  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileDevice =
        window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(isMobileDevice);
      setShowVirtualKeyboard(true); // Always show for testing
      console.log(
        `📱 Mobile detection: ${
          isMobileDevice ? "Mobile device" : "Desktop device"
        }, width: ${window.innerWidth}`
      );
      console.log(`⌨️ Virtual keyboard enabled: ${true}`);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

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

    const handleWordGridRoomCreated = (data: any) => {
      console.log("✅ Word Grid room created successfully:", data);
      setIsCreating(false);
      setHasJoined(true);
      if (data.gameState) {
        setGameState(data.gameState);
        // Set game phase based on actual game state
        setGamePhase(data.gameState.gamePhase || "waiting");

        // Update players and other game state
        if (data.gameState.players) {
          setPlayers(data.gameState.players);
        }
        if (data.gameState.grid) {
          setGrid(data.gameState.grid);
        }

        console.log(
          `🎮 Game phase set to: ${data.gameState.gamePhase || "waiting"}`
        );
      }
    };

    const handleWordGridRoomJoined = (data: any) => {
      console.log("✅ Word Grid room joined successfully:", data);
      setIsJoining(false);
      setHasJoined(true);
      if (data.gameState) {
        setGameState(data.gameState);
        setGamePhase("waiting");
      }
    };

    const handleWordGridState = (gameState: any) => {
      console.log("🔄 Word Grid state updated:", gameState);
      setGameState(gameState);

      // Update all relevant state from gameState
      if (gameState.gamePhase) {
        setGamePhase(gameState.gamePhase);
      }

      if (gameState.players) {
        setPlayers(gameState.players);
      }

      if (gameState.grid) {
        setGrid(gameState.grid);
      }

      if (gameState.currentPlayer !== undefined) {
        setCurrentPlayer(gameState.currentPlayer);
      }

      if (gameState.wordHighlights) {
        setWordHighlights(gameState.wordHighlights);
      }
    };

    const handleWordGridGameStarted = (gameState: any) => {
      console.log("🚀 Word Grid game started!", gameState);
      setGamePhase("playing");

      if (gameState.players) {
        setPlayers(gameState.players);
      }

      if (gameState.currentPlayer) {
        setCurrentPlayer(gameState.currentPlayer);
      }

      if (gameState.grid) {
        setGrid(gameState.grid);
      }

      console.log(
        `🎯 Game started! Current player: ${gameState.currentPlayer}`
      );
      console.log(`👤 My player ID: ${myPlayer?.id}`);
      console.log(`🎮 Is my turn: ${gameState.currentPlayer === myPlayer?.id}`);
    };

    const handleWordGridLetterPlaced = (data: any) => {
      console.log("📝 Letter placed successfully:", data);

      // Update grid with new letter
      if (data.grid) {
        setGrid(data.grid);
      }

      // Update player scores and info
      if (data.players) {
        setPlayers(data.players);
      }

      // Switch to next player
      if (data.nextPlayer) {
        setCurrentPlayer(data.nextPlayer);
      }

      // Show word highlights if any new words formed
      if (data.newWords && data.newWords.length > 0) {
        setWordHighlights(
          data.newWords.map((word: any) => ({
            ...word,
            isNew: true,
          }))
        );

        console.log(
          `🎉 New words formed: ${data.newWords
            .map((w: any) => w.word)
            .join(", ")}`
        );
      }
    };

    const handleWordGridWordsFormed = (data: any) => {
      console.log("🎯 Words formed event:", data);

      // Add to recent words with player information
      if (data.words) {
        const newWords = data.words.map((word: any) => ({
          word: word.word,
          points: word.points,
          playerId: word.playerId,
          timestamp: Date.now(),
        }));

        setRecentWords((prev) => [...newWords, ...prev].slice(0, 10));
      }
    };

    const handleWordGridGameFinished = (result: any) => {
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
    };

    const handleError = (error: any) => {
      console.error("❌ Word Grid error:", error);

      // Reset loading states on error
      setIsCreating(false);
      setIsJoining(false);
      setPaymentStatus("failed");

      // Show user-friendly error message
      const message = error.message || "An unexpected error occurred";
      alert(message);

      // If it's a room creation error, clear the room ID so user can generate a new one
      if (message.includes("already exists")) {
        console.log("🔄 Room already exists, please generate a new room ID");
        setRoomId(""); // Clear current room ID
      }
    };

    const handleWordGridCountdown = (data: any) => {
      console.log("⏱️ Word Grid countdown started:", data);
      setGamePhase("countdown");

      if (data.gameState) {
        setGameState(data.gameState);
        setPlayers(data.gameState.players || []);
      }
    };

    socket.on("wordGridRoomCreated", handleWordGridRoomCreated);
    socket.on("wordGridRoomJoined", handleWordGridRoomJoined);
    socket.on("wordGridState", handleWordGridState);
    socket.on("wordGridCountdown", handleWordGridCountdown);
    socket.on("wordGridGameStarted", handleWordGridGameStarted);
    socket.on("wordGridLetterPlaced", handleWordGridLetterPlaced);
    socket.on("wordGridWordsFormed", handleWordGridWordsFormed);
    socket.on("wordGridGameFinished", handleWordGridGameFinished);
    socket.on("error", handleError);

    return () => {
      socket.off("wordGridRoomCreated", handleWordGridRoomCreated);
      socket.off("wordGridRoomJoined", handleWordGridRoomJoined);
      socket.off("wordGridState", handleWordGridState);
      socket.off("wordGridCountdown", handleWordGridCountdown);
      socket.off("wordGridGameStarted", handleWordGridGameStarted);
      socket.off("wordGridLetterPlaced", handleWordGridLetterPlaced);
      socket.off("wordGridWordsFormed", handleWordGridWordsFormed);
      socket.off("wordGridGameFinished", handleWordGridGameFinished);
      socket.off("error", handleError);
    };
  }, [socket, router]);

  // Timer logic for countdown and playing phases
  useEffect(() => {
    if (gamePhase === "countdown") {
      // Countdown timer (10 seconds)
      let countdown = 10;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          setGamePhase("playing");
        }
      }, 1000);

      setGameTimer(timer);
      return () => {
        if (timer) clearInterval(timer);
      };
    } else if (gamePhase === "playing" && currentPlayer) {
      // Playing phase timer
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

        if (activePlayer.timeRemaining <= 1) {
          socket?.emit("wordGridTimeOut", { roomId });
        }
      }, 1000);

      setGameTimer(timer);

      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [gamePhase, currentPlayer, players, socket, roomId]);

  const generateRoomId = async () => {
    setIsGeneratingRoom(true);
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        }/api/generate-room-id/wordgrid`
      );
      const data = await response.json();

      if (data.success) {
        setRoomId(data.roomId);
        console.log(`🎲 Generated room ID: ${data.roomId}`);
      } else {
        throw new Error(data.error || "Failed to generate room ID");
      }
    } catch (error) {
      console.error("❌ Failed to generate room ID:", error);
      alert("Failed to generate room ID. Please try again.");
    } finally {
      setIsGeneratingRoom(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomId.trim()) {
      alert("Please generate a room ID first");
      return;
    }

    if (isCreating) {
      console.log(
        "⚠️ Room creation already in progress, ignoring duplicate request"
      );
      return;
    }

    setIsCreating(true);
    setPaymentStatus("pending");

    try {
      const walletAddress = getWalletAddress(publicKey);

      console.log(`🎯 Creating room ${roomId} for wallet ${walletAddress}`);

      // Process payment first
      const paymentResult = await processGamePayment(
        wallet,
        betAmount,
        `wordgrid_create_${roomId}`
      );
      console.log("✅ Payment successful:", paymentResult.txSignature);

      // Update balance after successful payment
      const newBalance = await getGameBalance(publicKey);
      setBalance(newBalance);

      // Create the room with payment confirmation
      console.log(`📤 Sending createWordGridRoom event for ${roomId}`);
      socket?.emit("createWordGridRoom", {
        roomId,
        password: roomPassword || null,
        betAmount,
        wallet: walletAddress,
        isMockMode: isMockMode(),
        txSignature: paymentResult.txSignature, // Include transaction signature
      });

      setPaymentStatus("success");
      setHasJoined(true);
    } catch (error) {
      console.error("❌ Failed to create room:", error);
      setPaymentStatus("failed");

      // Reset states on error
      setIsCreating(false);
      setHasJoined(false);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to create room: ${errorMessage}`);
    }
    // Note: Don't set isCreating to false here - let the socket response handle it
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }

    if (!wallet || !publicKey) {
      alert("Please connect your wallet first");
      return;
    }

    setIsJoining(true);
    setPaymentStatus("pending");

    try {
      const walletAddress = getWalletAddress(publicKey);

      if (!walletAddress) {
        throw new Error(
          "Unable to get wallet address. Please reconnect your wallet."
        );
      }

      console.log(`🎯 Joining room ${roomId} with wallet ${walletAddress}`);

      // Process payment first
      const paymentResult = await processGamePayment(
        wallet,
        betAmount,
        `wordgrid_join_${roomId}`
      );
      console.log("✅ Payment successful:", paymentResult.txSignature);

      // Update balance after successful payment
      const newBalance = await getGameBalance(publicKey);
      setBalance(newBalance);

      // Join the room with payment confirmation
      socket?.emit("joinWordGridRoom", {
        roomId,
        password: roomPassword,
        wallet: walletAddress,
        betAmount,
        txSignature: paymentResult.txSignature, // Include transaction signature
      });

      setPaymentStatus("success");
      setHasJoined(true);
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      setPaymentStatus("failed");

      // Reset states on error
      setIsJoining(false);
      setHasJoined(false);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to join room: ${errorMessage}`);
    }
    // Note: Don't set isJoining to false here - let the socket response handle it
  };

  const handleCellClick = (cellIndex: number) => {
    console.log(
      `🎯 Cell clicked: ${cellIndex}, gamePhase: ${gamePhase}, isMyTurn: ${isMyTurn}, hasLetter: ${
        grid[cellIndex]?.letter !== ""
      }`
    );

    // Allow clicking during waiting phase (for testing) or playing phase
    if (gamePhase !== "playing" && gamePhase !== "waiting") return;

    // For waiting phase, still allow selection but show different feedback
    if (gamePhase === "waiting") {
      setSelectedCell(cellIndex);
      console.log(
        `⏳ Game in waiting phase - cell selected but game not started yet`
      );
      return;
    }

    if (!isMyTurn) {
      console.log(`🚫 Not your turn`);
      return;
    }

    if (grid[cellIndex].letter !== "") {
      console.log(`🚫 Cell already occupied`);
      return; // Cell already occupied
    }

    setSelectedCell(cellIndex);
    console.log(`✅ Cell ${cellIndex} selected successfully`);

    // Auto-show virtual keyboard on mobile
    if (isMobile) {
      setShowVirtualKeyboard(true);
    }
  };

  const handleLetterSubmit = () => {
    if (selectedCell === null) return;
    if (!inputLetter || inputLetter.length !== 1) return;
    if (!/^[A-Z]$/i.test(inputLetter)) {
      alert("Please enter a single letter (A-Z)");
      return;
    }

    if (!isMyTurn) {
      alert("🚫 It's not your turn!");
      return;
    }

    if (gamePhase !== "playing") {
      alert("⏳ Game hasn't started yet!");
      return;
    }

    console.log(
      `📝 Submitting letter ${inputLetter.toUpperCase()} to cell ${selectedCell}`
    );

    socket?.emit("placeWordGridLetter", {
      roomId,
      cellIndex: selectedCell,
      letter: inputLetter.toUpperCase(),
    });

    // Clear selection after placing letter
    setSelectedCell(null);
    setInputLetter("");

    // Hide virtual keyboard on mobile after placement
    if (isMobile) {
      setShowVirtualKeyboard(false);
    }
  };

  const handleVirtualKeyClick = (letter: string) => {
    setInputLetter(letter);
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
    let classes = `${
      isMobile ? "w-8 h-8 text-sm" : "w-12 h-12 text-lg"
    } border-2 border-gray-300 flex items-center justify-center font-bold cursor-pointer transition-colors `;

    if (cell.letter) {
      // Color letters based on which player placed them
      const player = players.find((p) => p.id === cell.playerId);
      const isMyLetter = player?.wallet === publicKey?.toBase58();

      if (isMyLetter) {
        classes += "bg-blue-500 text-white border-blue-600 "; // Your letters = Blue
      } else {
        classes += "bg-green-500 text-white border-green-600 "; // Opponent letters = Green
      }
    } else {
      classes += "bg-white hover:bg-gray-50 ";
    }

    if (selectedCell === cellIndex) {
      classes += "ring-4 ring-yellow-400 shadow-lg ";
    }

    if (cell.isNewWord) {
      classes += "animate-pulse ring-2 ring-orange-400 ";
    }

    // Check if cell is part of highlighted word
    const isHighlighted = wordHighlights.some(
      (highlight) => highlight.cells?.includes(cellIndex) && highlight.isNew
    );
    if (isHighlighted) {
      classes += "bg-yellow-200 border-yellow-500 animate-bounce ";
    }

    return classes;
  };

  const renderVirtualKeyboard = () => {
    // Show virtual keyboard when enabled and a cell is selected (removed game phase restriction for testing)
    const shouldShowKeyboard = showVirtualKeyboard && selectedCell !== null;

    console.log(
      `⌨️ Keyboard render check: showVirtualKeyboard=${showVirtualKeyboard}, selectedCell=${selectedCell}, shouldShow=${shouldShowKeyboard}`
    );

    if (!shouldShowKeyboard) return null;

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
        <h3 className="text-white text-sm font-bold mb-3">
          📱 Virtual Keyboard
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {letters.map((letter) => (
            <button
              key={letter}
              onClick={() => handleVirtualKeyClick(letter)}
              className={`w-12 h-12 rounded-lg font-bold text-lg transition-all transform hover:scale-110 ${
                inputLetter === letter
                  ? "bg-blue-500 text-white border-2 border-blue-300 shadow-lg scale-110"
                  : "bg-white text-black border-2 border-gray-300 hover:bg-gray-100 hover:border-blue-400"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setInputLetter("")}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded"
          >
            Clear
          </button>
          <button
            onClick={handleLetterSubmit}
            disabled={!inputLetter}
            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Place {inputLetter}
          </button>
          <button
            onClick={() => {
              setSelectedCell(null);
              setInputLetter("");
              setShowVirtualKeyboard(false);
            }}
            className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const myPlayer = players.find((p) => p.wallet === publicKey?.toBase58());
  const opponentPlayer = players.find(
    (p) => p.wallet !== publicKey?.toBase58()
  );
  const isMyTurn = currentPlayer === myPlayer?.id;

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
                {isMobile && (
                  <div className="text-xs text-blue-400 mt-2">
                    📱 Mobile mode: Virtual keyboard enabled
                  </div>
                )}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomId}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Click generate to create room ID..."
                  />
                  <button
                    onClick={generateRoomId}
                    disabled={isGeneratingRoom}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isGeneratingRoom ? "..." : "🎲"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Generated room IDs are unique and secure
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Password (Optional)
                </label>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Leave empty for public room..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Set a password to create a private room
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Fee
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
                </select>
              </div>

              {paymentStatus && (
                <div
                  className={`text-sm font-medium ${
                    paymentStatus === "success"
                      ? "text-green-400"
                      : paymentStatus === "failed"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {paymentStatus === "pending" && "⏳ Processing payment..."}
                  {paymentStatus === "success" && "✅ Payment confirmed!"}
                  {paymentStatus === "failed" && "❌ Payment failed"}
                </div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={isCreating || !roomId.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating
                  ? "Creating..."
                  : `💰 Create Room (${betAmount} GOR)`}
              </button>

              {roomId && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-sm font-medium">
                    🎯 Room ID: <span className="font-mono">{roomId}</span>
                  </p>
                  <p className="text-blue-400 text-xs mt-1">
                    Share this ID with other players to join your room
                  </p>
                </div>
              )}
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

              <div className="text-sm text-gray-400">
                💰 Entry fee will be determined by the room creator
              </div>

              {paymentStatus && (
                <div
                  className={`text-sm font-medium ${
                    paymentStatus === "success"
                      ? "text-green-400"
                      : paymentStatus === "failed"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {paymentStatus === "pending" && "⏳ Processing payment..."}
                  {paymentStatus === "success" && "✅ Payment confirmed!"}
                  {paymentStatus === "failed" && "❌ Payment failed"}
                </div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomId.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? "Joining..." : "💰 Join Room"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            🔤 Word Grid Battle
          </h1>
          <p className="text-gray-300">Room: {roomId}</p>
          {isMobile && (
            <p className="text-xs text-blue-400 mt-1">📱 Mobile Mode</p>
          )}
        </div>

        {/* Game Status Banner */}
        <div className="mb-4">
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {gamePhase === "countdown" && (
                  <div className="px-4 py-2 rounded-full bg-yellow-500 text-black font-bold text-lg animate-pulse">
                    🚀 Game Starting in 10 seconds...
                  </div>
                )}

                {gamePhase === "waiting" && (
                  <div className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-bold">
                    ⏳ WAITING FOR PAYMENTS
                  </div>
                )}

                {gamePhase === "playing" && (
                  <>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        isMyTurn
                          ? "bg-blue-500 text-white"
                          : "bg-gray-500 text-gray-300"
                      }`}
                    >
                      {isMyTurn ? "🎯 YOUR TURN" : "⏳ OPPONENT'S TURN"}
                    </div>

                    <div className="text-white text-sm">
                      ⏱️ Time remaining:
                      <span
                        className={`ml-2 font-mono font-bold ${
                          isMyTurn
                            ? (myPlayer?.timeRemaining || 0) < 30
                              ? "text-red-400"
                              : "text-blue-400"
                            : (opponentPlayer?.timeRemaining || 0) < 30
                            ? "text-red-400"
                            : "text-green-400"
                        }`}
                      >
                        {formatTime(
                          isMyTurn
                            ? myPlayer?.timeRemaining || 0
                            : opponentPlayer?.timeRemaining || 0
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {myPlayer && (
                  <div className="text-center">
                    <div className="text-blue-400 text-xs">YOU</div>
                    <div className="text-white font-bold text-lg">
                      {myPlayer.score}
                    </div>
                    <div className="w-4 h-4 bg-blue-500 rounded mx-auto"></div>
                  </div>
                )}

                <div className="text-gray-400 text-lg font-bold">VS</div>

                {opponentPlayer && (
                  <div className="text-center">
                    <div className="text-green-400 text-xs">OPPONENT</div>
                    <div className="text-white font-bold text-lg">
                      {opponentPlayer.score}
                    </div>
                    <div className="w-4 h-4 bg-green-500 rounded mx-auto"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Word Formation Instructions */}
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-300">
              <div className="grid grid-cols-2 gap-2">
                <div>🎯 Form words to score points</div>
                <div>📏 Word length = Points earned</div>
                <div>🏆 Last letter of word gets full score</div>
                <div>⏰ 2.5 minutes per player</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`grid ${
            isMobile ? "grid-cols-1 gap-4" : "grid-cols-1 lg:grid-cols-4 gap-6"
          }`}
        >
          {/* Player Info - Mobile: Above grid */}
          {!isMobile && (
            <div className="space-y-4">
              {/* My Player Info */}
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
                          myPlayer.timeRemaining < 30
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${(myPlayer.timeRemaining / 150) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Payment:{" "}
                      {myPlayer.paymentConfirmed
                        ? "✅ Confirmed"
                        : "⏳ Pending"}
                    </div>
                  </div>
                )}
              </div>

              {/* Opponent Info */}
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
                          width: `${
                            (opponentPlayer.timeRemaining / 150) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Payment:{" "}
                      {opponentPlayer.paymentConfirmed
                        ? "✅ Confirmed"
                        : "⏳ Pending"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Game Grid */}
          <div className={`${isMobile ? "" : "lg:col-span-2"}`}>
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10">
              {/* Mobile player info */}
              {isMobile && myPlayer && (
                <div className="flex justify-between items-center mb-4 text-sm">
                  <div className="text-white">
                    <div>
                      You:{" "}
                      <span className="text-green-400 font-bold">
                        {myPlayer.score} pts
                      </span>
                    </div>
                    <div>
                      Time:{" "}
                      <span className="text-blue-400 font-mono">
                        {formatTime(myPlayer.timeRemaining)}
                      </span>
                    </div>
                  </div>
                  {opponentPlayer && (
                    <div className="text-white text-right">
                      <div>
                        Opponent:{" "}
                        <span className="text-green-400 font-bold">
                          {opponentPlayer.score} pts
                        </span>
                      </div>
                      <div>
                        Time:{" "}
                        <span className="text-blue-400 font-mono">
                          {formatTime(opponentPlayer.timeRemaining)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-8 gap-1 mb-4 max-w-2xl mx-auto">
                {grid.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    className={getCellClasses(index)}
                    disabled={cell.letter !== ""} // Only disable if cell is occupied
                    title={
                      gamePhase === "waiting"
                        ? "⏳ Waiting for game to start..."
                        : gamePhase !== "playing"
                        ? "🚫 Game not in progress"
                        : !isMyTurn
                        ? "🚫 Not your turn"
                        : cell.letter !== ""
                        ? "🚫 Cell occupied"
                        : "📝 Click to place letter"
                    }
                  >
                    {cell.letter}
                  </button>
                ))}
              </div>

              {/* Letter Input - Desktop & Mobile */}
              {selectedCell !== null && (
                <div className="bg-white/10 rounded-lg p-3 mt-4">
                  <div className="text-center mb-3">
                    <span className="text-white text-sm">
                      📍 Selected Cell: Row {Math.floor(selectedCell / 8) + 1},
                      Column {(selectedCell % 8) + 1}
                    </span>
                  </div>

                  {!isMobile ? (
                    /* Desktop Input */
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="text"
                        value={inputLetter}
                        onChange={(e) =>
                          setInputLetter(e.target.value.toUpperCase())
                        }
                        onKeyPress={handleKeyPress}
                        maxLength={1}
                        className="w-16 h-16 text-center text-2xl font-bold bg-white text-black border-4 border-blue-500 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-400 shadow-lg"
                        placeholder="?"
                        autoFocus
                        style={{ color: "#000000", backgroundColor: "#ffffff" }}
                      />
                      <button
                        onClick={handleLetterSubmit}
                        disabled={
                          !inputLetter || inputLetter.length !== 1 || !isMyTurn
                        }
                        className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-700"
                      >
                        Place {inputLetter}
                      </button>
                    </div>
                  ) : (
                    /* Mobile - Show current letter */
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto bg-white border-4 border-blue-500 rounded-lg flex items-center justify-center text-3xl font-bold text-black shadow-lg mb-3">
                        {inputLetter || "?"}
                      </div>
                      <p className="text-blue-300 text-sm">
                        {inputLetter
                          ? `Selected: ${inputLetter}`
                          : "Use keyboard below to select letter"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Virtual Keyboard */}
              {isMobile && renderVirtualKeyboard()}

              {/* Debug Info */}
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-300">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    🎮 Phase:{" "}
                    <span className="text-yellow-400">{gamePhase}</span>
                  </div>
                  <div>
                    🎯 Selected:{" "}
                    <span className="text-blue-400">
                      {selectedCell !== null ? selectedCell : "None"}
                    </span>
                  </div>
                  <div>
                    👤 My Turn:{" "}
                    <span className="text-green-400">
                      {isMyTurn ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    📱 Mobile:{" "}
                    <span className="text-purple-400">
                      {isMobile ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    ⌨️ Keyboard:{" "}
                    <span className="text-orange-400">
                      {showVirtualKeyboard ? "Shown" : "Hidden"}
                    </span>
                  </div>
                  <div>
                    📝 Letter:{" "}
                    <span className="text-cyan-400 font-bold text-lg">
                      {inputLetter || "None"}
                    </span>
                  </div>
                </div>

                {myPlayer && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div>
                      🆔 My Player ID:{" "}
                      <span className="text-pink-400">{myPlayer.id}</span>
                    </div>
                    <div>
                      🎯 Current Player:{" "}
                      <span className="text-yellow-400">{currentPlayer}</span>
                    </div>
                    <div>
                      💰 Payment:{" "}
                      <span className="text-green-400">
                        {myPlayer.paymentConfirmed
                          ? "✅ Confirmed"
                          : "⏳ Pending"}
                      </span>
                    </div>
                    <div>
                      📊 My Score:{" "}
                      <span className="text-blue-400 font-bold">
                        {myPlayer.score}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-center text-yellow-400 font-bold">
                    {gamePhase === "waiting" && "⏳ Waiting for game to start"}
                    {gamePhase === "playing" &&
                      isMyTurn &&
                      selectedCell !== null &&
                      "🎯 Ready to place letter!"}
                    {gamePhase === "playing" &&
                      isMyTurn &&
                      selectedCell === null &&
                      "👆 Click a cell first"}
                    {gamePhase === "playing" &&
                      !isMyTurn &&
                      "⏳ Wait for opponent's turn"}
                  </div>
                </div>

                <div className="mt-2 text-center space-x-2">
                  <button
                    onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                  >
                    Toggle Keyboard
                  </button>
                  <button
                    onClick={() => {
                      if (gamePhase === "waiting") {
                        console.log("🚀 Requesting game start from server");
                        socket?.emit("startWordGridGame", { roomId });
                      } else {
                        console.log("🧪 Force local game start (testing)");
                        setGamePhase("playing");
                        if (myPlayer) {
                          setCurrentPlayer(myPlayer.id);
                          console.log(
                            `🎯 Setting current player to: ${myPlayer.id}`
                          );
                        }
                      }
                    }}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                  >
                    {gamePhase === "waiting"
                      ? "🚀 Start Game"
                      : "🧪 Force Local"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCell(null);
                      setInputLetter("");
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => {
                      console.log("🔍 Current state:", {
                        gamePhase,
                        isMyTurn,
                        selectedCell,
                        inputLetter,
                        currentPlayer,
                        myPlayerId: myPlayer?.id,
                      });
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                  >
                    Log State
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Words - Desktop sidebar, Mobile bottom */}
          {!isMobile && (
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-3">
                🎯 Recent Words
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentWords.map((highlight, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 rounded-lg text-sm font-bold bg-green-500/20 text-green-300 border border-green-500/30"
                  >
                    <div className="flex justify-between items-center">
                      <span>{highlight.word}</span>
                      <span className="text-xs">
                        +{highlight.points || highlight.word.length} pts
                      </span>
                    </div>
                  </div>
                ))}
                {recentWords.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No words formed yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Recent Words */}
        {isMobile && recentWords.length > 0 && (
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 mt-4 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-3">
              🎯 Recent Words
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentWords.slice(0, 5).map((highlight, index) => (
                <div
                  key={index}
                  className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-300"
                >
                  {highlight.word} (+{highlight.points || highlight.word.length}
                  )
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Controls */}
        <div className="flex justify-center gap-4 mt-4 md:mt-6">
          <button
            onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            {showVirtualKeyboard ? "🙈 Hide" : "📱 Show"} Keyboard
          </button>
          <button
            onClick={() => router.push("/lobby")}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
          >
            🏠 Back to Lobby
          </button>
        </div>

        {/* Recent Words Scored */}
        {recentWords.length > 0 && (
          <div className="mt-4 bg-black/20 rounded-lg p-3">
            <h4 className="text-white text-sm font-bold mb-2">
              🎯 Recent Words
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentWords.slice(0, 5).map((word, index) => {
                const isMyWord = word.playerId === myPlayer?.id;
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                      isMyWord
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    <span className="font-bold">{word.word}</span>
                    <span className="font-mono">+{word.points}pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
