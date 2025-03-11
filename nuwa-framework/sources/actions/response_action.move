module nuwa_framework::response_action {
    use std::string::{Self, String};
    use std::option;
    use std::vector;
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::json;
    use moveos_std::result::{ok,err_str, Result};
    use moveos_std::copyable_any;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action;
    use nuwa_framework::channel;
    use nuwa_framework::action::{ActionDescription, ActionGroup};
    use nuwa_framework::agent_input::{Self, AgentInputInfoV2};
    use nuwa_framework::message::{Self, MessageInputV3};

    friend nuwa_framework::action_dispatcher;
    friend nuwa_framework::task_action;

    // Action names
    const ACTION_NAME_CHANNEL_MESSAGE: vector<u8> = b"response::channel_message";
    public fun action_name_channel_message(): String {
        string::utf8(ACTION_NAME_CHANNEL_MESSAGE)
    }
    const ACTION_NAME_DIRECT_MESSAGE: vector<u8> = b"response::direct_message";
    public fun action_name_direct_message(): String {
        string::utf8(ACTION_NAME_DIRECT_MESSAGE)
    }
    
    // Action examples
    const CHANNEL_MESSAGE_EXAMPLE: vector<u8> = b"{\"channel_id\":\"0x01374a879f3fd3a79be9c776b3f36adb2eedf298beed3900db77347065eb59e5d6\",\"content\":\"I understand you prefer detailed explanations.\"}";
    const DIRECT_MESSAGE_EXAMPLE: vector<u8> = b"{\"recipient\":\"rooch1a47ny79da3tthtnclcdny4xtadhaxcmqlnpfthf3hqvztkphcqssqd8edv\",\"content\":\"This is a direct message.\"}";

    //TODO remove this struct when we prepare a break upgrade
    #[data_struct]
    /// Arguments for the say action (sending a message to a channel)
    struct SayActionArgs has copy, drop {
        //TODO change to ObjectID after #https://github.com/rooch-network/rooch/issues/3362 is resolved
        channel_id: String,    // The channel to send the message to
        content: String,       // Response content
    }

    public fun create_say_args(
        _channel_id: ObjectID,
        _content: String
    ): SayActionArgs {
       abort 0
    }

    //TODO remove this when we prepare a break upgrade
    #[data_struct]
    /// Arguments for sending a message to a channel
    struct ChannelMessageArgs has copy, drop {
        channel_id: String,    // The channel to send the message to
        content: String,       // Message content
    }

    #[data_struct]
    /// Arguments for sending a message to a channel
    struct ChannelMessageArgsV2 has copy, drop {
        channel_id: ObjectID,    // The channel to send the message to
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
        _channel_id: ObjectID,
        _content: String
    ): ChannelMessageArgs {
        abort 0
    }

    public fun create_channel_message_args_v2(
        channel_id: ObjectID,
        content: String
    ): ChannelMessageArgsV2 {
        ChannelMessageArgsV2 {
            channel_id,
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
        let description = string::utf8(b"Actions related to responding to user queries, you can use multiple response actions to send messages to channels or users.\n\n");
        string::append(&mut description, string::utf8(b"CRITICAL: You MUST ALWAYS send at least one response back to the current message using either:\n"));
        string::append(&mut description, string::utf8(b"- response::channel_message to the current channel if in a channel conversation\n"));
        string::append(&mut description, string::utf8(b"- response::direct_message to the current user if in a direct message conversation\n"));
        //string::append(&mut description, string::utf8(b"\nFailure to respond to the current message will result in your actions not being processed.\n"));
        
        action::new_action_group(
            string::utf8(b"response"),            
            description,
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

    public fun execute(_agent: &mut Object<Agent>, _action_name: String, _args_json: String) {
        abort 0
    }

    /// Execute a response action
    public fun execute_v3(agent: &mut Object<Agent>, _agent_input: &AgentInputInfoV2, action_name: String, args_json: String) : Result<bool, String> {
        if (action_name == string::utf8(ACTION_NAME_CHANNEL_MESSAGE)) {
            // Handle channel message action
            let args_opt = json::from_json_option<ChannelMessageArgsV2>(string::into_bytes(args_json));
            if (option::is_none(&args_opt)) {
                return err_str(b"Invalid arguments for channel message action")
            };
            let args = option::destroy_some(args_opt);
            send_channel_message(agent, args.channel_id, args.content);
            ok(true)
        } else if (action_name == string::utf8(ACTION_NAME_DIRECT_MESSAGE)) {
            // Handle direct message action
            let args_opt = json::from_json_option<DirectMessageArgs>(string::into_bytes(args_json)); 
            if (option::is_none(&args_opt)) {
                return err_str(b"Invalid arguments for direct message action")
            };
            let args = option::destroy_some(args_opt);
            send_direct_message(agent, args.recipient, args.content);
            ok(true)
        } else {
            err_str(b"Unsupported action")
        }
    }

    /// Send a message to a channel
    fun send_channel_message(agent: &mut Object<Agent>, channel_id: ObjectID, content: String) : ObjectID {
        let channel = object::borrow_mut_object_shared<channel::Channel>(channel_id);
        let agent_addr = agent::get_agent_address(agent);
        channel::add_ai_response(channel, content, agent_addr);
        channel_id
    }

    /// Send a direct message to a specific user
    fun send_direct_message(agent: &mut Object<Agent>, recipient: address, content: String) : ObjectID {
        channel::send_ai_direct_message(agent, recipient, content)
    }

    public(friend) fun get_default_channel_id_from_input(agent_input: &AgentInputInfoV2): ObjectID {
        let message_input_any = *agent_input::get_input_data_from_info_v2(agent_input);
        //TODO add a try unpack function
        let message_input = copyable_any::unpack<MessageInputV3>(message_input_any);
        message::get_channel_id_from_input(&message_input)
    }

    public(friend) fun send_event_to_channel(agent: &mut Object<Agent>, channel_id: ObjectID, event: String) {
        let channel = object::borrow_mut_object_shared<channel::Channel>(channel_id);
        let agent_addr = agent::get_agent_address(agent);
        channel::add_ai_event(channel, event, agent_addr);
    }

    #[test]
    fun test_response_action_examples() {
        // Test channel message example
        let channel_args = json::from_json<ChannelMessageArgsV2>(CHANNEL_MESSAGE_EXAMPLE);
        assert!(channel_args.channel_id == object::from_string(&string::utf8(b"0x01374a879f3fd3a79be9c776b3f36adb2eedf298beed3900db77347065eb59e5d6")), 1);
        assert!(channel_args.content == string::utf8(b"I understand you prefer detailed explanations."), 2);
        
        // Test direct message example
        let dm_args = json::from_json<DirectMessageArgs>(DIRECT_MESSAGE_EXAMPLE);
        assert!(dm_args.recipient == @0xed7d3278adec56bbae78fe1b3254cbeb6fd36360fcc295dd31b81825d837c021, 3);
        assert!(dm_args.content == string::utf8(b"This is a direct message."), 4);
    }

    #[test]
    fun test_channel_id_conversion() {
        use nuwa_framework::string_utils::{string_to_channel_id,channel_id_to_string};
        let channel_id = object::named_object_id<channel::Channel>();
        let channel_id_str = channel_id_to_string(channel_id);
        std::debug::print(&channel_id_str);
        let channel_id_converted = string_to_channel_id(channel_id_str);
        assert!(channel_id == channel_id_converted, 0);
    }
}