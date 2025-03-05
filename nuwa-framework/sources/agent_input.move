module nuwa_framework::agent_input{
    use std::string::{Self, String};
    use moveos_std::json;
    
    struct AgentInput<I> has copy, drop, store {
        sender: address,
        input_description: String,
        input_data: I,
    }

    struct AgentInputInfo has copy, drop, store {
        sender: address,
        input_data_json: String,
    }

    public fun new_agent_input<I>(
        sender: address,
        input_description: String,
        input_data: I,
    ): AgentInput<I> {
        AgentInput {
            sender,
            input_description,
            input_data,
        }
    }

    public fun get_sender<I>(input: &AgentInput<I>): address {
        input.sender
    }

    public fun get_input_description<I>(input: &AgentInput<I>): &String {
        &input.input_description
    }

    public fun get_input_data<I>(input: &AgentInput<I>): &I {
        &input.input_data
    }

    public fun unpack<I>(input: AgentInput<I>) : (address, String, I) {
        let AgentInput { sender, input_description, input_data } = input;
        (sender, input_description, input_data)
    }

    public fun to_agent_input_info<I>(input: &AgentInput<I>) : AgentInputInfo {
        AgentInputInfo {
            sender: input.sender,
            input_data_json: string::utf8(json::to_json(&input.input_data)),
        }
    }

    public fun get_sender_from_info(info: &AgentInputInfo): address {
        info.sender
    }

    public fun get_input_data_from_info(info: &AgentInputInfo): &String {
        &info.input_data_json
    }

    #[test_only]
    public fun new_agent_input_info_for_test(sender: address, input_data_json: String) : AgentInputInfo {
        AgentInputInfo {
            sender,
            input_data_json,
        }
    }
}