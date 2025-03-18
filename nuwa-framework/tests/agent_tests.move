#[test_only]
module nuwa_framework::agent_tests {
    use std::debug;
    use std::string;
    use std::vector;
    use rooch_framework::gas_coin::RGas;
    use nuwa_framework::agent;
    use nuwa_framework::agent_runner;
    use nuwa_framework::agent_input;
    use nuwa_framework::channel;
    use nuwa_framework::message;
    use nuwa_framework::agent_input_info;
    use nuwa_framework::message_for_agent;
    use nuwa_framework::prompt_input;
    
    #[test]
    fun test_prompt_builder() {
        nuwa_framework::genesis::init_for_test();

        let (agent, cap) = agent::create_test_agent(
            string::utf8(b"MoveGuide"),
            string::utf8(b"move_guide"),
            string::utf8(b"https://test/avator.png"),
            string::utf8(b"A specialized Move programming assistant with expertise in blockchain development"),
            string::utf8(b"Patient and methodical in explanations"),
        );
        
        // Create AI home channel
        let channel_id = channel::create_ai_home_channel(agent);
       
        let test_user = @0x43;

        // First interaction: User introduces themselves
        let test_message = message::new_message_for_test(
            1,
            channel_id,
            test_user,
            string::utf8(b"Hi, I'm Alex. I prefer learning with real code examples and practical projects. I'm very interested in Move smart contracts and blockchain development. Could you help me learn?"),
            message::type_normal(),
            vector::empty(),
            0
        );
        
        let coin_input = agent_input_info::new_coin_input_info_by_type<RGas>(1000000000u256);

        let agent_input = message_for_agent::new_agent_input(vector[test_message]);
        std::debug::print(&agent_input);
        
        let agent_input_info = agent_input::into_agent_input_info(agent_input, coin_input);
        
        // Get first prompt
        let prompt_input = agent_runner::generate_system_prompt(agent, agent_input_info);
        let prompt = prompt_input::format_prompt(&prompt_input);
        // Print first prompt for debugging
        debug::print(&string::utf8(b"First Prompt:"));
        debug::print(string::bytes(&prompt));

        // Clean up
        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }
}