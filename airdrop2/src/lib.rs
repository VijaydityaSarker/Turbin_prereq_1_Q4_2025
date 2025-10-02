

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use solana_client::rpc_client::RpcClient;
    use solana_system_interface::instruction::transfer;
    use solana_system_interface::program as system_program;
    use solana_sdk::{
        pubkey::Pubkey,
        instruction::{AccountMeta, Instruction},
        message::Message,  
        signature::{read_keypair_file, Signer},
        signer::keypair::Keypair,
        transaction::Transaction,
    };
    use std::io::{self, BufRead}; // for base58_to_wallet
    use std::str::FromStr;

    const RPC_URL: &str = "https://api.devnet.solana.com";


    #[test]
    fn keygen() {
        let kp = Keypair::new();
        println!("New wallet: {}", kp.pubkey());
        println!("To save your wallet, paste the following JSON (64 bytes) into dev-wallet.json:");
        println!("{:?}", kp.to_bytes());
    }
    
    
    #[test]
    fn claim_airdrop() {
        let keypair = read_keypair_file("dev-wallet.json").expect("dev-wallet.json missing or invalid");
        let client = RpcClient::new(RPC_URL);
    
        // 2 SOL in lamports
        let amount = 2_000_000_000u64;
        match client.request_airdrop(&keypair.pubkey(), amount) {
            Ok(sig) => {
                println!("Airdrop tx: https://explorer.solana.com/tx/{}?cluster=devnet", sig);
                // (Optional) wait for confirmation by pinging balance
                let bal = client.get_balance(&keypair.pubkey()).unwrap_or_default();
                println!("Current balance (lamports): {}", bal);
            }
            Err(e) => eprintln!("Airdrop failed: {e}"),
        }
    }

    #[test]
    fn base58_to_wallet() {
        println!("Input your private key as base58:");

        let stdin = io::stdin();
        let base58 = stdin
            .lock()
            .lines()
            .next()
            .expect("Failed to read input")
            .expect("Invalid input");

        match bs58::decode(base58).into_vec() {
            Ok(wallet) => println!("Your wallet file (byte array):\n{:?}", wallet),
            Err(_) => println!("❌ Error: Invalid Base58 private key!"),
        }
    }

    
    #[test]
    fn wallet_to_base58() {
        use std::io::{self, Read};
    
        println!("Input your private key as a wallet file byte array:");
    
        // Read ALL of stdin (not just one line)
        let mut input = String::new();
        io::stdin().read_to_string(&mut input).expect("read stdin");
    
        // Accept JSON with spaces/newlines
        let wallet: Result<Vec<u8>, _> = input
            .trim_start_matches('[')
            .trim_end_matches(']')
            .split(',')
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.trim().parse::<u8>())
            .collect();
    
        match wallet {
            Ok(wallet_bytes) => {
                let base58 = bs58::encode(wallet_bytes).into_string();
                println!("Your private key in Base58 format:\n{}", base58);
            }
            Err(_) => println!("❌ Error: Invalid wallet byte array format!"),
        }
    }
    

    #[test]
    fn transfer_sol() {
        // 1) Load keypair
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let pubkey = keypair.pubkey();

        // 2) Correct signature verification: verify the ORIGINAL MESSAGE
        let message_bytes = b"I verify my Solana Keypair!";
        let sig = keypair.sign_message(message_bytes);
        assert!(sig.verify(pubkey.as_ref(), message_bytes), "Signature verification failed");
        println!("✅ Signature verified for {}", pubkey);

        // 3) Recipient
        let to_pubkey = Pubkey::from_str("9tyrZ8stxWctLswB1fy8GXhmhMJ288XWwNxzetBN9VpR").unwrap();

        // 4) Send 0.1 SOL
        let rpc = RpcClient::new(RPC_URL);
        let recent = rpc.get_latest_blockhash().expect("blockhash");
        let ix = transfer(&pubkey, &to_pubkey, 100_000_000); // 0.1 SOL
        let tx = Transaction::new_signed_with_payer(&[ix], Some(&pubkey), &[&keypair], recent);

        let sig = rpc.send_and_confirm_transaction(&tx).expect("send");
        println!("✅ Success! https://explorer.solana.com/tx/{}/?cluster=devnet", sig);
    }


    #[test]
