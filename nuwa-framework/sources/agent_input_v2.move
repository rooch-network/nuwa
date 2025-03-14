module nuwa_framework::agent_input_v2{
    use std::string::{Self, String};
    use moveos_std::json;
    use moveos_std::type_info;
    use moveos_std::object::{ObjectID};
    use nuwa_framework::agent_input_info::{Self, AgentInputInfo, CoinInputInfo};
    
    struct AgentInput<I> has copy, drop, store {
        sender: address,
        response_channel_id: ObjectID,
        input_description: String,
        input_data: I,
    } 

    public fun new_agent_input<I>(
        sender: address,
        response_channel_id: ObjectID,
        input_description: String,
        input_data: I,
    ): AgentInput<I> {
        AgentInput {
            sender,
            response_channel_id,
            input_description,
            input_data,
        }
    } 

    public fun get_sender<I>(input: &AgentInput<I>): address {
        input.sender
    }

    public fun get_response_channel_id<I>(input: &AgentInput<I>): ObjectID {
        input.response_channel_id
    }

    public fun get_input_description<I>(input: &AgentInput<I>): &String {
        &input.input_description
    }

    public fun get_input_data<I>(input: &AgentInput<I>): &I {
        &input.input_data
    }

    public fun unpack<I>(input: AgentInput<I>) : (address, ObjectID, String, I) {
        let AgentInput { sender, response_channel_id, input_description, input_data } = input;
        (sender, response_channel_id, input_description, input_data)
    }

    public fun into_agent_input_info<I: drop>(input: AgentInput<I>, coin_input_info: CoinInputInfo) : AgentInputInfo {
        agent_input_info::new(
            input.sender,
            input.response_channel_id,
            coin_input_info,
            input.input_description,
            type_info::type_name<I>(),
            string::utf8(json::to_json(&input.input_data)),
        )
    }
}