import {
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    devnet,
    airdropFactory,
    lamports,
} from "@solana/kit";
import wallet from "./dev-wallet.json";

const LAMPORTS_PER_SOL = 1_000_000_000n;

const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
console.log(`Your Solana wallet address: ${keypair.address}`);

const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet("wss://api.devnet.solana.com"));
const airdrop = airdropFactory({ rpc, rpcSubscriptions });

try {
    const sig = await airdrop({
        commitment: "confirmed",
        recipientAddress: keypair.address,
        lamports: lamports(2n * LAMPORTS_PER_SOL),
    });
    console.log(`Success! Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
} catch (err) {
    console.error("Airdrop failed:", err);
}
