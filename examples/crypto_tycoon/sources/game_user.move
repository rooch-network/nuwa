module crypto_tycoon::game_user {

    use std::string::{String, utf8};

    const ErrorNoThisUser: u64 = 0;

    friend crypto_tycoon::crypto_tycoon;

    struct UserInfo has store{
        name: String,
        plot_owned: vector<u64>,
        balance: u64,
        current_plots: u64,
        overdraft_balance: u64,
        bonus: u64,
        tax_rate: u64,
        nft: u64,
        power_card: u64,
        multisign_card: u64,
        rug_card: u64
    }

    public(friend) fun select_user(user_id: u64): UserInfo {
        return if (user_id == 0) {
            UserInfo{
                name: utf8(b"Satoshi"),
                plot_owned: vector[],
                balance: 2000,
                current_plots: 0,
                overdraft_balance: 500,
                bonus: 300,
                tax_rate: 20,
                nft: 3,
                power_card: 3,
                multisign_card: 2,
                rug_card: 2
            }
        }else if (user_id == 1){
            UserInfo{
                name: utf8(b"Vitalik"),
                plot_owned: vector[],
                balance: 5000,
                current_plots: 0,
                overdraft_balance: 500,
                bonus: 200,
                tax_rate: 25,
                nft: 1,
                power_card: 2,
                multisign_card: 1,
                rug_card: 0
            }
        }else if (user_id == 2){
            UserInfo{
                name: utf8(b"CZ"),
                plot_owned: vector[],
                balance: 8000,
                current_plots: 0,
                overdraft_balance: 100,
                bonus: 100,
                tax_rate: 50,
                nft: 0,
                power_card: 0,
                multisign_card: 0,
                rug_card: 0
            }
        }else if (user_id == 3){
            UserInfo{
                name: utf8(b"Ulbricht"),
                plot_owned: vector[],
                balance: 6000,
                current_plots: 0,
                overdraft_balance: 300,
                bonus: 200,
                tax_rate: 30,
                nft: 0,
                power_card: 0,
                multisign_card: 0,
                rug_card: 0
            }
        }else if (user_id == 4){
            UserInfo{
                name: utf8(b"SBF"),
                plot_owned: vector[],
                balance: 4000,
                current_plots: 0,
                overdraft_balance: 300,
                bonus: 300,
                tax_rate: 40,
                nft: 0,
                power_card: 0,
                multisign_card: 0,
                rug_card: 1
            }
        }else {
             abort ErrorNoThisUser
        }
    }
}
