// Setup Platform Wallet for Real Prize Distribution
// This script helps you set up the platform wallet needed for real GOR transfers

import bs58 from "bs58";
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gorbagana network connection
const connection = new Connection("https://rpc.gorbagana.wtf/", "processed");

async function setupPlatformWallet() {
  console.log("🔧 GORBAGANA PLATFORM WALLET SETUP");
  console.log("==================================");

  // Check if platform wallet already exists
  const envPath = path.join(__dirname, "backend", ".env");
  let existingKey = null;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/PLATFORM_PRIVATE_KEY=(.+)/);
    if (match) {
      existingKey = match[1].trim();
      console.log("📍 Found existing platform wallet configuration");
    }
  }

  if (existingKey) {
    // Test existing wallet
    try {
      const secretKey = bs58.decode(existingKey);
      const wallet = Keypair.fromSecretKey(secretKey);
      const balance = await connection.getBalance(wallet.publicKey);
      const gorBalance = balance / Math.pow(10, 9);

      console.log("🔑 Current Platform Wallet:");
      console.log(`   Public Key: ${wallet.publicKey.toBase58()}`);
      console.log(`   Balance: ${gorBalance.toFixed(6)} GOR`);

      if (gorBalance < 10) {
        console.log("\n⚠️  LOW BALANCE WARNING!");
        console.log("   Your platform wallet has less than 10 GOR");
        console.log("   Please fund it to distribute prizes");
        console.log(`   Send GOR to: ${wallet.publicKey.toBase58()}`);
      } else {
        console.log("\n✅ Platform wallet is ready for prize distribution!");
      }

      return;
    } catch (error) {
      console.error("❌ Error with existing wallet:", error);
      console.log("🔧 Creating new platform wallet...");
    }
  }

  // Generate new platform wallet
  console.log("🔑 Generating new platform wallet...");
  const newWallet = Keypair.generate();
  const base58PrivateKey = bs58.encode(newWallet.secretKey);

  // Create .env file content
  const envContent = `# Gorbagana Platform Wallet Configuration
# DO NOT SHARE THIS PRIVATE KEY!
PLATFORM_PRIVATE_KEY=${base58PrivateKey}

# Optional: Custom Gorbagana RPC endpoint
# SOLANA_RPC_URL=https://rpc.gorbagana.wtf/
`;

  // Write to .env file
  const backendDir = path.join(__dirname, "backend");
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }

  fs.writeFileSync(envPath, envContent);

  console.log("\n✅ NEW PLATFORM WALLET CREATED!");
  console.log("================================");
  console.log(`🔑 Public Key: ${newWallet.publicKey.toBase58()}`);
  console.log(`💾 Private key saved to: backend/.env`);
  console.log("\n🚨 IMPORTANT SECURITY NOTES:");
  console.log("- Keep your .env file secure and never share it");
  console.log("- Add .env to your .gitignore file");
  console.log("- Back up your private key safely");

  console.log("\n💰 FUNDING YOUR WALLET:");
  console.log("========================");
  console.log("Your platform wallet needs GOR tokens to distribute prizes.");
  console.log(`Send GOR to: ${newWallet.publicKey.toBase58()}`);
  console.log("\nFunding options:");
  console.log("1. Use Gorbagana faucet (if available)");
  console.log("2. Transfer from your personal wallet");
  console.log("3. Ask for testnet GOR in Gorbagana Discord");

  console.log("\n🧪 TESTING:");
  console.log("===========");
  console.log("After funding, test with:");
  console.log("  cd backend && node test-rewards.js");

  // Check balance
  const balance = await connection.getBalance(newWallet.publicKey);
  const gorBalance = balance / Math.pow(10, 9);
  console.log(`\n📊 Current Balance: ${gorBalance.toFixed(6)} GOR`);

  if (gorBalance === 0) {
    console.log(
      "⚠️  Wallet is empty - fund it to start distributing real prizes!"
    );
  }
}

// Add to .gitignore if not already there
function updateGitignore() {
  const gitignorePath = path.join(__dirname, ".gitignore");

  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignoreContent.includes("backend/.env")) {
      fs.appendFileSync(
        gitignorePath,
        "\n# Environment variables\nbackend/.env\n"
      );
      console.log("✅ Added backend/.env to .gitignore");
    }
  }
}

// Run setup
setupPlatformWallet()
  .then(() => {
    updateGitignore();
    console.log("\n🎉 Platform wallet setup complete!");
    console.log("Fund your wallet and start distributing real prizes! 🚀");
  })
  .catch(console.error);
