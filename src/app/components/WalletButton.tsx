"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const {
    wallets,
    select,
    connect,
    wallet,
    connected,
    connecting,
    disconnect,
  } = useWallet();

  // Enhanced mobile detection
  const isMobile =
    typeof window !== "undefined" &&
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
      (window.screen.width <= 768 && "ontouchstart" in window));

  // Ensure component only renders on client side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle mobile wallet connection state and deep linking
  useEffect(() => {
    if (isMobile && isConnecting && wallet && !connected) {
      // Set up mobile connection timeout
      const timeout = setTimeout(() => {
        setIsConnecting(false);
        setConnectionAttempts((prev) => prev + 1);

        if (connectionAttempts < 2) {
          alert(
            `Connection attempt ${
              connectionAttempts + 1
            } failed. \n\nTips:\n1. Make sure ${
              wallet.adapter.name
            } app is installed\n2. Try opening the wallet app first\n3. Return to this page and try again`
          );
        } else {
          alert(
            `Multiple connection attempts failed. \n\nPlease:\n1. Restart your ${wallet.adapter.name} app\n2. Check your internet connection\n3. Try again or use a different wallet`
          );
          setConnectionAttempts(0);
        }
      }, 15000); // 15 second timeout for mobile

      // Handle page visibility change (user returning from wallet app)
      const handleVisibilityChange = () => {
        if (!document.hidden && isConnecting) {
          // User returned to the page, check connection status
          setTimeout(() => {
            if (!connected && isConnecting) {
              setIsConnecting(false);
              alert(
                "Connection not completed. Please try again and make sure to approve the connection in your wallet app."
              );
            }
          }, 2000);
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [wallet, connected, isConnecting, isMobile, connectionAttempts]);

  // Reset connecting state when connection succeeds
  useEffect(() => {
    if (connected) {
      setIsConnecting(false);
      setConnectionAttempts(0);
    }
  }, [connected]);

  // Handle wallet selection change
  useEffect(() => {
    if (connecting) {
      setIsConnecting(true);
    }
  }, [connecting]);

  const handleWalletError = () => {
    setShowWalletPrompt(true);
  };

  const closeWalletPrompt = () => {
    setShowWalletPrompt(false);
  };

  // Mobile-specific wallet connection with improved logic
  const handleMobileWalletSelect = async (walletName: string) => {
    if (!isMobile) return;

    const selectedWallet = wallets.find((w) => w.adapter.name === walletName);
    if (!selectedWallet) return;

    setIsConnecting(true);

    try {
      console.log(`🔗 Attempting to connect to ${walletName} on mobile...`);

      // Select the wallet first so context updates
      select(selectedWallet.adapter.name);

      // Initiate connection directly on the selected adapter (prevents wrong wallet)
      await selectedWallet.adapter.connect();

      // Show mobile-specific guidance immediately
      setTimeout(() => {
        if (isConnecting && !connected) {
          alert(
            `🔗 Connecting to ${walletName}...\n\n📱 Mobile Instructions:\n1. Your ${walletName} app should open automatically\n2. Approve the connection request\n3. You'll be redirected back here\n\nIf ${walletName} doesn't open:\n1. Open the ${walletName} app manually\n2. Look for connection requests\n3. Return to this page when done`
          );
        }
      }, 2000);
    } catch (error: any) {
      setIsConnecting(false);
      console.error("Mobile wallet selection error:", error);

      if (
        error.message?.includes("User rejected") ||
        error.message?.includes("cancelled")
      ) {
        console.log("User cancelled wallet connection");
        return; // User cancelled, don't show error
      }

      // Show helpful error message
      const isPhantom = walletName === "Phantom";
      const isBackpack = walletName === "Backpack";

      let appStoreLink = "";
      if (isPhantom) {
        appStoreLink = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? "https://apps.apple.com/app/phantom-solana-wallet/id1598432977"
          : "https://play.google.com/store/apps/details?id=app.phantom";
      } else if (isBackpack) {
        appStoreLink = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? "https://apps.apple.com/app/backpack-crypto-wallet/id1635682577"
          : "https://play.google.com/store/apps/details?id=app.backpack.mobile";
      }

      alert(
        `❌ Failed to connect to ${walletName}\n\n🔧 Try this:\n1. Install ${walletName} from your app store\n2. Open ${walletName} and create/import a wallet\n3. Return here and try again\n\n${
          appStoreLink ? `📱 Install: ${appStoreLink}` : ""
        }\n\nError: ${error.message}`
      );
    }
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <button
        className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl px-6 py-3 font-bold text-white cursor-not-allowed opacity-50"
        disabled
      >
        Loading Wallet...
      </button>
    );
  }

  return (
    <>
      <div className="wallet-adapter-dropdown">
        {isMobile && !connected ? (
          // Custom mobile wallet selector
          <div className="space-y-2">
            <div className="text-center text-sm text-gray-400 mb-2">
              Select your wallet app:
            </div>
            <div className="flex flex-col gap-2">
              {wallets
                .filter((wa) =>
                  ["Backpack", "Phantom"].includes(wa.adapter.name)
                )
                .map((walletAdapter) => (
                  <button
                    key={walletAdapter.adapter.name}
                    onClick={() =>
                      handleMobileWalletSelect(walletAdapter.adapter.name)
                    }
                    disabled={isConnecting}
                    className={`
                      flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200
                      ${
                        isConnecting
                          ? "bg-gray-600 cursor-wait opacity-75"
                          : "bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-105 cursor-pointer"
                      }
                      text-white
                    `}
                  >
                    <img
                      src={walletAdapter.adapter.icon}
                      alt={walletAdapter.adapter.name}
                      className="w-6 h-6"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    {isConnecting &&
                    wallet?.adapter.name === walletAdapter.adapter.name ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Connecting...
                      </>
                    ) : (
                      <>Connect {walletAdapter.adapter.name}</>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          // Standard wallet button for desktop or when connected
          <WalletMultiButton
            className={`!bg-gradient-to-r !from-purple-600 !to-blue-500 !rounded-xl !px-6 !py-3 !font-bold !text-white hover:!scale-105 !transition-transform !duration-200 ${
              isConnecting ? "!opacity-75 !cursor-wait" : ""
            }`}
          />
        )}

        {/* Wallet Info */}
        {mounted && (
          <div className="mt-2 text-center text-sm text-gray-400">
            {connected ? (
              <span className="text-green-400">✅ Wallet Connected</span>
            ) : isConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                <span className="text-blue-400">
                  {isMobile ? "Check your wallet app..." : "Connecting..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>
                  {wallets.length} wallet{wallets.length !== 1 ? "s" : ""}{" "}
                  available
                  {isMobile && " (Mobile)"}
                </span>
                <button
                  onClick={() => setShowWalletPrompt(true)}
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  title="Need help installing a wallet?"
                >
                  Need help?
                </button>
              </div>
            )}
          </div>
        )}

        <style jsx global>{`
          .wallet-adapter-button:not([disabled]):hover {
            transform: scale(1.03);
            transition: transform 0.2s ease;
          }

          .wallet-adapter-button-trigger {
            background: linear-gradient(to right, #9333ea, #3b82f6) !important;
            border-radius: 0.75rem !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: bold !important;
            color: white !important;
          }

          .wallet-adapter-dropdown {
            position: relative;
            display: inline-block;
          }

          .wallet-adapter-dropdown-list {
            background: rgba(0, 0, 0, 0.9) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 0.75rem !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          }

          .wallet-adapter-dropdown-list-item {
            color: white !important;
            padding: 0.75rem 1rem !important;
            border-radius: 0.5rem !important;
            margin: 0.25rem !important;
          }

          .wallet-adapter-dropdown-list-item:hover {
            background: rgba(255, 255, 255, 0.1) !important;
          }

          /* Mobile-specific wallet modal styles */
          @media (max-width: 768px) {
            .wallet-adapter-modal {
              margin: 1rem !important;
              max-width: calc(100vw - 2rem) !important;
            }

            .wallet-adapter-dropdown-list {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: calc(100vw - 2rem) !important;
              max-width: 400px !important;
              z-index: 9999 !important;
            }

            .wallet-adapter-dropdown-list-item {
              padding: 1rem !important;
              font-size: 1rem !important;
            }

            .wallet-adapter-button-trigger {
              padding: 1rem 2rem !important;
              font-size: 1rem !important;
              min-height: 48px !important; /* Better touch target */
            }
          }
        `}</style>
      </div>

      {/* Wallet Installation Prompt */}
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {isMobile ? "📱" : "🦊"} Need a Wallet?
            </h3>
            <p className="text-gray-300 mb-6">
              To play Gorbagana games, you need a Solana wallet.{" "}
              {isMobile ? "Install from your app store:" : "We recommend:"}
            </p>

            <div className="space-y-3 mb-6">
              <a
                href={
                  isMobile
                    ? /iPhone|iPad|iPod/i.test(navigator.userAgent)
                      ? "https://apps.apple.com/app/phantom-solana-wallet/id1598432977"
                      : "https://play.google.com/store/apps/details?id=app.phantom"
                    : "https://phantom.app/"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">👻</span>
                  <div>
                    <div className="font-semibold text-white">Phantom</div>
                    <div className="text-sm text-blue-200">
                      {isMobile ? "Install from app store" : "Popular choice"}
                    </div>
                  </div>
                </div>
              </a>

              <a
                href={
                  isMobile
                    ? /iPhone|iPad|iPod/i.test(navigator.userAgent)
                      ? "https://apps.apple.com/app/backpack-crypto-wallet/id1635682577"
                      : "https://play.google.com/store/apps/details?id=app.backpack.mobile"
                    : "https://backpack.app/"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">🎒</span>
                  <div>
                    <div className="font-semibold text-white">Backpack</div>
                    <div className="text-sm text-purple-200">
                      {isMobile ? "Great mobile wallet" : "Best for Gorbagana"}
                    </div>
                  </div>
                </div>
              </a>

              {!isMobile && (
                <a
                  href="https://solflare.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">🔥</span>
                    <div>
                      <div className="font-semibold text-white">Solflare</div>
                      <div className="text-sm text-green-200">
                        Feature-rich desktop wallet
                      </div>
                    </div>
                  </div>
                </a>
              )}
            </div>

            {isMobile && (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 mb-4">
                <p className="text-yellow-200 text-sm">
                  📱 <strong>Mobile Instructions:</strong>
                  <br />
                  1. Install wallet app from your app store
                  <br />
                  2. Create a new wallet or import existing
                  <br />
                  3. Return to this page and click "Connect Wallet"
                  <br />
                  4. Select your wallet and approve connection
                  <br />
                  5. You may need to switch between apps during connection
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeWalletPrompt}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
