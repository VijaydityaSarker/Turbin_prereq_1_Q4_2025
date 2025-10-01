import {
    Transaction,
    SystemProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    PublicKey,
} from "@solana/web3.js";
import wallet from "./dev-wallet.json"; // array of secret key bytes

// Load keypair from array file
const from = Keypair.fromSecretKey(new Uint8Array(wallet));

// Turbin3 devnet address
const TO_ADDRESS = "9tyrZ8stxWctLswB1fy8GXhmhMJ288XWwNxzetBN9VpR";
const to = new PublicKey(TO_ADDRESS);

// Devnet connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const commitment = "confirmed";

(async () => {
    try {
        // 1) Current balance
        const balance = await connection.getBalance(from.publicKey, commitment);
        console.log(`Starting balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
        if (balance === 0) throw new Error("Balance is zero—nothing to drain.");

        // 2) Build a dummy tx (0 lamports) to estimate the exact network fee
        const dummyTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: 0,
            })
        );
        const { blockhash } = await connection.getLatestBlockhash(commitment);
        dummyTx.recentBlockhash = blockhash;
        dummyTx.feePayer = from.publicKey;

        const fee = (await connection.getFeeForMessage(dummyTx.compileMessage(), commitment)).value ?? 0;
        if (balance <= fee) {
            throw new Error(`Insufficient balance to cover fee. Balance: ${balance}, Fee: ${fee}`);
        }

        const lamportsToSend = balance - fee;
        console.log(`Fee: ${fee} lamports`);
        console.log(`Sending: ${lamportsToSend} lamports (~${(lamportsToSend / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);

        // 3) Real transfer for (balance - fee)
        const tx = new Transaction({
            recentBlockhash: blockhash,
            feePayer: from.publicKey,
        }).add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: lamportsToSend,
            })
        );

        const sig = await sendAndConfirmTransaction(connection, tx, [from], { commitment });
        console.log(`Drained ✅  https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (e) {
        console.error("Drain failed:", e);
    }
})();
