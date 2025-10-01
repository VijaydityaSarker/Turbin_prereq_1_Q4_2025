import {
    address,
    appendTransactionMessageInstructions,
    assertIsTransactionWithinSizeLimit,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    devnet,
    getSignatureFromTransaction,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    addSignersToTransactionMessage,
    getProgramDerivedAddress,
    generateKeyPairSigner,
    getAddressEncoder,
} from "@solana/kit";
import { getInitializeInstruction, getSubmitTsInstruction } from "./clients/js/src/generated/index";
import mainWalletBytes from "./Turbin3-wallet.json";

// Program constants
const PROGRAM_ADDRESS = address("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM");
const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
const MPL_CORE = address("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
// Collection from brief
const COLLECTION = address("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2");

// Load signer
const keypair = await createKeyPairSignerFromBytes(new Uint8Array(mainWalletBytes));

// RPC
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet("wss://api.devnet.solana.com"));

// === PDAs from IDL ===
const enc = getAddressEncoder();

// account PDA: ["prereqs", user]
const [account] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [Buffer.from("prereqs"), enc.encode(keypair.address)],
});

// authority PDA: ["collection", collection]
const [authority] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [Buffer.from("collection"), enc.encode(COLLECTION)],
});

// -------- initialize --------
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const initializeIx = getInitializeInstruction({
    github: "VijaydityaSarker",
    user: keypair,
    account,
    systemProgram: SYSTEM_PROGRAM,
});

const initMsg = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions([initializeIx], tx)
);
const signedInit = await signTransactionMessageWithSigners(initMsg);
assertIsTransactionWithinSizeLimit(signedInit);

const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
await sendAndConfirm(signedInit, { commitment: "confirmed" });
console.log(`initialize ✅  https://explorer.solana.com/tx/${getSignatureFromTransaction(signedInit)}?cluster=devnet`);

// -------- submitTs --------
const mintKeyPair = await generateKeyPairSigner();

const submitIx = getSubmitTsInstruction({
    user: keypair,
    account,
    mint: mintKeyPair,
    collection: COLLECTION,
    authority,               // PDA derived with ["collection", collection]
    mplCoreProgram: MPL_CORE,
    systemProgram: SYSTEM_PROGRAM,
});

const submitMsg = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions([submitIx], tx),
    (tx) => addSignersToTransactionMessage([mintKeyPair], tx) // mint must sign
);
const signedSubmit = await signTransactionMessageWithSigners(submitMsg);
assertIsTransactionWithinSizeLimit(signedSubmit);

await sendAndConfirm(signedSubmit, { commitment: "confirmed" });
console.log(`submitTs ✅  https://explorer.solana.com/tx/${getSignatureFromTransaction(signedSubmit)}?cluster=devnet`);
