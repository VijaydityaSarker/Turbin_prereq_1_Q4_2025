import {
    Transaction,
    SystemProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    PublicKey,
} from "@solana/web3.js";
import wallet from "./dev-wallet.json";

// Load keypair from array (your dev-wallet.json is just an array of numbers)
const from = Keypair.fromSecretKey(new Uint8Array(wallet));

// Turbin3 devnet address
const TO_ADDRESS = "9tyrZ8stxWctLswB1fy8GXhmhMJ288XWwNxzetBN9VpR";
const to = new PublicKey(TO_ADDRESS);

// Connect to Solana devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

(async () => {
    try {
        // Show starting balance
        const balance = await connection.getBalance(from.publicKey);
        console.log(`Current balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

        // Build transfer instruction for 1 SOL
        const ix = SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports: 1 * LAMPORTS_PER_SOL,
        });

        // Build transaction
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        const tx = new Transaction({
            recentBlockhash: blockhash,
            feePayer: from.publicKey,
        }).add(ix);

        // Sign & send
        const sig = await sendAndConfirmTransaction(connection, tx, [from], {
            commitment: "confirmed",
        });

        console.log(`✅ Sent 1 SOL`);
        console.log(`Explorer link: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (err) {
        console.error("Transfer failed:", err);
    }
})();
