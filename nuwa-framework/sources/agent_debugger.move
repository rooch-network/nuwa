module nuwa_framework::agent_debugger {
    use std::string::{Self, String};
    use std::vector;
    use moveos_std::object::Object;
    use moveos_std::json;
    use moveos_std::decimal_value::DecimalValue;
    use rooch_framework::gas_coin::RGas;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::attachment::Attachment;
    use nuwa_framework::channel;
    use nuwa_framework::message;
    use nuwa_framework::message_for_agent;
    use nuwa_framework::agent_input;
    use nuwa_framework::agent_input_info;
    use nuwa_framework::agent_runner;
    use nuwa_framework::user_profile_for_agent;
    use nuwa_framework::ai_request;
    use nuwa_framework::prompt_input;

    #[data_struct]
    struct DebugMessage has copy, drop, store {
        index: u64,
        sender: address,
        content: String,
        timestamp: u64,
        attachments: vector<Attachment>,
    }

    #[data_struct]
    struct DebugInput has copy, drop, store {
        messages: vector<DebugMessage>,
        temperature: DecimalValue,
        mock_rgas_amount: u256,
    }

    public fun new_debug_input(messages: vector<DebugMessage>, temperature: DecimalValue, mock_rgas_amount: u256): DebugInput {
        DebugInput {
            messages,
            temperature,
            mock_rgas_amount,
        }
    }

    public fun new_debug_message(index: u64, sender: address, content: String, timestamp: u64, attachments: vector<Attachment>): DebugMessage {
        DebugMessage {
            index,
            sender,
            content,
            timestamp,
            attachments,
        }
    }

    public fun make_debug_ai_request(agent: &Object<Agent>, message_json: String): String {
        let debug_input = json::from_json<DebugInput>(string::into_bytes(message_json));
        let messages = vector::empty();
        let channel_id = channel::get_agent_home_channel_id(agent);
        vector::for_each(debug_input.messages, |debug_msg| {
            let debug_msg: DebugMessage = debug_msg;
            let message = message::new_message(
                debug_msg.index,
                channel_id,
                debug_msg.sender,
                debug_msg.content,
                message::type_normal(),
                vector::empty(),
                0,
                debug_msg.attachments,
            );
            vector::push_back(&mut messages, message);
        });
        let agent_address = agent::get_agent_address(agent);
        let model_provider = *agent::get_agent_model_provider(agent);
        let agent_input = message_for_agent::new_agent_input_with_agent_address(agent_address, messages);

        let coin_input_info = agent_input_info::new_coin_input_info_by_type<RGas>(debug_input.mock_rgas_amount);
        let sender = agent_input::get_sender(&agent_input);
        let sender_profile = user_profile_for_agent::get_user_profile(sender);
        let input_info = agent_input::into_agent_input_info(agent_input, sender_profile, coin_input_info);

        let prompt = agent_runner::generate_system_prompt(agent, input_info);
        let system_prompt = prompt_input::format_prompt(&prompt);
        // Create chat messages
        let messages = vector::empty();
        
        // Add system message
        vector::push_back(&mut messages, ai_request::new_system_chat_message(system_prompt));

        // Create chat request
        let chat_request = ai_request::new_chat_request(
            model_provider,
            messages,
            debug_input.temperature,
        );
        string::utf8(json::to_json(&chat_request))
    }
 
}