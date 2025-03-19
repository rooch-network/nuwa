module nuwa_framework::balance_provider {
    use std::vector;
    use std::string::{Self, String};
    use moveos_std::json;
    use moveos_std::object::{Object};
    use moveos_std::decimal_value::{DecimalValue};
    use rooch_framework::gas_coin::RGas;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::agent_state::{Self, AgentState};
    use nuwa_framework::balance_state;

    const BALANCE_DESCRIPTION: vector<u8> = b"This is your balances";

    //Deprecated
    #[data_struct]
    struct BalanceState has copy, drop, store {
        coin_symbol: String,
        coin_type: String,
        balance: DecimalValue,
    }
    
    public fun get_state(agent: &Object<Agent>): AgentState {
        let balance_states = vector::empty();
        let agent_address = agent::get_agent_address(agent);
        let balance_state = balance_state::get_balance_state<RGas>(agent_address);
        vector::push_back(&mut balance_states, balance_state);
        let state_json = string::utf8(json::to_json(&balance_states));

        agent_state::new_agent_state(string::utf8(BALANCE_DESCRIPTION), state_json)
    }

}