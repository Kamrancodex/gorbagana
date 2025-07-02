"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useSocket } from "../lib/websocket";
import { payEntryFeeForDisplay } from "../lib/blockchain";
import Footer from "../components/Footer";

interface Pokemon {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  type: string;
  attacks: Array<{
    name: string;
    damage: number;
    description: string;
  }>;
  imageUrl: string;
  rarity: string;
}

interface BattleState {
  player1: {
    id: string;
    wallet: string;
    activePokemon: Pokemon;
    benchPokemon: Pokemon[];
    defeatedPokemon: Pokemon[];
    remainingPokemon: number;
  };
  player2: {
    id: string;
    wallet: string;
    activePokemon: Pokemon;
    benchPokemon: Pokemon[];
    defeatedPokemon: Pokemon[];
    remainingPokemon: number;
  };
  currentTurn: string;
  turnCount: number;
  battleLog?: string[];
}

interface GameState {
  roomId: string;
  gamePhase: "waiting" | "paying" | "countdown" | "playing" | "finished";
  players: any[];
  battleState?: BattleState;
}

export default function PokemonCards() {
  const { publicKey, connected, signTransaction, signAllTransactions } =
    useWallet();
  const socket = useSocket();

  // Room state
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [entryAmount, setEntryAmount] = useState(1);
  const [playerCount, setPlayerCount] = useState(2);

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [joinAttempting, setJoinAttempting] = useState(false);
  const [message, setMessage] = useState("");
  const [battleLog, setBattleLog] = useState<string[]>([]);

  // Battle state
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<number | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const battleLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll battle log
  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleLog]);

  useEffect(() => {
    if (!socket) return;

    socket.on("pokemonGameState", (state: GameState) => {
      console.log("Pokemon game state update:", state);
      setGameState(state);

      if (state.battleState) {
        setBattleState(state.battleState);
        setIsMyTurn(state.battleState.currentTurn === socket.id);
      }
    });

    socket.on("pokemonCountdown", (data) => {
      setMessage(`${data.message}`);
    });

    socket.on("pokemonGameStarted", (data) => {
      console.log("Pokemon game started:", data);
      setGameState(data.gameState);
      setBattleState(data.battleState);
      setIsMyTurn(data.battleState.currentTurn === socket.id);
      setBattleLog(["🎴 Pokemon battle begins!"]);
      setMessage("Battle has started!");
    });

    socket.on("pokemonBattleAction", (data) => {
      console.log("Pokemon battle action:", data);

      if (data.action === "attack") {
        const { result } = data;
        setBattleLog((prev) => [...prev, result.battleLog]);

        if (result.knockedOut) {
          setBattleLog((prev) => [
            ...prev,
            `💀 ${result.newActivePokemon?.name || "Pokemon"} was knocked out!`,
          ]);
          if (result.newActivePokemon) {
            setBattleLog((prev) => [
              ...prev,
              `🔄 ${result.newActivePokemon.name} is now active!`,
            ]);
          }
        }

        if (result.gameEnded) {
          setBattleLog((prev) => [
            ...prev,
            `🏆 ${result.winner.wallet.slice(0, 8)}... wins the battle!`,
          ]);
        }
      } else if (data.action === "switch") {
        setBattleLog((prev) => [
          ...prev,
          `🔄 Player switched to ${data.newActivePokemon.name}`,
        ]);
      }

      setGameState(data.gameState);
      setBattleState(data.battleState);
      setIsMyTurn(data.battleState.currentTurn === socket.id);
    });

    socket.on("pokemonGameFinished", (data) => {
      console.log("Pokemon game finished:", data);
      setBattleLog((prev) => [...prev, data.message]);
      setMessage(
        `Game finished! ${data.winner.nickname} wins ${data.prizeAmount} GOR!`
      );
    });

    socket.on("pokemonError", (data) => {
      setMessage(`Error: ${data.message}`);
    });

    socket.on("paymentError", (error) => {
      setPaymentProcessing(false);
      setMessage(`Payment failed: ${error}`);
    });

    return () => {
      socket.off("pokemonGameState");
      socket.off("pokemonCountdown");
      socket.off("pokemonGameStarted");
      socket.off("pokemonBattleAction");
      socket.off("pokemonGameFinished");
      socket.off("pokemonError");
      socket.off("paymentError");
    };
  }, [socket]);

  const createRoom = async () => {
    if (!socket || !connected) return;

    try {
      setJoinAttempting(true);
      setMessage("Creating room and processing payment...");

      // Generate random room ID
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      // Process payment first
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
        autoConnect: false,
        connecting: false,
        connected,
        disconnecting: false,
        wallet: null,
        wallets: [],
        select: () => {},
        connect: async () => {},
        disconnect: async () => {},
        sendTransaction: async () => "",
        signMessage: undefined,
        signIn: undefined,
      };

      const result = await payEntryFeeForDisplay(
        wallet,
        entryAmount,
        `Pokemon-Create-${newRoomId}`
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Create room with payment confirmation (include txSignature)
      socket.emit("createPokemonRoom", {
        roomId: newRoomId,
        password: password || undefined,
        entryAmount,
        maxPlayers: playerCount,
        playerWallet: publicKey?.toBase58(),
        txSignature: result.txSignature, // ✅ FIXED: Include transaction signature
      });

      setRoomId(newRoomId);
      setIsInRoom(true);
      setMessage(
        `✅ Room ${newRoomId} created and paid! Share this ID with other players.`
      );
    } catch (error) {
      setMessage(`❌ Failed to create room: ${error}`);
    } finally {
      setJoinAttempting(false);
    }
  };

  const joinRoom = async () => {
    if (!socket || !connected || !roomId.trim()) return;

    try {
      setJoinAttempting(true);
      setMessage("Joining room and processing payment...");

      // Process payment first (same as room creator)
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
        autoConnect: false,
        connecting: false,
        connected,
        disconnecting: false,
        wallet: null,
        wallets: [],
        select: () => {},
        connect: async () => {},
        disconnect: async () => {},
        sendTransaction: async () => "",
        signMessage: undefined,
        signIn: undefined,
      };

      const result = await payEntryFeeForDisplay(
        wallet,
        entryAmount,
        `Pokemon-Join-${roomId.trim()}`
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Join room with payment confirmation (include txSignature)
      socket.emit("joinPokemonRoom", {
        roomId: roomId.trim(),
        password: password || undefined,
        playerWallet: publicKey?.toBase58(),
        txSignature: result.txSignature, // ✅ FIXED: Include transaction signature
      });

      setIsInRoom(true);
      setMessage(
        `✅ Joined room ${roomId} and paid! Waiting for game to start...`
      );
    } catch (error) {
      setMessage(`❌ Failed to join room: ${error}`);
    } finally {
      setJoinAttempting(false);
    }
  };

  const confirmPayment = async () => {
    if (!socket || !connected || paymentProcessing) return;

    try {
      setPaymentProcessing(true);
      setMessage("Processing payment...");

      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
        autoConnect: false,
        connecting: false,
        connected,
        disconnecting: false,
        wallet: null,
        wallets: [],
        select: () => {},
        connect: async () => {},
        disconnect: async () => {},
        sendTransaction: async () => "",
        signMessage: undefined,
        signIn: undefined,
      };

      const result = await payEntryFeeForDisplay(
        wallet,
        entryAmount,
        `Pokemon-${roomId}`
      );

      if (result.success) {
        socket.emit("confirmPokemonPayment", {
          txSignature: result.txSignature,
        });
        setMessage("Payment confirmed! Waiting for other players...");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setMessage(`Payment failed: ${error}`);
      setPaymentProcessing(false);
    }
  };

  const attackPokemon = (attackIndex: number) => {
    if (!socket || !isMyTurn) return;

    socket.emit("pokemonAttack", { attackIndex });
    setSelectedAttack(attackIndex);
  };

  const switchPokemon = (benchIndex: number) => {
    if (!socket || !isMyTurn) return;

    socket.emit("pokemonSwitch", { benchIndex });
  };

  const getCurrentPlayer = () => {
    if (!battleState || !socket) return null;
    return battleState.player1.id === socket.id
      ? battleState.player1
      : battleState.player2;
  };

  const getOpponentPlayer = () => {
    if (!battleState || !socket) return null;
    return battleState.player1.id === socket.id
      ? battleState.player2
      : battleState.player1;
  };

  const getHPPercentage = (hp: number, maxHp: number) => {
    return Math.max(0, (hp / maxHp) * 100);
  };

  const getHPColor = (hp: number, maxHp: number) => {
    const percentage = getHPPercentage(hp, maxHp);
    if (percentage > 50) return "bg-green-500";
    if (percentage > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="mb-4">
            Please connect your wallet to play Pokemon Card Battle
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  // Battle Interface
  if (gameState?.gamePhase === "playing" && battleState) {
    const currentPlayer = getCurrentPlayer();
    const opponentPlayer = getOpponentPlayer();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-6">
          {/* Modern Battle Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl">
                ⚔️
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Pokemon Battle Arena
              </h1>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl">
                ⚔️
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 text-lg">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                <span className="text-yellow-400 font-bold">
                  Turn {battleState.turnCount}
                </span>
              </div>

              <div
                className={`px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
                  isMyTurn
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/50 animate-pulse"
                    : "bg-white/10 backdrop-blur-md border border-white/20 text-gray-300"
                }`}
              >
                {isMyTurn ? "🎯 Your Turn!" : "⏳ Opponent's Turn"}
              </div>
            </div>
          </div>

          {/* Modern Battle Arena */}
          <div className="grid grid-cols-1 xl:grid-cols-7 gap-6 max-w-7xl mx-auto">
            {/* Your Pokemon Side */}
            <div className="xl:col-span-3 space-y-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-6 border border-blue-400/30 shadow-2xl">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                    🛡️
                  </div>
                  <h2 className="text-2xl font-bold text-cyan-300 text-center">
                    Your Pokemon
                  </h2>
                </div>

                {/* Active Pokemon Card */}
                {currentPlayer?.activePokemon && (
                  <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-xl mb-6 hover:shadow-2xl transition-all duration-300">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <img
                          src={currentPlayer.activePokemon.imageUrl}
                          alt={currentPlayer.activePokemon.name}
                          className="w-40 h-40 mx-auto object-contain drop-shadow-lg"
                        />
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          ACTIVE
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2">
                        {currentPlayer.activePokemon.name}
                      </h3>

                      <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-4">
                        <span className="text-sm font-semibold text-blue-200">
                          {currentPlayer.activePokemon.type} Type
                        </span>
                      </div>

                      {/* Enhanced HP Display */}
                      <div className="bg-black/30 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold text-red-300">
                            ❤️ HP
                          </span>
                          <span className="text-2xl font-bold text-white">
                            {currentPlayer.activePokemon.hp}/
                            {currentPlayer.activePokemon.maxHp}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                          <div
                            className={`h-4 rounded-full transition-all duration-500 ${getHPColor(
                              currentPlayer.activePokemon.hp,
                              currentPlayer.activePokemon.maxHp
                            )} shadow-lg`}
                            style={{
                              width: `${getHPPercentage(
                                currentPlayer.activePokemon.hp,
                                currentPlayer.activePokemon.maxHp
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Attack Buttons */}
                    {isMyTurn && (
                      <div className="space-y-3">
                        <div className="text-center mb-3">
                          <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                            ⚔️ Choose Your Attack!
                          </span>
                        </div>
                        {currentPlayer.activePokemon.attacks.map(
                          (attack, index) => (
                            <button
                              key={index}
                              onClick={() => attackPokemon(index)}
                              className={`w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 px-6 rounded-xl text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                                selectedAttack === index
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={selectedAttack === index}
                            >
                              <div className="flex justify-between items-center">
                                <span>⚡ {attack.name}</span>
                                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                                  {attack.damage} DMG
                                </span>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {!isMyTurn && (
                      <div className="text-center py-4">
                        <div className="inline-flex items-center gap-2 bg-gray-500/30 px-6 py-3 rounded-full">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-ping"></div>
                          <span className="text-gray-300">
                            Waiting for opponent...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Your Bench Pokemon */}
                <div className="grid grid-cols-2 gap-3">
                  {currentPlayer?.benchPokemon?.map((pokemon, index) => (
                    <button
                      key={index}
                      onClick={() => switchPokemon(index)}
                      className="bg-white/5 hover:bg-white/15 border border-white/20 rounded-xl p-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
                      disabled={!isMyTurn}
                    >
                      <img
                        src={pokemon.imageUrl}
                        alt={pokemon.name}
                        className="w-16 h-16 mx-auto object-contain mb-2"
                      />
                      <div className="text-xs text-center">
                        <div className="font-semibold text-white truncate">
                          {pokemon.name}
                        </div>
                        <div className="text-gray-300">
                          {pokemon.hp}/{pokemon.maxHp} HP
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Battle Log Center */}
            <div className="xl:col-span-1 flex flex-col justify-center">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30 shadow-2xl">
                <h3 className="text-xl font-bold text-center text-purple-300 mb-4">
                  ⚔️ Battle Log
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div className="bg-white/10 rounded-lg p-3 text-sm">
                    <span className="text-green-400 font-semibold">
                      Battle has started!
                    </span>
                  </div>
                  {battleState.battleLog?.slice(-5).map((log, index) => (
                    <div
                      key={index}
                      className="bg-white/5 rounded-lg p-2 text-xs text-gray-300"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Opponent's Pokemon Side */}
            <div className="xl:col-span-3 space-y-6">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-6 border border-red-400/30 shadow-2xl">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                    ⚔️
                  </div>
                  <h2 className="text-2xl font-bold text-red-300 text-center">
                    Opponent's Pokemon
                  </h2>
                </div>

                {/* Opponent's Active Pokemon */}
                {opponentPlayer?.activePokemon && (
                  <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-xl mb-6 hover:shadow-2xl transition-all duration-300">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <img
                          src={opponentPlayer.activePokemon.imageUrl}
                          alt={opponentPlayer.activePokemon.name}
                          className="w-40 h-40 mx-auto object-contain drop-shadow-lg transform scale-x-[-1]"
                        />
                        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-red-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          ACTIVE
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2">
                        {opponentPlayer.activePokemon.name}
                      </h3>

                      <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-4">
                        <span className="text-sm font-semibold text-red-200">
                          {opponentPlayer.activePokemon.type} Type
                        </span>
                      </div>

                      {/* Opponent HP Display */}
                      <div className="bg-black/30 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold text-red-300">
                            ❤️ HP
                          </span>
                          <span className="text-2xl font-bold text-white">
                            {opponentPlayer.activePokemon.hp}/
                            {opponentPlayer.activePokemon.maxHp}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                          <div
                            className={`h-4 rounded-full transition-all duration-500 ${getHPColor(
                              opponentPlayer.activePokemon.hp,
                              opponentPlayer.activePokemon.maxHp
                            )} shadow-lg`}
                            style={{
                              width: `${getHPPercentage(
                                opponentPlayer.activePokemon.hp,
                                opponentPlayer.activePokemon.maxHp
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Opponent's Bench Pokemon */}
                <div className="grid grid-cols-2 gap-3">
                  {opponentPlayer?.benchPokemon?.map((pokemon, index) => (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/20 rounded-xl p-3 opacity-70"
                    >
                      <img
                        src={pokemon.imageUrl}
                        alt={pokemon.name}
                        className="w-16 h-16 mx-auto object-contain mb-2 transform scale-x-[-1]"
                      />
                      <div className="text-xs text-center">
                        <div className="font-semibold text-white truncate">
                          {pokemon.name}
                        </div>
                        <div className="text-gray-300">
                          {pokemon.hp}/{pokemon.maxHp} HP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Room Management Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                🎴 Pokemon Card Battle
              </h1>
              <p className="text-blue-200">
                Real GOR prizes • Blockchain powered
              </p>
            </div>

            {!isInRoom ? (
              <div className="space-y-6">
                {/* Game Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-3">
                      Players (2-6)
                    </label>
                    <select
                      value={playerCount}
                      onChange={(e) => setPlayerCount(Number(e.target.value))}
                      className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value={2} className="text-gray-800">
                        2 Players
                      </option>
                      <option value={3} className="text-gray-800">
                        3 Players
                      </option>
                      <option value={4} className="text-gray-800">
                        4 Players
                      </option>
                      <option value={5} className="text-gray-800">
                        5 Players
                      </option>
                      <option value={6} className="text-gray-800">
                        6 Players
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-3">
                      Entry Amount (GOR)
                    </label>
                    <select
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(Number(e.target.value))}
                      className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value={1} className="text-gray-800">
                        1 GOR
                      </option>
                      <option value={2} className="text-gray-800">
                        2 GOR
                      </option>
                    </select>
                  </div>
                </div>

                {/* Prize Pool Display */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-4">
                  <h3 className="text-yellow-300 font-bold mb-2">
                    💰 Prize Pool
                  </h3>
                  <div className="text-white space-y-1">
                    <div>Total Pool: {entryAmount * playerCount} GOR</div>
                    <div>
                      Winner Prize:{" "}
                      {(entryAmount * playerCount * 0.9).toFixed(1)} GOR (90%)
                    </div>
                    <div>
                      Platform Fee:{" "}
                      {(entryAmount * playerCount * 0.1).toFixed(1)} GOR (10%)
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-3">
                    Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for public room"
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                {/* Create Room */}
                <button
                  onClick={createRoom}
                  disabled={joinAttempting}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg"
                >
                  {joinAttempting
                    ? "🔄 Creating & Paying..."
                    : `💳 Pay ${entryAmount} GOR & Create Room`}
                </button>

                <div className="text-center">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="h-px bg-white/30 flex-1"></div>
                    <span className="text-white/60 text-sm">OR</span>
                    <div className="h-px bg-white/30 flex-1"></div>
                  </div>
                </div>

                {/* Join Room */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-3">
                      Join Existing Room
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="Enter Room ID (e.g. ABC123)"
                      className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-center text-lg font-mono text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={joinRoom}
                    disabled={!roomId.trim() || joinAttempting}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg"
                  >
                    {joinAttempting
                      ? "🔄 Joining & Paying..."
                      : `💳 Pay ${entryAmount} GOR & Join Room`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-xl p-6">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    🎯 Room Created!
                  </h2>
                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <p className="text-blue-200 text-sm mb-2">
                      Share this Room ID:
                    </p>
                    <p className="text-4xl font-mono font-bold text-yellow-300">
                      {roomId}
                    </p>
                  </div>

                  {gameState?.gamePhase === "waiting" && (
                    <div className="space-y-3">
                      <p className="text-white">
                        ⏳ Waiting for players to join...
                      </p>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-blue-200">
                          Players: {gameState.players.length}/{playerCount}
                        </p>
                      </div>
                    </div>
                  )}

                  {gameState?.gamePhase === "paying" && (
                    <div className="space-y-4">
                      <p className="text-white">
                        💰 All players joined! Waiting for payments...
                      </p>
                      <p className="text-yellow-300 text-xl font-bold">
                        Entry Fee: {entryAmount} GOR
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {message && (
              <div className="mt-6 text-center">
                <div className="bg-blue-500/20 border border-blue-400/40 text-blue-200 px-4 py-3 rounded-lg">
                  {message}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with attribution */}
      <Footer />
    </div>
  );
}
