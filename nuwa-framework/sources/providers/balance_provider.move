module nuwa_framework::balance_provider {
    use std::vector;
    use std::string::{Self, String};
    use moveos_std::json;
    use moveos_std::type_info;
    use moveos_std::object::{Object};
    use moveos_std::decimal_value::{Self, DecimalValue};
    use rooch_framework::coin;
    use rooch_framework::account_coin_store;
    use rooch_framework::gas_coin::RGas;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::agent_state::{Self, AgentState};

    const BALANCE_DESCRIPTION: vector<u8> = b"This is your balances";

    
    #[data_struct]
    struct BalanceState has copy, drop, store {
        coin_symbol: String,
        coin_type: String,
        balance: DecimalValue,
    }
    
    public fun get_state(agent: &Object<Agent>): AgentState {
        let balance_states = vector::empty();
        let coin_type = type_info::type_name<RGas>();
        let coin_symbol = coin::symbol_by_type<RGas>();
        let decimals = coin::decimals_by_type<RGas>();
        let agent_address = agent::get_agent_address(agent);
        let balance = account_coin_store::balance<RGas>(agent_address);
        let balance_state = BalanceState {
            coin_symbol,
            coin_type,
            balance: decimal_value::new(balance, decimals),
        };
        vector::push_back(&mut balance_states, balance_state);
        let state_json = string::utf8(json::to_json(&balance_states));

        agent_state::new_agent_state(string::utf8(BALANCE_DESCRIPTION), state_json)
    }

    #[test]
    fun test_balance_state(){
        let balance_state = BalanceState {
            coin_symbol: string::utf8(b"RGas"),
            coin_type: string::utf8(b"0x3::gas_coin::RGas"),
            balance: decimal_value::new(110000000, 8),
        };
        let state_json = string::utf8(json::to_json(&balance_state));
        std::debug::print(&state_json);
    }
}