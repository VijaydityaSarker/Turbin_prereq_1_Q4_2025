import bs58 from "bs58";
import promptSync from "prompt-sync";

const prompt = promptSync();
const b58 = prompt("Paste base58 secret key: ");
const bytes = Array.from(bs58.decode(b58));
console.log("Copy this into Turbin3-wallet.json:\n");
console.log(JSON.stringify(bytes));