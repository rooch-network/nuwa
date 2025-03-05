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
    use nuwa_framework::action::{ActionDescription, ActionGroup};

    // Action names
    const ACTION_NAME_CHANNEL_MESSAGE: vector<u8> = b"response::channel_message";
    const ACTION_NAME_DIRECT_MESSAGE: vector<u8> = b"response::direct_message";
    
    // Action examples
    const CHANNEL_MESSAGE_EXAMPLE: vector<u8> = b"{\"channel_id\":\"0x01374a879f3fd3a79be9c776b3f36adb2eedf298beed3900db77347065eb59e5d6\",\"content\":\"I understand you prefer detailed explanations.\"}";
    const DIRECT_MESSAGE_EXAMPLE: vector<u8> = b"{\"recipient\":\"0x42\",\"content\":\"This is a direct message.\"}";

    //TODO remove this struct when we prepare a break upgrade
    #[data_struct]
    /// Arguments for the say action (sending a message to a channel)
    struct SayActionArgs has copy, drop {
        //TODO change to ObjectID after #https://github.com/rooch-network/rooch/issues/3362 is resolved
        channel_id: String,    // The channel to send the message to
        content: String,       // Response content
    }

    public fun create_say_args(
        channel_id: ObjectID,
        content: String
    ): SayActionArgs {
        SayActionArgs {
            channel_id: channel_id_to_string(channel_id),
            content
        }
    }

    #[data_struct]
    /// Arguments for sending a message to a channel
    struct ChannelMessageArgs has copy, drop {
        channel_id: String,    // The channel to send the message to
        content: String,       // Message content
    }

    #[data_struct]
    /// Arguments for sending a private message to a user
    struct DirectMessageArgs has copy, drop {
        recipient: address,     // Recipient address
        content: String,       // Message content
    }

    /// Create arguments for channel message action
    public fun create_channel_message_args(
        channel_id: ObjectID,
        content: String
    ): ChannelMessageArgs {
        ChannelMessageArgs {
            channel_id: channel_id_to_string(channel_id),
            content
        }
    }

    /// Create arguments for direct message action
    public fun create_direct_message_args(
        recipient: address,
        content: String
    ): DirectMessageArgs {
        DirectMessageArgs {
            recipient: recipient,
            content
        }
    }

    /// Register all response actions
    public fun register_actions() {
        //TODO remove this when we prepare a break upgrade
    }

    public fun get_action_group(): ActionGroup {
        action::new_action_group(
            string::utf8(b"response"),            
            string::utf8(b"Actions related to responding to user queries, you can use multiple response actions to send messages to channels or users at the same time."),
            get_action_descriptions()
        )   
    }

    /// Get descriptions for all response actions
    public fun get_action_descriptions() : vector<ActionDescription> {
        let descriptions = vector::empty();

        // Register channel message action
        let channel_args = vector[
            action::new_action_argument(
                string::utf8(b"channel_id"),
                string::utf8(b"string"),
                string::utf8(b"The channel to send message to"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The message content"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions,
            action::new_action_description(
                string::utf8(ACTION_NAME_CHANNEL_MESSAGE),
                string::utf8(b"Send a message to the channel"),
                channel_args,
                string::utf8(CHANNEL_MESSAGE_EXAMPLE),
                string::utf8(b"Use this action to send a message to all participants in a specific channel"),
                string::utf8(b"This message will be visible to everyone in the channel"),
            )
        );

        // Register direct message action
        let dm_args = vector[
            action::new_action_argument(
                string::utf8(b"recipient"),
                string::utf8(b"string"),
                string::utf8(b"The recipient address to send message to"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The message content"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions,
            action::new_action_description(
                string::utf8(ACTION_NAME_DIRECT_MESSAGE),
                string::utf8(b"Send a direct message to a user"),
                dm_args,
                string::utf8(DIRECT_MESSAGE_EXAMPLE),
                string::utf8(b"Use this action to send a message directly to a specific user"),
                string::utf8(b"The message is onchain, so it is visible to everyone"),
            )
        );

        descriptions
    }

    /// Execute a response action
    public fun execute(agent: &mut Object<Agent>, action_name: String, args_json: String) {
        if (action_name == string::utf8(ACTION_NAME_CHANNEL_MESSAGE)) {
            // Handle channel message action
            let args_opt = json::from_json_option<ChannelMessageArgs>(string::into_bytes(args_json));
            if (option::is_none(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for channel message action"));
                return
            };
            let args = option::destroy_some(args_opt);
            send_channel_message(agent, string_to_channel_id(args.channel_id), args.content);
        } else if (action_name == string::utf8(ACTION_NAME_DIRECT_MESSAGE)) {
            // Handle direct message action
            let args_opt = json::from_json_option<DirectMessageArgs>(string::into_bytes(args_json)); 
            if (option::is_none(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for direct message action"));
                return
            };
            let args = option::destroy_some(args_opt);
            send_direct_message(agent, args.recipient, args.content);
        };
    }

    /// Send a message to a channel
    fun send_channel_message(agent: &mut Object<Agent>, channel_id: ObjectID, content: String) {
        let channel = object::borrow_mut_object_shared<channel::Channel>(channel_id);
        let agent_addr = agent::get_agent_address(agent);
        channel::add_ai_response(channel, content, agent_addr);
    }

    /// Send a direct message to a specific user
    fun send_direct_message(agent: &mut Object<Agent>, recipient: address, content: String) {
        channel::send_ai_direct_message(agent, recipient, content);
    }

    #[test]
    fun test_response_action_examples() {
        // Test channel message example
        let channel_args = json::from_json<ChannelMessageArgs>(CHANNEL_MESSAGE_EXAMPLE);
        assert!(channel_args.channel_id == string::utf8(b"0x01374a879f3fd3a79be9c776b3f36adb2eedf298beed3900db77347065eb59e5d6"), 1);
        assert!(channel_args.content == string::utf8(b"I understand you prefer detailed explanations."), 2);
        
        // Test direct message example
        let dm_args = json::from_json<DirectMessageArgs>(DIRECT_MESSAGE_EXAMPLE);
        assert!(dm_args.recipient == @0x42, 3);
        assert!(dm_args.content == string::utf8(b"This is a direct message."), 4);
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