fn empty_wallet() {
    // Load wallet
    let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");

    // RPC
    const RPC_URL: &str = "https://api.devnet.solana.com";
    let rpc_client = RpcClient::new(RPC_URL);

    // Recipient (replace with your address if needed)
    let to_pubkey = Pubkey::from_str("9tyrZ8stxWctLswB1fy8GXhmhMJ288XWwNxzetBN9VpR")
        .expect("Invalid public key");

    // Balance
    let balance = rpc_client.get_balance(&keypair.pubkey()).expect("balance");
    println!("Current balance: {} lamports", balance);
    assert!(balance > 0, "Nothing to sweep: balance is 0");

    // Blockhash
    let recent_blockhash = rpc_client.get_latest_blockhash().expect("blockhash");

    // Estimate fee using a placeholder message
    let placeholder = Message::new_with_blockhash(
        &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
        Some(&keypair.pubkey()),
        &recent_blockhash,
    );
    let fee = rpc_client.get_fee_for_message(&placeholder).expect("fee");
    println!("Calculated fee: {} lamports", fee);

    // Amount to send (balance - fee)
    let amount = balance.saturating_sub(fee);
    assert!(amount > 0, "Not enough to cover fee; top up the wallet");

    // Build and send final tx
    let ix = transfer(&keypair.pubkey(), &to_pubkey, amount);
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&keypair.pubkey()), &[&keypair], recent_blockhash);

    let sig = rpc_client.send_and_confirm_transaction(&tx).expect("send");
    println!("✅ Success! https://explorer.solana.com/tx/{}?cluster=devnet", sig);
}

#[test]
fn submit_rs() {
    use solana_client::rpc_client::RpcClient;
    use solana_system_interface::program as system_program;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        message::Message,
        pubkey::Pubkey,
        signature::{read_keypair_file, Signer},
        signer::keypair::Keypair,
        transaction::Transaction,
    };
    use std::str::FromStr;

    const RPC_URL: &str = "https://api.devnet.solana.com";

    let signer = read_keypair_file("Turbin3-wallet.json").expect("wallet missing/invalid");
    let user = signer.pubkey();

    let turbin3 = Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();
    let collection = Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap();
    let mpl_core_program = Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap();
    let system_program = system_program::id();

    // PDAs from IDL
    let (account_pda, _)   = Pubkey::find_program_address(&[b"prereqs",   user.as_ref()],       &turbin3);
    let (authority_pda, _) = Pubkey::find_program_address(&[b"collection", collection.as_ref()], &turbin3);

    // Mint must be a signer
    let mint = Keypair::new();
    println!("Asset (mint) address: {}", mint.pubkey());

    // submit_rs discriminator
    let data = vec![77, 124, 82, 163, 21, 133, 181, 206];

    // Accounts in exact IDL order + mutability
    let accounts = vec![
        AccountMeta::new(user, true),                    // user (signer, writable)
        AccountMeta::new(account_pda, false),             // account (writable)
        AccountMeta::new(mint.pubkey(), true),           // mint (signer, writable)
        AccountMeta::new(collection, false),              // collection (writable)
        AccountMeta::new_readonly(authority_pda, false), // authority (readonly PDA)
        AccountMeta::new_readonly(mpl_core_program, false),
        AccountMeta::new_readonly(system_program, false),
    ];

    let ix = Instruction { program_id: turbin3, accounts, data };
    let rpc = RpcClient::new(RPC_URL);
    let bh = rpc.get_latest_blockhash().expect("blockhash");

    // Build message, confirm required signers, sign explicitly with user + mint
    let msg = Message::new(&[ix], Some(&user));
    println!("num_required_signatures: {}", msg.header.num_required_signatures);
    for (i, pk) in msg.account_keys[..msg.header.num_required_signatures as usize].iter().enumerate() {
        println!("required signer[{i}]: {pk}");
    }
    let mut tx = Transaction::new_unsigned(msg);
    tx.try_sign(&[&signer, &mint], bh).expect("sign");

    let sig = rpc.send_and_confirm_transaction(&tx).expect("send");
    println!("✅ submit_rs sent! https://explorer.solana.com/tx/{}?cluster=devnet", sig);
}


#[test]
fn preflight_check_submit_rs() {
    use solana_client::rpc_client::RpcClient;
    use solana_sdk::{pubkey::Pubkey, signature::read_keypair_file};
    use std::str::FromStr;

    const RPC_URL: &str = "https://api.devnet.solana.com";
    let rpc = RpcClient::new(RPC_URL);

    // Wallet used for submit_rs (your Phantom array file)
    let signer = read_keypair_file("Turbin3-wallet.json").expect("wallet missing/invalid");
    let user = signer.pubkey();

    // Program + collection
    let turbin3 = Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();

    // PDA that TS initialize created: ["prereqs", user]
    let (account_pda, _) = Pubkey::find_program_address(&[b"prereqs", user.as_ref()], &turbin3);

    match rpc.get_account(&account_pda) {
        Ok(_) => println!("✅ Found prereq account PDA: {account_pda} — safe to call submit_rs"),
        Err(e) => panic!("❌ PDA not found — looks like initialize wasn't run (or used a different wallet). Error: {e}"),
    }
}

}
