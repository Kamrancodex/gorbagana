# Token Takedown Royale 🎮

A multiplayer battle royale game built for the **Gorbagana Testnet Hackathon**.

## 🚀 Game Overview

**Token Takedown Royale** is a fast-paced 60-second battle royale where players:

- Pay **5 gGOR** entry fee to join
- Collect token orbs worth **1-5 gGOR** each
- Use **Freeze Ray** power-up (costs 1 gGOR) to freeze opponents
- Compete for prize pool distribution: **50%/30%/20%** to top 3 players

## 🛠 Tech Stack

- **Frontend**: Next.js, React, Three.js, TailwindCSS
- **Backend**: Node.js, Express, Socket.io
- **Blockchain**: Solana/Gorbagana, Backpack Wallet
- **Real-time**: WebSockets for multiplayer

## 📦 Quick Setup

### 1. Install Dependencies

```bash
npm run setup
```

### 2. Run Both Frontend & Backend

```bash
npm run dev:all
```

### 3. Open Game

- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health

## 🎯 Game Flow

1. **Connect Wallet** → Backpack wallet required
2. **Join Lobby** → Wait for 2-12 players
3. **Pay Entry Fee** → 5 gGOR transaction
4. **Battle Arena** → 60 seconds of mayhem
5. **View Results** → Leaderboard and prizes

## 🎮 Controls

- **WASD** or **Arrow Keys**: Move player
- **Space**: Use Freeze Ray power-up
- **Mouse**: Look around arena

## 🏗 Project Structure

```
gorbagana-game/
├── src/                    # Next.js frontend
│   ├── app/
│   │   ├── components/     # React components
│   │   ├── lib/           # WebSocket client
│   │   ├── lobby/         # Lobby page
│   │   ├── game/          # Game page
│   │   └── results/       # Results page
│   └── ...
├── backend/               # Node.js server
│   ├── server.js         # Main WebSocket server
│   └── package.json      # Backend dependencies
└── ...
```

## 🔌 Backend API

### WebSocket Events

**Client → Server:**

- `joinLobby` - Join game lobby
- `joinGame` - Pay entry fee and ready up
- `playerMove` - Move player in arena
- `usePowerUp` - Activate freeze ray

**Server → Client:**

- `lobbyState` - Lobby player list and status
- `gameState` - Real-time game state
- `gameStarted` - Game launch notification
- `powerUpUsed` - Power-up activation

### HTTP Endpoints

- `GET /health` - Server status and stats

## 🌐 Environment Variables

Create `.env.local` in root:

```env
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## 🧪 Development Scripts

```bash
# Frontend only
npm run dev

# Backend only
npm run server

# Both together
npm run dev:all

# Setup all dependencies
npm run setup
```

## 🎨 Features

### ✅ Implemented

- 🔗 Backpack wallet integration
- 🏟️ 3D arena with Three.js
- 🎮 Real-time multiplayer
- 💰 Token collection system
- ❄️ Freeze ray power-up
- 🏆 Prize distribution
- 📱 Mobile responsive

### 🚧 Next Steps

- 🔗 Smart contract integration
- 🌍 Gorbagana testnet deployment
- 🔐 Transaction verification
- 📊 Persistent leaderboards

## 🏆 Hackathon Features

This project showcases:

- **Creative token usage** - Entry fees, collectibles, power-up costs
- **Real-time gameplay** - WebSocket multiplayer
- **Solana integration** - Wallet connectivity and transactions
- **Modern UI/UX** - Polished game interface
- **Scalable architecture** - Modular frontend/backend

## 📞 Support

Built for the Gorbagana Testnet Hackathon. For issues or questions, check the server logs and WebSocket connections.

---

**Ready to battle? Connect your Backpack wallet and enter the arena!** 🚀
