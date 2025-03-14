module nuwa_framework::channel_entry {
    use std::vector;
    use std::string::String;
    use moveos_std::object::Object;
    use moveos_std::type_info;
    use rooch_framework::coin::{Self, Coin};
    use rooch_framework::gas_coin::RGas;
    use rooch_framework::account_coin_store;
    use nuwa_framework::message;
    use nuwa_framework::channel::{Self, Channel};
    use nuwa_framework::agent;
    use nuwa_framework::agent_runner;

    const ErrorInvalidCoinType: u64 = 1;
    const ErrorInvalidToAddress: u64 = 2;

    
    /// Send a message and trigger AI response if needed
    public entry fun send_message(
        caller: &signer,
        channel_obj: &mut Object<Channel>,
        content: String,
        mentions: vector<address>
    ) {
        channel::send_message(caller, channel_obj, content, mentions);

        let mentioned_ai_agents = vector::empty();
        vector::for_each(mentions, |addr| {
            if (agent::is_agent_account(addr) && !vector::contains(&mentioned_ai_agents, &addr)) {
                vector::push_back(&mut mentioned_ai_agents, addr);
            }
        });
        
        if (vector::length(&mentioned_ai_agents) > 0) {
            
            vector::for_each(mentioned_ai_agents, |ai_addr| {
                let fee = coin::zero<RGas>();
                call_agent(caller, channel_obj, ai_addr, fee);
            });
        }
    }

    public entry fun send_message_with_coin<CoinType: key+store>(
        caller: &signer,
        channel_obj: &mut Object<Channel>,
        content: String,
        to: address,
        amount: u256,
    ) {
        //Currently only support send coin to agent
        assert!(agent::is_agent_account(to), ErrorInvalidToAddress);
        let mentions = vector::empty();
        vector::push_back(&mut mentions, to);
        channel::send_message(caller, channel_obj, content, mentions);
        //currently only support RGas
        assert!(type_info::type_name<CoinType>() == type_info::type_name<RGas>(), ErrorInvalidCoinType);
        let coin = account_coin_store::withdraw<RGas>(caller, amount);
        call_agent(caller, channel_obj, to, coin);
    }

    fun call_agent(caller: &signer, channel_obj: &mut Object<Channel>, ai_addr: address, fee: Coin<RGas>) {
        //TODO make the number of messages to fetch configurable
        let message_limit: u64 = 11;
        let messages = channel::get_last_messages(channel_obj, message_limit);
        
        let message_input = message::new_agent_input_v4(messages);
        let agent = agent::borrow_mut_agent_by_address(ai_addr);
        agent_runner::process_input_internal(caller, agent, message_input, fee);
    }
}