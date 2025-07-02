import React from "react";

export default function Footer() {
  return (
    <footer className="relative mt-16 py-8 border-t border-gray-800 bg-black/50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -top-4 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Main attribution */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-sm">Made with</span>
            <div className="text-red-500 text-xl animate-pulse">❤️</div>
            <span className="text-sm">by</span>
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-yellow-400 bg-clip-text text-transparent">
            Kamran Bashir
          </div>
        </div>

        {/* Twitter/X Link */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <a
            href="https://x.com/kamran11011"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-900 to-black border border-gray-700 rounded-lg hover:border-cyan-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 group"
          >
            {/* Twitter/X Icon */}
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-white group-hover:fill-cyan-400 transition-colors duration-300"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-sm text-gray-300 group-hover:text-cyan-400 transition-colors duration-300">
              @kamran11011
            </span>
          </a>
        </div>

        {/* Additional gaming-themed elements */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center justify-center gap-4">
            <span>🎮 Built for Gamers</span>
            <span className="text-gray-700">|</span>
            <span>🚀 Powered by Blockchain</span>
            <span className="text-gray-700">|</span>
            <span>⚡ Made with Passion</span>
          </div>
          <div className="text-gray-600 mt-2">
            © 2024 Gorbagana Token Takedown. All rights reserved.
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30"></div>
    </footer>
  );
}
