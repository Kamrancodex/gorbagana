"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface GameState {
  players: Array<{
    id: string;
    position: [number, number, number];
    isYou: boolean;
    tokens: number;
    frozen: boolean;
  }>;
  tokens: Array<{
    id: string;
    position: [number, number, number];
    value: number;
  }>;
  timeRemaining: number;
  gameStatus: "waiting" | "playing" | "finished";
}

interface LobbyState {
  players: Array<{
    id: string;
    wallet: string;
    ready: boolean;
  }>;
  gameStarting: boolean;
  countdown: number;
}

export function useGameWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentUserWallet, setCurrentUserWallet] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Connect to backend WebSocket server
    const socketInstance = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001"
    );

    socketInstance.on("connect", () => {
      console.log("🔌 Connected to game server");
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Disconnected from game server");
      setConnected(false);
    });

    socketInstance.on("gameState", (state: GameState) => {
      setGameState(state);
    });

    socketInstance.on("lobbyState", (state: LobbyState) => {
      setLobbyState(state);
    });

    socketInstance.on(
      "lobbyJoined",
      (data: {
        playerId: string;
        lobbyState: LobbyState;
        yourSocketId: string;
        yourWallet: string;
      }) => {
        console.log("🎯 Joined lobby as:", data.yourWallet);
        setCurrentUserWallet(data.yourWallet);
        setLobbyState(data.lobbyState);
      }
    );

    socketInstance.on("gameStarted", (data: { gameId: string }) => {
      console.log("🎮 Game started!", data);
      // The game page will handle the transition
    });

    socketInstance.on(
      "gameStarting",
      (data: { gameId: string; message: string }) => {
        console.log("🚀 Game starting:", data);
        // Could show a transition message here
      }
    );

    socketInstance.on("redirectToGame", (data: { gameId: string }) => {
      console.log("➡️ Game redirect event received:", data);
      // Let the lobby page handle navigation using Next.js router
      // Don't use window.location.href as it kills the WebSocket connection
    });

    socketInstance.on(
      "powerUpUsed",
      (data: { type: string; user: string; target: string }) => {
        console.log("⚡ Power-up used:", data);
      }
    );

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinLobby = useCallback(
    (walletAddress: string) => {
      if (socket && connected) {
        socket.emit("joinLobby", { wallet: walletAddress });
      }
    },
    [socket, connected]
  );

  const joinGame = useCallback(
    (entryTxSignature: string) => {
      if (socket && connected) {
        socket.emit("joinGame", { txSignature: entryTxSignature });
      }
    },
    [socket, connected]
  );

  const movePlayer = useCallback(
    (direction: string) => {
      if (socket && connected) {
        socket.emit("playerMove", { direction });
      }
    },
    [socket, connected]
  );

  const usePowerUp = useCallback(
    (type: string, target?: string) => {
      if (socket && connected) {
        socket.emit("usePowerUp", { type, target });
      }
    },
    [socket, connected]
  );

  const sendMessage = useCallback(
    (event: string, data: any) => {
      if (socket && connected) {
        socket.emit(event, data);
      }
    },
    [socket, connected]
  );

  return {
    socket,
    connected,
    gameState,
    lobbyState,
    currentUserWallet,
    joinLobby,
    joinGame,
    movePlayer,
    usePowerUp,
    sendMessage,
  };
}

// Simple socket hook for orb collector game
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001"
    );

    socketInstance.on("connect", () => {
      console.log("🔌 Connected to orb collector server");
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Disconnected from orb collector server");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
}
