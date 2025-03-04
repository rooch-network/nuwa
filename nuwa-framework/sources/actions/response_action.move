module nuwa_framework::response_action {
    use std::string::{Self, String};
    use std::option;
    use std::vector;
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::json;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action;
    use nuwa_framework::channel;
    use nuwa_framework::string_utils::{channel_id_to_string, string_to_channel_id};
    use nuwa_framework::action::ActionDescription;

    const ACTION_NAME_SAY: vector<u8> = b"response::say";
    // Action example
    const SAY_ACTION_EXAMPLE: vector<u8> = b"{\"channel_id\":\"0x01374a879f3fd3a79be9c776b3f36adb2eedf298beed3900db77347065eb59e5d6\",\"content\":\"I understand you prefer detailed explanations.\"}";

    #[data_struct]
    /// Arguments for the say action
    struct SayActionArgs has copy, drop {
        //TODO change to ObjectID after #https://github.com/rooch-network/rooch/issues/3362 is resolved
        channel_id: String,
        content: String,     // Response content
    }

    /// Create arguments for say action
    public fun create_say_args(
        channel_id: ObjectID,
        content: String
    ): SayActionArgs {
        SayActionArgs {
            channel_id: channel_id_to_string(channel_id),
            content
        }
    }

    public fun register_actions() {
    }

    public fun get_action_descriptions() : vector<ActionDescription> {
        let descriptions = vector::empty();

        // Register say action with channel_id parameter
        let say_args = vector[
            action::new_action_argument(
                string::utf8(b"channel_id"),
                string::utf8(b"string"),
                string::utf8(b"The channel to send response to"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The response content to send to user"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions,
            action::new_action_description(
                string::utf8(ACTION_NAME_SAY),
                string::utf8(b"Send a response to the user"),
                say_args,
                string::utf8(SAY_ACTION_EXAMPLE),
                string::utf8(b"Use this action to send your final response to the specified channel"),
                string::utf8(b"Must be used exactly once in each response"),
            )
        );
        descriptions
    }

    public fun execute(agent: &mut Object<Agent>, action_name: String, args_json: String) {
        if (action_name == string::utf8(ACTION_NAME_SAY)) {
            let args_opt = json::from_json_option<SayActionArgs>(string::into_bytes(args_json));
            if (option::is_none(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for action"));
                return
            };
            let args = option::destroy_some(args_opt);
            send_response(agent, string_to_channel_id(args.channel_id), args.content);
        };
    }

    fun send_response(agent: &mut Object<Agent>, channel_id: ObjectID, content: String) {
        let channel = object::borrow_mut_object_shared<channel::Channel>(channel_id);
        let agent_addr = agent::get_agent_address(agent);
        channel::add_ai_response(channel, content, agent_addr);
    }

    #[test]
    fun test_response_action_examples() {
        // Test say action example
        let say_args = json::from_json<SayActionArgs>(SAY_ACTION_EXAMPLE);
        assert!(say_args.content == string::utf8(b"I understand you prefer detailed explanations."), 2);
    }

    #[test]
    fun test_channel_id_conversion() {
        let channel_id = object::named_object_id<channel::Channel>();
        let channel_id_str = channel_id_to_string(channel_id);
        std::debug::print(&channel_id_str);
        let channel_id_converted = string_to_channel_id(channel_id_str);
        assert!(channel_id == channel_id_converted, 0);
    }
}