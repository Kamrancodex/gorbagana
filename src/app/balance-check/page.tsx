"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getPlayerBalance,
  getMockBalance,
  isDevMode,
  mockBalances,
} from "../lib/blockchain";

export default function BalanceCheckPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [realBalance, setRealBalance] = useState<number>(0);
  const [mockBalance, setMockBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentMode, setCurrentMode] = useState<"real" | "mock">("real");

  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  useEffect(() => {
    const checkBalances = async () => {
      if (!publicKey) return;

      setLoading(true);
      const walletAddress = publicKey.toBase58();

      // Check real blockchain balance
      try {
        const real = await getPlayerBalance(walletAddress);
        setRealBalance(real);
      } catch (error) {
        console.error("Error fetching real balance:", error);
        setRealBalance(0);
      }

      // Check mock balance
      const mock = getMockBalance(walletAddress);
      setMockBalance(mock);

      // Check current mode
      setCurrentMode(isDevMode() ? "mock" : "real");

      setLoading(false);
    };

    checkBalances();
  }, [publicKey]);

  const refreshBalances = async () => {
    if (!publicKey) return;
    setLoading(true);

    const walletAddress = publicKey.toBase58();
    const real = await getPlayerBalance(walletAddress);
    const mock = getMockBalance(walletAddress);

    setRealBalance(real);
    setMockBalance(mock);
    setLoading(false);
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
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/games")}
              className="text-blue-400 hover:text-blue-300 text-lg"
            >
              ← Back to Games
            </button>
            <h1 className="text-4xl font-bold text-white">
              💰 Balance Checker
            </h1>
          </div>
          <div className="text-white text-right">
            <div className="text-sm text-gray-300">
              {publicKey?.toBase58().slice(0, 8)}...
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Current Mode Status */}
        <div className="mb-8 text-center">
          <div
            className={`inline-block p-4 rounded-xl border-2 ${
              currentMode === "real"
                ? "bg-green-500/20 border-green-500"
                : "bg-yellow-500/20 border-yellow-500"
            }`}
          >
            <div
              className={`text-xl font-bold ${
                currentMode === "real" ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {currentMode === "real"
                ? "🔗 REAL BLOCKCHAIN MODE"
                : "🧪 MOCK DEVELOPMENT MODE"}
            </div>
            <div className="text-white text-sm mt-2">
              {currentMode === "real"
                ? "Using actual Gorbagana testnet balances and transactions"
                : "Using fake balances for testing (no real money involved)"}
            </div>
          </div>
        </div>

        {/* Balance Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Real Balance */}
          <div className="bg-black/70 p-6 rounded-2xl border-2 border-green-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🔗</div>
              <h2 className="text-2xl font-bold text-green-400 mb-4">
                Real Testnet Balance
              </h2>

              {loading ? (
                <div className="text-white">Loading...</div>
              ) : (
                <div className="text-4xl font-bold text-white mb-4">
                  {realBalance.toFixed(4)} gGOR
                </div>
              )}

              <div className="text-sm text-gray-300 mb-4">
                This is your actual gGOR balance on Gorbagana testnet
              </div>

              <div
                className={`p-3 rounded-lg ${
                  currentMode === "real"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {currentMode === "real"
                  ? "✅ CURRENTLY ACTIVE"
                  : "⏸️ Not Active"}
              </div>
            </div>
          </div>

          {/* Mock Balance */}
          <div className="bg-black/70 p-6 rounded-2xl border-2 border-yellow-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🧪</div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                Mock Balance
              </h2>

              <div className="text-4xl font-bold text-white mb-4">
                {mockBalance.toFixed(2)} gGOR
              </div>

              <div className="text-sm text-gray-300 mb-4">
                This is a fake balance for testing purposes only
              </div>

              <div
                className={`p-3 rounded-lg ${
                  currentMode === "mock"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {currentMode === "mock"
                  ? "✅ CURRENTLY ACTIVE"
                  : "⏸️ Not Active"}
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-black/50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-white mb-4">
            🤔 Why aren't my winnings showing?
          </h3>

          {currentMode === "real" ? (
            <div className="space-y-3 text-gray-300">
              <p>
                ✅ <strong className="text-green-400">Good news!</strong> The
                system is now using REAL blockchain balances.
              </p>
              <p>
                🚨 <strong className="text-red-400">Issue:</strong> Prize
                distribution is not yet implemented. When you win, the system
                logs it but doesn't send gGOR back to your wallet yet.
              </p>
              <p>
                🔧 <strong className="text-blue-400">Coming soon:</strong> Real
                smart contract integration that will automatically transfer
                winnings back to your wallet.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-gray-300">
              <p>
                🧪{" "}
                <strong className="text-yellow-400">
                  You're in mock mode!
                </strong>{" "}
                All balances and transactions are fake.
              </p>
              <p>
                💡 <strong className="text-blue-400">What this means:</strong>{" "}
                The 9.00 gGOR you see is not from your real wallet. It's a
                randomly generated test balance.
              </p>
              <p>
                🎮 <strong className="text-green-400">For testing:</strong> You
                can play games and see how the system works, but no real money
                is involved.
              </p>
            </div>
          )}
        </div>

        {/* Mock Balance Details */}
        {Object.keys(mockBalances).length > 0 && (
          <div className="bg-black/50 p-6 rounded-xl mb-6">
            <h3 className="text-xl font-bold text-white mb-4">
              🧪 Mock Balance History
            </h3>
            <div className="space-y-2 text-sm">
              {Object.entries(mockBalances).map(([wallet, balance]) => (
                <div
                  key={wallet}
                  className="flex justify-between text-gray-300"
                >
                  <span>
                    {wallet.slice(0, 8)}...{wallet.slice(-8)}
                  </span>
                  <span className="text-yellow-400">
                    {balance.toFixed(2)} gGOR
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={refreshBalances}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "🔄 Refresh Balances"}
          </button>

          <button
            onClick={() => router.push("/games")}
            className="bg-green-500 hover:bg-green-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🎮 Back to Games
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-500/20 p-6 rounded-xl border border-blue-500">
          <h3 className="text-xl font-bold text-blue-400 mb-4">
            📋 Next Steps
          </h3>
          <div className="space-y-2 text-gray-300">
            <p>
              1. <strong>Real Mode:</strong> Your entry fees will be deducted
              from your real wallet
            </p>
            <p>
              2. <strong>Winnings:</strong> Currently logged but not yet
              transferred (coming soon!)
            </p>
            <p>
              3. <strong>Smart Contracts:</strong> Need to be deployed for
              automatic prize distribution
            </p>
            <p>
              4. <strong>For now:</strong> You can see the game mechanics work
              with real balance deduction
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
