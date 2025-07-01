"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameWebSocket } from "../lib/websocket";
import {
  getBalanceForDisplay,
  payEntryFeeForDisplay,
  PlayerBalance,
} from "../lib/blockchain";
import {
  getMockBalance,
  payMockEntryFee,
  getMockWalletAddress,
  generateMockTxSignature,
} from "../lib/mock-wallet";

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

export default function GamePage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, connected: wsConnected, sendMessage } = useGameWebSocket();

  const betAmount = Number(searchParams.get("bet")) || 1;
  const isMockMode = searchParams.get("mock") === "true";

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

  useEffect(() => {
    if (!connected && !isMockMode) {
      router.push("/");
    }
  }, [connected, isMockMode, router]);

  // Load player balance
  useEffect(() => {
    const loadBalance = async () => {
      if (isMockMode) {
        const balance = getMockBalance();
        setMyBalance(balance);
      } else if (publicKey) {
        const balance = await getBalanceForDisplay(publicKey.toBase58());
        setMyBalance(balance);
      }
    };

    loadBalance();
  }, [publicKey, isMockMode]);

  // Refresh balance every 10 seconds
  useEffect(() => {
    if (isMockMode) {
      const interval = setInterval(() => {
        const balance = getMockBalance();
        setMyBalance(balance);
      }, 5000);
      return () => clearInterval(interval);
    } else if (publicKey) {
      const interval = setInterval(async () => {
        const balance = await getBalanceForDisplay(publicKey.toBase58());
        setMyBalance(balance);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey, isMockMode]);

  useEffect(() => {
    if (!socket || !wsConnected) return;

    const walletAddress = isMockMode
      ? getMockWalletAddress()
      : publicKey?.toBase58();
    if (!walletAddress) return;

    console.log(`🔗 [${isMockMode ? "MOCK" : "REAL"}] Joining tic-tac-toe:`, {
      wallet: walletAddress,
      betAmount: betAmount,
      isMockMode,
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
    });

    return () => {
      socket.off("ticTacToeState");
      socket.off("ticTacToeJoined");
      socket.off("waitingForPlayer");
    };
  }, [socket, wsConnected, publicKey, sendMessage]);

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
    const walletAddress = isMockMode
      ? getMockWalletAddress()
      : publicKey?.toBase58();
    if (!walletAddress) return;

    setPaymentInProgress(true);
    setPaymentError(null);

    try {
      // Create a unique game ID for this transaction
      const gameId = `game_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      let result: { success: boolean; txSignature?: string; error?: string };
      if (isMockMode) {
        // Use mock payment system
        const mockResult = payMockEntryFee(betAmount, gameId);
        result = {
          success: mockResult.success,
          txSignature: mockResult.success
            ? generateMockTxSignature()
            : undefined,
          error: mockResult.error,
        };
      } else {
        // Execute the real blockchain transaction
        result = await payEntryFeeForDisplay(wallet, betAmount, gameId);
      }

      if (result.success) {
        console.log(`💰 Payment successful: ${result.txSignature}`);

        // Update local balance immediately
        if (isMockMode) {
          setMyBalance(getMockBalance());
        } else {
          setMyBalance((prev) => prev - betAmount);
        }

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
      console.error("Payment error:", error);
      setPaymentError("Failed to process payment");
    } finally {
      setPaymentInProgress(false);
    }
  };

  const getGameOverTitle = () => {
    if (gameState.winner === "draw") return "🤝 It's a Draw!";
    if (gameState.winner === myPlayer?.symbol) return "🎉 You Win!";
    return "😔 You Lost!";
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">
          Redirecting to wallet connection...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="p-6 bg-black/50">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white">
            🎮 Multiplayer Tic-Tac-Toe
          </h1>
          <div className="text-white">
            <div className="text-right">
              <div className="text-sm text-gray-300">
                {publicKey?.toBase58().slice(0, 8)}...
              </div>
              <div className="text-lg font-bold text-yellow-400">
                💰 {myBalance.toFixed(2)} gGOR
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
                🔄 Connecting to game server...
              </div>
            </div>
          </div>
        )}

        {connectionStatus === "waiting" && (
          <div className="mb-6 text-center">
            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500">
              <div className="text-blue-400 font-bold">
                ⏳ Waiting for another player to join...
              </div>
              <div className="text-gray-300 text-sm mt-2">
                Share this page with a friend!
              </div>
            </div>
          </div>
        )}

        {connectionStatus === "connected" &&
          gameState.players.length === 2 &&
          gameState.gamePhase === "betting" && (
            <div className="mb-6 text-center">
              <div className="bg-yellow-500/20 p-6 rounded-xl border border-yellow-500">
                <div className="text-yellow-400 font-bold text-xl mb-4">
                  💰 Betting Phase
                </div>
                <div className="text-white mb-4">
                  <p>
                    Bet Amount:{" "}
                    <span className="text-yellow-400 font-bold">
                      {betAmount} gGOR
                    </span>
                  </p>
                  <p>
                    Total Pool:{" "}
                    <span className="text-green-400 font-bold">
                      {gameState.betPool.totalAmount} gGOR
                    </span>
                  </p>
                  <p>
                    Winner Takes:{" "}
                    <span className="text-green-400 font-bold">
                      {gameState.betPool.winnerPayout} gGOR
                    </span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    Platform Fee: {gameState.betPool.platformFee} gGOR (10%)
                  </p>
                </div>

                {myPlayer && !myPlayer.hasPaid ? (
                  <div className="space-y-3">
                    {paymentError && (
                      <div className="bg-red-500/20 p-3 rounded-lg border border-red-500">
                        <div className="text-red-400 text-sm">
                          ❌ {paymentError}
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-300 mb-2">
                      Your Balance:{" "}
                      <span className="text-yellow-400 font-bold">
                        {myBalance.toFixed(2)} gGOR
                      </span>
                      {myBalance < betAmount && (
                        <span className="text-red-400 ml-2">
                          ⚠️ Insufficient funds!
                        </span>
                      )}
                    </div>

                    <button
                      onClick={confirmPayment}
                      disabled={paymentInProgress || myBalance < betAmount}
                      className={`font-bold py-3 px-6 rounded-lg transition-colors ${
                        paymentInProgress || myBalance < betAmount
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-green-500 hover:bg-green-400 text-white"
                      }`}
                    >
                      {paymentInProgress ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Processing Payment...</span>
                        </div>
                      ) : (
                        `✅ Confirm Payment (${betAmount} gGOR)`
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-green-400 font-bold">
                    ✅ Payment Confirmed - Waiting for opponent...
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-300">
                  {gameState.players.filter((p) => p.hasPaid).length}/2 players
                  confirmed
                </div>
              </div>
            </div>
          )}

        {connectionStatus === "connected" &&
          gameState.players.length === 2 &&
          gameState.gamePhase !== "betting" && (
            <div className="mb-6 text-center">
              <div className="bg-green-500/20 p-4 rounded-xl border border-green-500">
                <div className="text-green-400 font-bold">
                  ✅ Both players connected & paid!
                </div>
              </div>
            </div>
          )}

        {gameState.players.length === 2 && (
          <div className="mb-8 grid grid-cols-2 gap-4">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-xl border-2 ${
                  player.isYou
                    ? "bg-green-500/20 border-green-500"
                    : "bg-blue-500/20 border-blue-500"
                }`}
              >
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${
                      player.symbol === "X" ? "text-blue-400" : "text-red-400"
                    }`}
                  >
                    {player.symbol}
                  </div>
                  <div className="text-white font-semibold">
                    {player.isYou ? "YOU" : "OPPONENT"}
                  </div>
                  <div className="text-gray-300 text-sm">
                    {player.wallet.slice(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {gameState.players.length === 2 && (
          <div className="mb-8 bg-black/70 p-6 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              🏆 Score Board
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-500/30 p-4 rounded-xl">
                <div className="text-3xl font-bold text-blue-400">X</div>
                <div className="text-2xl text-white">{gameState.scores.X}</div>
              </div>
              <div className="bg-gray-500/30 p-4 rounded-xl">
                <div className="text-3xl font-bold text-gray-400">DRAW</div>
                <div className="text-2xl text-white">
                  {gameState.scores.draws}
                </div>
              </div>
              <div className="bg-red-500/30 p-4 rounded-xl">
                <div className="text-3xl font-bold text-red-400">O</div>
                <div className="text-2xl text-white">{gameState.scores.O}</div>
              </div>
            </div>
          </div>
        )}

        {gameState.gamePhase === "toss" && gameState.players.length === 2 && (
          <div className="text-center bg-black/70 p-12 rounded-3xl border-2 border-yellow-500 mb-8">
            <h2 className="text-5xl font-bold text-white mb-8">
              🪙 Coin Toss!
            </h2>

            {!gameState.coinToss.choosingPlayer ? (
              <div>
                <p className="text-xl text-gray-300 mb-8">
                  Who will call the coin toss?
                </p>
                <div className="space-x-6">
                  <button
                    onClick={() =>
                      sendMessage("ticTacToeChooseCoin", { player: "me" })
                    }
                    className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
                  >
                    🙋‍♂️ I'll Choose
                  </button>
                  <button
                    onClick={() =>
                      sendMessage("ticTacToeChooseCoin", { player: "other" })
                    }
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
                  >
                    👥 Let Opponent Choose
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {gameState.coinToss.choosingPlayer === myPlayer?.id ? (
                  <div>
                    {!gameState.coinToss.choice ? (
                      <div>
                        <p className="text-xl text-green-400 mb-8 font-bold">
                          🎯 Your turn to call the coin!
                        </p>
                        <div className="space-x-6">
                          <button
                            onClick={() => handleCoinChoice("heads")}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
                          >
                            🪙 HEADS
                          </button>
                          <button
                            onClick={() => handleCoinChoice("tails")}
                            className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
                          >
                            🪙 TAILS
                          </button>
                        </div>
                        <button
                          onClick={letOtherChoose}
                          className="mt-4 bg-purple-500 text-white px-6 py-2 rounded-lg text-sm hover:scale-105 transition-transform"
                        >
                          🔄 Let opponent choose instead
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xl text-gray-300 mb-4">
                          You called:{" "}
                          <span className="text-yellow-400 font-bold">
                            {gameState.coinToss.choice?.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-gray-400">
                          Waiting for opponent to see your choice...
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {!gameState.coinToss.choice ? (
                      <div>
                        <p className="text-xl text-blue-400 mb-8 font-bold">
                          ⏳ Opponent is choosing heads or tails...
                        </p>
                        <div className="animate-pulse text-4xl">🤔</div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xl text-gray-300 mb-4">
                          Opponent called:{" "}
                          <span className="text-yellow-400 font-bold">
                            {gameState.coinToss.choice?.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-gray-400">
                          Get ready for the flip...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {gameState.coinToss.choice && (
                  <div className="mt-8">
                    {gameState.coinToss.isFlipping ? (
                      <div>
                        <div className="text-6xl animate-spin mb-4">🪙</div>
                        <div className="text-lg text-gray-400">
                          Flipping coin...
                        </div>
                      </div>
                    ) : gameState.coinToss.result ? (
                      <div className="space-y-4">
                        <div className="text-6xl mb-4">🪙</div>
                        <div className="text-2xl text-white">
                          Result:{" "}
                          <span className="text-yellow-400 font-bold">
                            {gameState.coinToss.result.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xl">
                          {gameState.coinToss.choice ===
                          gameState.coinToss.result ? (
                            <span className="text-green-400 font-bold">
                              🎉{" "}
                              {gameState.coinToss.choosingPlayer ===
                              myPlayer?.id
                                ? "You"
                                : "Opponent"}{" "}
                              won the toss!
                              {gameState.coinToss.choosingPlayer ===
                              myPlayer?.id
                                ? " You"
                                : " They"}{" "}
                              get X and go first!
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold">
                              😔{" "}
                              {gameState.coinToss.choosingPlayer ===
                              myPlayer?.id
                                ? "You"
                                : "Opponent"}{" "}
                              lost the toss!
                              {gameState.coinToss.choosingPlayer ===
                              myPlayer?.id
                                ? " You"
                                : " They"}{" "}
                              get O and go second.
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {gameState.gamePhase === "playing" && (
          <div className="text-center">
            <div className="bg-black/70 p-6 rounded-2xl mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">
                Current Turn:
                <span
                  className={`ml-2 px-4 py-2 rounded-lg ${
                    gameState.currentPlayer === "X"
                      ? "bg-blue-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {gameState.currentPlayer}
                </span>
              </h3>
              <div className="text-lg">
                {gameState.currentPlayer === myPlayer?.symbol ? (
                  <span className="text-green-400 font-bold">
                    🎯 Your turn!
                  </span>
                ) : (
                  <span className="text-gray-400">
                    ⏳ Waiting for opponent...
                  </span>
                )}
              </div>
            </div>

            <div className="inline-block bg-white p-4 rounded-2xl">
              <div className="grid grid-cols-3 gap-2">
                {gameState.board.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    className={`w-20 h-20 bg-gray-100 border-2 border-gray-300 rounded-lg text-4xl font-bold transition-colors flex items-center justify-center ${
                      !cell &&
                      gameState.currentPlayer === myPlayer?.symbol &&
                      !gameState.winner
                        ? "hover:bg-gray-200 cursor-pointer"
                        : "cursor-not-allowed"
                    }`}
                    disabled={
                      !!cell ||
                      !!gameState.winner ||
                      gameState.currentPlayer !== myPlayer?.symbol
                    }
                  >
                    <span
                      className={
                        cell === "X" ? "text-blue-600" : "text-red-600"
                      }
                    >
                      {cell}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState.gamePhase === "finished" && (
          <div className="text-center bg-black/70 p-12 rounded-3xl border-2 border-green-500">
            <h2 className="text-5xl font-bold text-white mb-6">
              {getGameOverTitle()}
            </h2>

            <div className="inline-block bg-white p-4 rounded-2xl mb-8">
              <div className="grid grid-cols-3 gap-2">
                {gameState.board.map((cell, index) => (
                  <div
                    key={index}
                    className="w-20 h-20 bg-gray-100 border-2 border-gray-300 rounded-lg text-4xl font-bold flex items-center justify-center"
                  >
                    <span
                      className={
                        cell === "X" ? "text-blue-600" : "text-red-600"
                      }
                    >
                      {cell}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-x-4">
              <button
                onClick={resetGame}
                className="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
              >
                🔄 Play Again
              </button>
              <button
                onClick={() => router.push("/lobby")}
                className="bg-purple-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
              >
                🏠 Back to Lobby
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 bg-black/50 p-6 rounded-xl text-center">
          <h3 className="text-xl font-bold text-white mb-4">📋 How to Play</h3>
          <div className="text-gray-300 space-y-2">
            <p>
              👥 <strong>Step 1:</strong> Wait for a second player to join
            </p>
            <p>
              🪙 <strong>Step 2:</strong> Decide who calls the coin toss
            </p>
            <p>
              🎯 <strong>Step 3:</strong> Winner gets X and goes first
            </p>
            <p>
              🎮 <strong>Step 4:</strong> Take turns clicking squares
            </p>
            <p>
              🏆 <strong>Step 5:</strong> Get 3 in a row to win!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
