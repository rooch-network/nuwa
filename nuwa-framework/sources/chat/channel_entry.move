module nuwa_framework::channel_entry {
    use std::vector;
    use std::string::String;
    use moveos_std::object::Object;
    use nuwa_framework::message;
    use nuwa_framework::channel::{Self, Channel};
    use nuwa_framework::agent;
    use nuwa_framework::state_providers;

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
            if (agent::is_agent_account(addr)) {
                vector::push_back(&mut mentioned_ai_agents, addr);
            }
        });
        if (vector::length(&mentioned_ai_agents) > 0) {
            //TODO make the number of messages to fetch configurable
            let message_limit: u64 = 11;
            let messages = channel::get_last_messages(channel_obj, message_limit);
            let message_input = message::new_agent_input(messages);
            vector::for_each(mentioned_ai_agents, |ai_addr| {
                let agent = agent::borrow_mut_agent_by_address(ai_addr);
                let states = state_providers::build_agent_state(agent);
                agent::process_input_v2(caller, agent, states, message_input);
            });
        }
    }
}