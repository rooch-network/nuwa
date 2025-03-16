module nuwa_framework::agent_entry {
    use std::signer;
    use moveos_std::object::{Self, Object};
    use rooch_framework::account_coin_store;
    use rooch_framework::gas_coin::RGas;

    use nuwa_framework::character::{Character};
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::agent_cap;
    use nuwa_framework::channel;
    use nuwa_framework::config;
    

    public entry fun create_agent(creater: &signer, character: Object<Character>) {
        let initial_fee = account_coin_store::withdraw<RGas>(creater, config::get_ai_agent_initial_fee());
        let creater_addr = signer::address_of(creater);
        let agent_cap = agent::create_agent_with_initial_fee(character, initial_fee);
        let agent_id = agent_cap::get_agent_obj_id(&agent_cap);
        let agent = object::borrow_mut_object_shared<Agent>(agent_id);
        let _channel_id = channel::create_ai_home_channel(agent);
        object::transfer(agent_cap, creater_addr);    
    }
}