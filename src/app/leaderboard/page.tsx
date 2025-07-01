"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  wins: number;
  losses: number;
  played: number;
  earnings: number;
  winRate: number;
}

interface RecentMatch {
  _id: string;
  players: Array<{
    walletAddress: string;
    symbol: string;
    betAmount: number;
    isWinner: boolean;
  }>;
  gameData: {
    winner: string;
  };
  betPool: {
    totalAmount: number;
    winnerPayout: number;
  };
  finishedAt: string;
}

export default function LeaderboardPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"leaderboard" | "matches">(
    "leaderboard"
  );
  const [gameType, setGameType] = useState("ticTacToe");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  useEffect(() => {
    fetchData();
  }, [gameType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch leaderboard
      const leaderboardResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
        }/leaderboard/${gameType}`
      );
      const leaderboardData = await leaderboardResponse.json();
      setLeaderboard(leaderboardData.leaderboard || []);

      // Fetch recent matches
      const matchesResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
        }/matches/${gameType}`
      );
      const matchesData = await matchesResponse.json();
      setRecentMatches(matchesData.matches || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks}w ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const isMyMatch = (match: RecentMatch) => {
    return match.players.some((p) => p.walletAddress === publicKey?.toBase58());
  };

  const getMatchResult = (match: RecentMatch) => {
    if (!publicKey) return null;
    const myPlayer = match.players.find(
      (p) => p.walletAddress === publicKey.toBase58()
    );
    if (!myPlayer) return null;

    if (match.gameData.winner === "draw") return "DRAW";
    return myPlayer.isWinner ? "WIN" : "LOSS";
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
      {/* Header */}
      <div className="p-6 bg-black/50">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/games")}
              className="text-blue-400 hover:text-blue-300 text-lg"
            >
              ← Back to Games
            </button>
            <h1 className="text-4xl font-bold text-white">🏆 Leaderboard</h1>
          </div>
          <div className="text-white">
            <span className="text-sm text-gray-300">Wallet:</span>{" "}
            {publicKey?.toBase58().slice(0, 8)}...
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="bg-black/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                activeTab === "leaderboard"
                  ? "bg-blue-500 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              🏆 Rankings
            </button>
            <button
              onClick={() => setActiveTab("matches")}
              className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                activeTab === "matches"
                  ? "bg-blue-500 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              📜 Match History
            </button>
          </div>
        </div>

        {/* Game Type Selector */}
        <div className="mb-6 text-center">
          <div className="inline-block bg-black/70 p-1 rounded-xl">
            <button
              onClick={() => setGameType("ticTacToe")}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                gameType === "ticTacToe"
                  ? "bg-green-500 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              ⭕ Tic-Tac-Toe
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-white text-xl">Loading...</div>
          </div>
        ) : (
          <>
            {/* Leaderboard Tab */}
            {activeTab === "leaderboard" && (
              <div className="bg-black/70 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-600">
                  <h2 className="text-2xl font-bold text-white">Top Players</h2>
                  <p className="text-gray-300">Ranked by wins and earnings</p>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-gray-400 text-lg">
                      No players yet. Be the first to play!
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="p-4 text-left text-gray-300 font-bold">
                            #
                          </th>
                          <th className="p-4 text-left text-gray-300 font-bold">
                            Player
                          </th>
                          <th className="p-4 text-center text-gray-300 font-bold">
                            Games
                          </th>
                          <th className="p-4 text-center text-gray-300 font-bold">
                            Wins
                          </th>
                          <th className="p-4 text-center text-gray-300 font-bold">
                            Win Rate
                          </th>
                          <th className="p-4 text-center text-gray-300 font-bold">
                            Earnings
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry) => (
                          <tr
                            key={entry.walletAddress}
                            className={`border-b border-gray-700 hover:bg-gray-800/30 ${
                              entry.walletAddress === publicKey?.toBase58()
                                ? "bg-blue-500/20"
                                : ""
                            }`}
                          >
                            <td className="p-4">
                              <div className="flex items-center">
                                {entry.rank <= 3 && (
                                  <span className="mr-2 text-xl">
                                    {entry.rank === 1
                                      ? "🥇"
                                      : entry.rank === 2
                                      ? "🥈"
                                      : "🥉"}
                                  </span>
                                )}
                                <span className="text-white font-bold">
                                  #{entry.rank}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                                <span className="text-white font-mono">
                                  {formatWallet(entry.walletAddress)}
                                  {entry.walletAddress ===
                                    publicKey?.toBase58() && (
                                    <span className="ml-2 text-green-400 text-sm">
                                      (You)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-center text-white">
                              {entry.played}
                            </td>
                            <td className="p-4 text-center text-green-400 font-bold">
                              {entry.wins}
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`font-bold ${
                                  entry.winRate >= 70
                                    ? "text-green-400"
                                    : entry.winRate >= 50
                                    ? "text-yellow-400"
                                    : "text-red-400"
                                }`}
                              >
                                {entry.winRate}%
                              </span>
                            </td>
                            <td className="p-4 text-center text-yellow-400 font-bold">
                              {entry.earnings.toFixed(2)} gGOR
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Match History Tab */}
            {activeTab === "matches" && (
              <div className="bg-black/70 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-600">
                  <h2 className="text-2xl font-bold text-white">
                    Recent Matches
                  </h2>
                  <p className="text-gray-300">Latest completed games</p>
                </div>

                {recentMatches.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-gray-400 text-lg">
                      No completed matches yet.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-6">
                    {recentMatches.map((match) => (
                      <div
                        key={match._id}
                        className={`p-4 rounded-xl border transition-colors ${
                          isMyMatch(match)
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-600 bg-gray-800/30"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">⭕</div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-mono text-sm">
                                  {formatWallet(match.players[0].walletAddress)}
                                </span>
                                <span className="text-gray-400">vs</span>
                                <span className="text-white font-mono text-sm">
                                  {formatWallet(match.players[1].walletAddress)}
                                </span>
                              </div>
                              <div className="text-gray-400 text-sm">
                                Pool: {match.betPool.totalAmount} gGOR • Winner:{" "}
                                {match.betPool.winnerPayout} gGOR
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {isMyMatch(match) && (
                              <div
                                className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  getMatchResult(match) === "WIN"
                                    ? "bg-green-500/20 text-green-400"
                                    : getMatchResult(match) === "LOSS"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {getMatchResult(match)}
                              </div>
                            )}

                            <div className="text-right">
                              <div className="text-white font-bold">
                                {match.gameData.winner === "draw"
                                  ? "Draw"
                                  : `${formatWallet(
                                      match.players.find((p) => p.isWinner)
                                        ?.walletAddress || ""
                                    )} Won`}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {formatDate(match.finishedAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/50 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-400">
              {leaderboard.length}
            </div>
            <div className="text-gray-300">Total Players</div>
          </div>
          <div className="bg-black/50 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">
              {recentMatches.length}
            </div>
            <div className="text-gray-300">Completed Games</div>
          </div>
          <div className="bg-black/50 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-400">
              {recentMatches
                .reduce((sum, match) => sum + match.betPool.totalAmount, 0)
                .toFixed(1)}
            </div>
            <div className="text-gray-300">Total Volume (gGOR)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
