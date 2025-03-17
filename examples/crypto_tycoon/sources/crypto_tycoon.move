
module crypto_tycoon::crypto_tycoon {
    use std::string::String;
    use std::vector;
    use std::option::{Option, none};
    use std::signer::address_of;
    use std::string;
    use std::vector::for_each_ref;
    use crypto_tycoon::game_user::{UserInfo, select_user};
    use crypto_tycoon::game_plot::Plot;
    use nuwa_framework::agent;
    use nuwa_framework::agent::Agent;
    use nuwa_framework::agent_cap;
    use nuwa_framework::agent_cap::AgentCap;
    use nuwa_framework::channel;
    use nuwa_framework::channel::Channel;
    use nuwa_framework::character;
    use nuwa_framework::config;
    use rooch_framework::gas_coin::RGas;
    use rooch_framework::account_coin_store;
    use moveos_std::timestamp::now_seconds;
    use rooch_framework::coin_store;
    use moveos_std::object;
    use rooch_framework::coin_store::CoinStore;
    use moveos_std::object::{Object, ObjectID};

    const ErrorTooManyPlayer: u64 = 0;
    const ErrorGameNotWait: u64 = 1;
    const ErrorPlayerNotReady: u64 = 2;
    const ErrorNotGameCreator: u64 = 3;
    const ErrorExceedingMaximumBetAmount: u64 = 4;


    const INITAL_FUND: u64 = 5000;
    const MAX_BET_AMOUNT: u256 = 1000_00000000; // 1000RGAS
    const FEE: u64 = 200; // 2%

    struct GlobeConfig has key {
        agent_cap: Object<AgentCap>,
        max_bet_amount: u256,
        fee: u64,
        game_channel: ObjectID
    }

    struct Game has key {
        id: ObjectID, // topic channel id
        creator: address,
        status: u8,   // 0:wait 1:playing 2:end
        players: vector<Player>, // 2~6
        next_player_address: address,
        plots: vector<Plot>,
        bet_amount: u256,
        winner: address,
        last_results: Option<Result>,
        coin_store: Object<CoinStore<RGas>>,
        last_update_time: u64
    }

    struct Result has store {
        player: address,
        dice1: u8,
        dice2: u8,
        timestamp: u64
    }

    struct Player has store {
        player_status: u8, // 0: wait 1:ready 2:bankruptcy
        player_address: address,
        user: UserInfo,

    }


    fun init(signer: &signer){
        let initial_fee = account_coin_store::withdraw<RGas>(signer, config::get_ai_agent_initial_fee());
        let char_data = character::new_character_data(
            string::utf8(b"CryptoTycoonGame"),
            string::utf8(b"crypto_tycoon_game"),
            string::utf8(b"An Immersive Blockchain Implementation of the Classic Monopoly Game with Integrated Artificial Intelligence Gameplay System"),
            vector[
                string::utf8(b"Act as a virtual player with economic strategic thinking"),
                string::utf8(b"Maintain character consistency: Investment Strategy with the Highest Winning Rate"),
                string::utf8(b"Provide a yes or no decision based on the highest win rate."),
                string::utf8(b"Create concise action insights for passed terrain areas"),
            ],
            vector[
                string::utf8(b"Bankruptcy occurs when assets reach zero or below"),
                string::utf8(b"Expanding territories increases earning potential"),
                string::utf8(b"Victory is achieved by forcing all other players into bankruptcy"),
            ]
        );
        let character_obj = character::create_character(char_data);
        let agent_cap = agent::create_agent_with_initial_fee(character_obj, initial_fee);
        let agent_id = agent_cap::get_agent_obj_id(&agent_cap);
        let agent = object::borrow_mut_object_shared<Agent>(agent_id);
        let home_channel_id = channel::create_ai_home_channel(agent);
        let game_config = object::new_named_object(GlobeConfig{
            agent_cap,
            max_bet_amount: MAX_BET_AMOUNT,
            fee: FEE,
            game_channel: home_channel_id
        });
        object::to_shared(game_config)
    }

    public entry fun create_game(signer: &signer, agent: &mut Object<Agent>, global_config_obj: &mut Object<GlobeConfig>, bet_amount: u256, topic: String, select_user_id: u64) {
        let global_config = object::borrow_mut(global_config_obj);
        assert!(bet_amount < global_config.max_bet_amount, ErrorExceedingMaximumBetAmount);
        let coin = account_coin_store::withdraw<RGas>(signer, bet_amount);
        let coin_store = coin_store::create_coin_store<RGas>();
        coin_store::deposit(&mut coin_store, coin);
        let game_home_channel = object::borrow_mut_object_shared<Channel>(global_config.game_channel);
        let topic_channel = channel::create_topic_channel(signer, agent, game_home_channel, topic);
        let user_info = select_user(select_user_id);
        let game_obj = object::new(Game {
            id: topic_channel,
            creator: address_of(signer),
            status: 0,
            players: vector::singleton(Player {
                player_status: 1, // 0: wait 1:ready 2:bankruptcy
                player_address: address_of(signer),
                user: user_info
            }),
            next_player_address: address_of(signer),
            plots: vector[],
            winner: @rooch_framework,
            bet_amount,
            last_results: none(),
            coin_store,
            last_update_time: now_seconds(),
        });
        object::to_shared(game_obj)

    }

    public entry fun join_game(player: &signer, game_obj: &mut Object<Game>, select_user_id: u64) {
        let game = object::borrow_mut(game_obj);
        assert!(vector::length(&game.players) < 6, ErrorTooManyPlayer);
        assert!(game.status == 0, ErrorGameNotWait);
        let coin = account_coin_store::withdraw<RGas>(player, game.bet_amount);
        let user_info = select_user(select_user_id);
        vector::push_back(&mut game.players, Player{
            player_status: 1, // 0: wait 1:ready 2:bankruptcy
            player_address: address_of(player),
            user: user_info
        });
        coin_store::deposit(&mut game.coin_store, coin);
        game.last_update_time = now_seconds()
    }

    public entry fun start_game(player_signer: &signer, game_obj: &mut Object<Game>) {
        let game = object::borrow_mut(game_obj);
        assert!(game.status == 0, ErrorGameNotWait);
        assert!(game.creator == address_of(player_signer), ErrorNotGameCreator);
        for_each_ref(&game.players,|player| {
            assert!(get_player_status(player) == 1, ErrorPlayerNotReady)
        });
        game.status = 1;
        game.last_update_time = now_seconds();
    }

    // TODO Kick out the player
    // TODO disband the room




    public fun get_player_status(player: &Player): u8 {
        return player.player_status
    }
}
