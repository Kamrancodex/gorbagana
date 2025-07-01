"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameWebSocket } from "../../lib/websocket";
import {
  getMockBalance,
  payMockEntryFee,
  getMockWalletAddress,
  generateMockTxSignature,
} from "../../lib/mock-wallet";

type Player = "X" | "O" | null;
type Board = Player[];
type GamePhase = "waiting" | "betting" | "toss" | "playing" | "finished";

interface GameState {
  players: Array<{
    id: string;
    wallet: string;
    symbol: "X" | "O";
    betAmount: number;
    hasPaid: boolean;
    isYou: boolean;
  }>;
  spectators: number;
  board: Board;
  currentPlayer: "X" | "O";
  gamePhase: GamePhase;
  winner: Player | "draw" | null;
  coinToss: {
    choosingPlayer: string | null;
    choice: "heads" | "tails" | null;
    result: "heads" | "tails" | null;
    isFlipping: boolean;
  };
  scores: { X: number; O: number; draws: number };
  betPool: {
    totalAmount: number;
    platformFee: number;
    winnerPayout: number;
  };
  betAmount: number;
}

export default function DemoTicTacToePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, connected: wsConnected, sendMessage } = useGameWebSocket();

  const betAmount = Number(searchParams.get("bet")) || 1;

  const [gameState, setGameState] = useState<GameState>({
    players: [],
    spectators: 0,
    board: Array(9).fill(null),
    currentPlayer: "X",
    gamePhase: "waiting",
    winner: null,
    coinToss: {
      choosingPlayer: null,
      choice: null,
      result: null,
      isFlipping: false,
    },
    scores: { X: 0, O: 0, draws: 0 },
    betPool: {
      totalAmount: 0,
      platformFee: 0,
      winnerPayout: 0,
    },
    betAmount: betAmount,
  });

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "waiting" | "connected"
  >("connecting");

  const [myBalance, setMyBalance] = useState<number>(0);
  const [paymentInProgress, setPaymentInProgress] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [timeoutCountdown, setTimeoutCountdown] = useState<number | null>(null);

  // Load mock balance
  useEffect(() => {
    const balance = getMockBalance();
    setMyBalance(balance);
  }, []);

  // Refresh mock balance every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const balance = getMockBalance();
      setMyBalance(balance);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh balance immediately when game finishes (prize distribution)
  useEffect(() => {
    if (gameState.gamePhase === "finished") {
      setTimeout(() => {
        const balance = getMockBalance();
        setMyBalance(balance);
        console.log(
          `🎯 [DEMO] Balance refreshed after game finish: ${balance} GOR`
        );
      }, 1000); // Small delay to ensure backend has processed prize distribution
    }
  }, [gameState.gamePhase]);

  useEffect(() => {
    if (!socket || !wsConnected) return;

    const walletAddress = getMockWalletAddress();
    if (!walletAddress) return;

    console.log(`🔗 [DEMO] Joining tic-tac-toe:`, {
      wallet: walletAddress,
      betAmount: betAmount,
      wsConnected,
    });

    sendMessage("joinTicTacToe", {
      wallet: walletAddress,
      betAmount: betAmount,
    });

    socket.on("ticTacToeState", (state: GameState) => {
      setGameState(state);
      setConnectionStatus("connected");
    });

    socket.on("ticTacToeJoined", (data: { gameState: GameState }) => {
      setGameState(data.gameState);
      setConnectionStatus("connected");
    });

    socket.on("waitingForPlayer", () => {
      setConnectionStatus("waiting");
      // Start 5-minute countdown
      const startTime = Date.now();
      const countdownInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 300 - Math.floor(elapsed / 1000)); // 5 minutes = 300 seconds
        setTimeoutCountdown(remaining);

        if (remaining === 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Clear countdown when component unmounts or game starts
      return () => clearInterval(countdownInterval);
    });

    socket.on("ticTacToeTimeout", (data) => {
      alert(`${data.message}\nRefund: ${data.refundAmount} GOR (Demo)`);
      router.push(data.redirectTo || "/demo");
    });

    return () => {
      socket.off("ticTacToeState");
      socket.off("ticTacToeJoined");
      socket.off("waitingForPlayer");
      socket.off("ticTacToeTimeout");
    };
  }, [socket, wsConnected, sendMessage]);

  const myPlayer = gameState.players.find((p) => p.isYou);

  const handleCoinChoice = (choice: "heads" | "tails") => {
    sendMessage("ticTacToeCoinChoice", { choice });
  };

  const letOtherChoose = () => {
    sendMessage("ticTacToeLetOtherChoose", {});
  };

  const handleCellClick = (index: number) => {
    if (
      gameState.board[index] ||
      gameState.winner ||
      gameState.gamePhase !== "playing" ||
      gameState.currentPlayer !== myPlayer?.symbol
    ) {
      return;
    }
    sendMessage("ticTacToeMove", { cellIndex: index });
  };

  const resetGame = () => {
    sendMessage("ticTacToeReset", {});
  };

  const confirmPayment = async () => {
    const walletAddress = getMockWalletAddress();
    if (!walletAddress) return;

    setPaymentInProgress(true);
    setPaymentError(null);

    try {
      // Create a unique game ID for this transaction
      const gameId = `demo_game_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Use mock payment system
      const mockResult = payMockEntryFee(betAmount, gameId);
      const result = {
        success: mockResult.success,
        txSignature: mockResult.success ? generateMockTxSignature() : undefined,
        error: mockResult.error,
      };

      if (result.success) {
        console.log(`💰 [DEMO] Payment successful: ${result.txSignature}`);

        // Update local balance immediately
        setMyBalance(getMockBalance());

        // Notify the server
        sendMessage("confirmPayment", {
          txSignature: result.txSignature,
          gameId: gameId,
          amount: betAmount,
        });
      } else {
        setPaymentError(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Demo payment error:", error);
      setPaymentError("Failed to process demo payment");
    } finally {
      setPaymentInProgress(false);
    }
  };

  const getGameOverTitle = () => {
    if (gameState.winner === "draw") return "🤝 It's a Draw!";
    if (gameState.winner === myPlayer?.symbol) return "🎉 You Win!";
    return "😔 You Lost!";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="p-6 bg-black/50">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/demo")}
              className="text-blue-400 hover:text-blue-300 text-lg"
            >
              ← Back to Demo Games
            </button>
            <h1 className="text-4xl font-bold text-white">
              🎮 Demo Tic-Tac-Toe
            </h1>
            <div className="text-sm text-orange-400 font-bold flex items-center gap-1">
              <span>🎭</span>
              <span>DEMO MODE</span>
            </div>
          </div>
          <div className="text-white">
            <div className="text-right">
              <div className="text-sm text-gray-300">
                {getMockWalletAddress().slice(0, 8)}...
              </div>
              <div className="text-lg font-bold text-yellow-400">
                💰 {myBalance.toFixed(2)} GOR (Demo)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {connectionStatus === "connecting" && (
          <div className="mb-6 text-center">
            <div className="bg-yellow-500/20 p-4 rounded-xl border border-yellow-500">
              <div className="text-yellow-400 font-bold">
                🔄 Connecting to demo server...
              </div>
            </div>
          </div>
        )}

        {connectionStatus === "waiting" && (
          <div className="mb-6 text-center">
            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500">
              <div className="text-blue-400 font-bold">
                ⏳ Waiting for another demo player to join...
              </div>
              {timeoutCountdown !== null && (
                <div className="text-yellow-400 text-lg font-bold mt-2">
                  Auto-refund in: {Math.floor(timeoutCountdown / 60)}:
                  {(timeoutCountdown % 60).toString().padStart(2, "0")}
                </div>
              )}
              <div className="text-gray-300 text-sm mt-2">
                Open another tab to play against yourself!
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-6">
                {gameState.board.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={
                      gameState.gamePhase !== "playing" ||
                      gameState.currentPlayer !== myPlayer?.symbol ||
                      cell !== null
                    }
                    className="w-20 h-20 bg-white/10 border-2 border-white/20 rounded-lg text-3xl font-bold text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {cell === "X" ? (
                      <span className="text-blue-400">✗</span>
                    ) : cell === "O" ? (
                      <span className="text-red-400">◯</span>
                    ) : (
                      ""
                    )}
                  </button>
                ))}
              </div>

              {gameState.gamePhase === "playing" && (
                <div className="text-center">
                  <div className="text-white text-lg mb-2">
                    {gameState.currentPlayer === myPlayer?.symbol
                      ? "🎯 Your turn!"
                      : "⏳ Opponent's turn..."}
                  </div>
                  <div className="text-gray-300 text-sm">
                    You are{" "}
                    <span
                      className={
                        myPlayer?.symbol === "X"
                          ? "text-blue-400"
                          : "text-red-400"
                      }
                    >
                      {myPlayer?.symbol === "X" ? "✗" : "◯"}
                    </span>
                  </div>
                </div>
              )}

              {gameState.gamePhase === "finished" && (
                <div className="text-center space-y-4">
                  <div className="text-2xl font-bold text-white">
                    {getGameOverTitle()}
                  </div>

                  {gameState.winner && gameState.winner !== "draw" && (
                    <div className="text-green-400 text-lg">
                      💰 Prize: {gameState.betPool.winnerPayout.toFixed(2)} GOR
                      (Demo)
                    </div>
                  )}

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={resetGame}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-400 transition-colors"
                    >
                      🔄 Play Again
                    </button>
                    <button
                      onClick={() => router.push("/demo")}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition-colors"
                    >
                      🏠 Demo Games
                    </button>
                  </div>
                </div>
              )}

              {/* Coin Toss Phase */}
              {gameState.gamePhase === "toss" && (
                <div className="text-center space-y-6">
                  <h2 className="text-3xl font-bold text-white">
                    🪙 Coin Toss!
                  </h2>
                  <p className="text-gray-300">
                    Time to decide who goes first! The chooser picks heads or
                    tails.
                  </p>

                  {gameState.coinToss.isFlipping ? (
                    <div className="py-8">
                      <div className="text-6xl animate-spin inline-block">
                        🪙
                      </div>
                      <p className="text-yellow-400 font-bold mt-4">
                        Flipping coin...
                      </p>
                    </div>
                  ) : gameState.coinToss.result ? (
                    <div className="py-8">
                      <div className="text-6xl mb-4">
                        {gameState.coinToss.result === "heads" ? "👑" : "🟡"}
                      </div>
                      <p className="text-2xl font-bold text-white mb-2">
                        {gameState.coinToss.result === "heads"
                          ? "Heads!"
                          : "Tails!"}
                      </p>
                      <p className="text-gray-300">
                        {gameState.coinToss.choice === gameState.coinToss.result
                          ? "🎉 Chooser wins! They go first as X."
                          : "🔄 Other player wins! They go first as X."}
                      </p>
                      <div className="mt-4">
                        <div className="bg-blue-500/20 p-3 rounded-lg">
                          <p className="text-blue-400 font-semibold">
                            ⏳ Starting game in a moment...
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : myPlayer &&
                    gameState.coinToss.choosingPlayer === myPlayer.id ? (
                    <div className="py-8">
                      <p className="text-yellow-400 font-bold text-xl mb-6">
                        🎯 You get to choose! Pick heads or tails:
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => handleCoinChoice("heads")}
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-xl hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105"
                        >
                          👑 Heads
                        </button>
                        <button
                          onClick={() => handleCoinChoice("tails")}
                          className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:from-gray-400 hover:to-gray-500 transition-all transform hover:scale-105"
                        >
                          🟡 Tails
                        </button>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={letOtherChoose}
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Let the other player choose instead
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <p className="text-gray-300 text-xl">
                        ⏳ Waiting for the other player to choose heads or
                        tails...
                      </p>
                      <div className="mt-4">
                        <div className="bg-gray-500/20 p-3 rounded-lg">
                          <p className="text-gray-400">
                            The other player is deciding the coin toss
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Game Info Sidebar */}
          <div className="space-y-6">
            {/* Payment Status */}
            {myPlayer &&
              !myPlayer.hasPaid &&
              gameState.gamePhase === "betting" && (
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">
                    💰 Demo Payment Required
                  </h3>

                  {paymentError && (
                    <div className="bg-red-500/20 p-3 rounded-lg border border-red-500 mb-4">
                      <div className="text-red-400 text-sm">
                        ❌ {paymentError}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-300 mb-4">
                    Your Demo Balance:{" "}
                    <span className="text-yellow-400 font-bold">
                      {myBalance.toFixed(2)} GOR (Demo)
                    </span>
                    {myBalance < betAmount && (
                      <span className="text-red-400 ml-2">
                        ⚠️ Insufficient demo funds!
                      </span>
                    )}
                  </div>

                  <button
                    onClick={confirmPayment}
                    disabled={paymentInProgress || myBalance < betAmount}
                    className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                      paymentInProgress || myBalance < betAmount
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-400 text-white"
                    }`}
                  >
                    {paymentInProgress ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Processing Demo Payment...</span>
                      </div>
                    ) : (
                      `✅ Pay ${betAmount} GOR (Demo)`
                    )}
                  </button>
                </div>
              )}

            {/* Game Stats */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">
                📊 Game Stats
              </h3>
              <div className="space-y-3 text-white">
                <div className="flex justify-between">
                  <span>Players:</span>
                  <span>{gameState.players.length}/2</span>
                </div>
                <div className="flex justify-between">
                  <span>Spectators:</span>
                  <span>{gameState.spectators}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prize Pool:</span>
                  <span>
                    {gameState.betPool.totalAmount.toFixed(2)} GOR (Demo)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Winner Gets:</span>
                  <span>
                    {gameState.betPool.winnerPayout.toFixed(2)} GOR (Demo)
                  </span>
                </div>
              </div>
            </div>

            {/* Score History */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">
                🏆 Score History
              </h3>
              <div className="space-y-2 text-white">
                <div className="flex justify-between">
                  <span className="text-blue-400">✗ Wins:</span>
                  <span>{gameState.scores.X}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">◯ Wins:</span>
                  <span>{gameState.scores.O}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🤝 Draws:</span>
                  <span>{gameState.scores.draws}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
