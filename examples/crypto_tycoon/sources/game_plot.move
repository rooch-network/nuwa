module crypto_tycoon::game_plot {

    use std::string::{String, utf8};
    use std::vector;
    use moveos_std::object::Object;
    use moveos_std::object;

    struct GameMap has key, store,copy {
        plots: vector<Plot>
    }

    struct Plot has store, copy {
        plot_type: u8,  // 0:starting point 1:normal 2:interactive 3:rand event 4: market
        plot_name: String,
        owner: address,
        level: u8,
        price: u64,
        has_rug: bool,
        income: u64
    }


    fun init_defalut_game_map(): Object<GameMap> {
        let plots = vector<Plot>[];
        // Bitcoin White Paper Released
        vector::push_back(&mut plots, Plot{
            plot_type: 0,
            plot_name: utf8(b"Bitcoin White Paper Released"),
            owner: @rooch_framework,
            level: 0,
            price: 0,
            has_rug: false,
            income: 0
        });
        // Bitcoin Genesis Block Generated
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Bitcoin Genesis Block Generated"),
            owner: @rooch_framework,
            level: 0,
            price: 1000,
            has_rug: false,
            income: 400
        });
        // Pizza-Day
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Pizza-Day"),
            owner: @rooch_framework,
            level: 0,
            price: 500,
            has_rug: false,
            income: 200
        });
        // Silk Road
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Silk Road"),
            owner: @rooch_framework,
            level: 0,
            price: 100,
            has_rug: false,
            income: 30
        });
        // Mt.Gox Exchange Bankruptcy
        vector::push_back(&mut plots, Plot{
            plot_type: 3,
            plot_name: utf8(b"Mt.Gox Exchange Bankruptcy"),
            owner: @rooch_framework,
            level: 0,
            price: 0,
            has_rug: false,
            income: 0
        });
        // Ethereum Mainnet
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Ethereum Mainnet"),
            owner: @rooch_framework,
            level: 0,
            price: 600,
            has_rug: false,
            income: 240
        });
        // The Dao Attack Event
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"The Dao Attack Event"),
            owner: @rooch_framework,
            level: 0,
            price: 200,
            has_rug: false,
            income: 40
        });
        // Bitcoin's First Hard Fork (BCH)
        vector::push_back(&mut plots, Plot{
            plot_type: 2,
            plot_name: utf8(b"Bitcoin's First Hard Fork (BCH)"),
            owner: @rooch_framework,
            level: 0,
            price: 0,
            has_rug: false,
            income: 0
        });
        // ICO Boom
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"ICO Boom"),
            owner: @rooch_framework,
            level: 0,
            price: 300,
            has_rug: false,
            income: 130
        });
        // Ethereum	CryptoKitties
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Ethereum CryptoKitties"),
            owner: @rooch_framework,
            level: 0,
            price: 200,
            has_rug: false,
            income: 70
        });
        // The Rise of CEX
        vector::push_back(&mut plots, Plot{
            plot_type: 4,
            plot_name: utf8(b"The Rise of CEX"),
            owner: @rooch_framework,
            level: 0,
            price: 0,
            has_rug: false,
            income: 0
        });
        // The Encryption Winter
        vector::push_back(&mut plots, Plot{
            plot_type: 3,
            plot_name: utf8(b"The Encryption Winter"),
            owner: @rooch_framework,
            level: 0,
            price: 0,
            has_rug: false,
            income: 0
        });
        // Privacy Coin Mining Tide
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Privacy Coin Mining Tide"),
            owner: @rooch_framework,
            level: 0,
            price: 200,
            has_rug: false,
            income: 70
        });
        // Defi Hot
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Defi Hot"),
            owner: @rooch_framework,
            level: 0,
            price: 400,
            has_rug: false,
            income: 170
        });
        // Tesla buys BTC
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Tesla buys BTC"),
            owner: @rooch_framework,
            level: 0,
            price: 100,
            has_rug: false,
            income: 40
        });
        // Salvadoran Bitcoin Legalization
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Salvadoran Bitcoin Legalization"),
            owner: @rooch_framework,
            level: 0,
            price: 200,
            has_rug: false,
            income: 90
        });
        // NFT and GameFi Gold Rush
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"NFT and GameFi Gold Rush"),
            owner: @rooch_framework,
            level: 0,
            price: 300,
            has_rug: false,
            income: 120
        });
        // Luna Death Spiral
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Luna Death Spiral"),
            owner: @rooch_framework,
            level: 0,
            price: 300,
            has_rug: false,
            income: 120
        });
        // FTX Exchange Bankruptcy
        vector::push_back(&mut plots, Plot{
            plot_type: 3,
            plot_name: utf8(b"FTX Exchange Bankruptcy"),
            owner: @rooch_framework,
            level: 0,
            price: 0,
            has_rug: false,
            income: 0
        });
        // Ethereum Merge
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"FTX Exchange Bankruptcy"),
            owner: @rooch_framework,
            level: 0,
            price: 200,
            has_rug: false,
            income: 100
        });
        // BRC-20
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"BRC-20"),
            owner: @rooch_framework,
            level: 0,
            price: 100,
            has_rug: false,
            income: 40
        });
        // Bitcoin ETF
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Bitcoin ETF"),
            owner: @rooch_framework,
            level: 0,
            price: 600,
            has_rug: false,
            income: 260
        });
        // MEME Hot
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"MEME Hot"),
            owner: @rooch_framework,
            level: 0,
            price: 300,
            has_rug: false,
            income: 160
        });
        // Trump Coin
        vector::push_back(&mut plots, Plot{
            plot_type: 1,
            plot_name: utf8(b"Trump Coin"),
            owner: @rooch_framework,
            level: 0,
            price: 200,
            has_rug: false,
            income: 100
        });
        object::new_named_object(GameMap{
            plots
        })
    }

    fun init() {
        let game_map = init_defalut_game_map();
        object::to_shared(game_map)
    }

    public fun load_game_map(obj: &Object<GameMap>): GameMap {
        *object::borrow<GameMap>(obj)
    }

    //TODO update game map
}
