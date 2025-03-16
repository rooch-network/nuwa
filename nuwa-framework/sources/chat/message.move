module nuwa_framework::message {
    use std::string::{Self, String};
    use std::vector;
    use moveos_std::timestamp;
    use moveos_std::object::{Self, ObjectID};

    use nuwa_framework::agent_input::{Self, AgentInput};
    use nuwa_framework::string_utils::{channel_id_to_string};

    friend nuwa_framework::channel;

    /// Message types
    const MESSAGE_TYPE_NORMAL: u8 = 0;
    public fun type_normal(): u8 { MESSAGE_TYPE_NORMAL }
    //TODO change this to 1 after
    const MESSAGE_TYPE_ACTION_EVENT: u8 = 2;
    public fun type_action_event(): u8 { MESSAGE_TYPE_ACTION_EVENT }

    /// The message object structure
    /// The message object is owned by the sender
    /// But it is no `store` ability, so the owner can't transfer it to another account
    struct Message has key, copy, drop {
        //TODO rename this to index
        id: u64,
        channel_id: ObjectID,  // Added channel_id
        sender: address,
        content: String,
        timestamp: u64,
        message_type: u8,
        /// The addresses mentioned in the message
        mentions: vector<address>,
    }

    //TODO remove this after https://github.com/rooch-network/rooch/issues/3362
    struct MessageForAgent has copy, drop {
        id: u64,
        // Convert ObjectID to String
        channel_id: String,
        sender: address,
        content: String,
        timestamp: u64,
        message_type: u8,
        /// The addresses mentioned in the message
        mentions: vector<address>,
    }

    struct MessageForAgentV2 has copy, drop, store{
        index: u64,
        sender: address,
        content: String,
        timestamp: u64,
        message_type: u8,
    }

    /// Message Input Description
    const MESSAGE_INPUT_DESCRIPTION: vector<u8> = b"Message Input structure: A MessageInput contains a history of previous messages and the current message to process. | Message fields: | - index: message sequence number | - sender: sender's address | - content: message text | - timestamp: creation time in milliseconds | - message_type: 0=normal message, 2=action event message | Use message history to maintain conversation context and respond appropriately to the current message.";

    struct MessageInput has copy, drop {
        history: vector<MessageForAgent>,
        current: MessageForAgent,
    }

    struct MessageInputV2 has copy, drop {
        history: vector<MessageForAgentV2>,
        current: MessageForAgentV2,
    }

    struct MessageInputV3 has copy, drop, store {
        history: vector<MessageForAgentV2>,
        channel_id: ObjectID,
        current: MessageForAgentV2,
    }

    /// Constructor - message belongs to the sender
    public(friend) fun new_message_object(
        id: u64, 
        channel_id: ObjectID,  // Added channel_id parameter
        sender: address, 
        content: String, 
        message_type: u8,
        mentions: vector<address>
    ): ObjectID {
        let message = new_message(id, channel_id, sender, content, message_type, mentions);
        let msg_obj = object::new(message);
        let msg_id = object::id(&msg_obj);
        object::transfer_extend(msg_obj, sender);
        msg_id
    }

    fun new_message(
        id: u64, 
        channel_id: ObjectID,  // Added channel_id parameter
        sender: address, 
        content: String, 
        message_type: u8,
        mentions: vector<address>
    ): Message {
        Message {
            id,
            channel_id,
            sender,
            content,
            timestamp: timestamp::now_milliseconds(),
            message_type,
            mentions,
        }
    } 


    public fun new_agent_input_v4(messages: vector<Message>) : AgentInput<MessageInputV3> {
        let channel_id = vector::borrow(&messages,0).channel_id;
        let messages_for_agent = vector::empty();
        vector::for_each(messages, |msg| {
            let msg: Message = msg;
            vector::push_back(&mut messages_for_agent, MessageForAgentV2 {
                index: msg.id,
                sender: msg.sender,
                content: msg.content,
                timestamp: msg.timestamp,
                message_type: msg.message_type,
            });
        });
        let current = vector::pop_back(&mut messages_for_agent);
        let description = string::utf8(b"Receive a message from a channel(");
        string::append(&mut description, channel_id_to_string(channel_id));
        string::append(&mut description, string::utf8(b")\n"));
        string::append(&mut description, string::utf8(MESSAGE_INPUT_DESCRIPTION));
        agent_input::new_agent_input(
            current.sender,
            channel_id,
            description,
            MessageInputV3 {
                history: messages_for_agent,
                channel_id,
                current,
            }
        )
    }

    // Getters
    public fun get_id(message: &Message): u64 {
        message.id
    }

    public fun get_channel_id(message: &Message): ObjectID {
        message.channel_id
    }

    public fun get_content(message: &Message): String {
        message.content
    }

    public fun get_type(message: &Message): u8 {
        message.message_type
    }

    public fun get_timestamp(message: &Message): u64 {
        message.timestamp
    }

    public fun get_sender(message: &Message): address {
        message.sender
    }


    public fun get_mentions(message: &Message): &vector<address> {
        &message.mentions
    }

    // Constants
    public fun type_user(): u8 { abort 0 }
    public fun type_ai(): u8 { abort 0 }


    public fun get_channel_id_from_input(input: &MessageInputV3): ObjectID {
        input.channel_id
    }

    // =============== Tests helper functions ===============
    
    #[test_only]
    public fun new_message_for_test(
        id: u64, 
        channel_id: ObjectID, 
        sender: address, 
        content: String, 
        message_type: u8,
        mentions: vector<address>
    ): Message {
        new_message(id, channel_id, sender, content, message_type, mentions)
    }

    #[test]
    fun test_message_creation() {
        //TODO provide a test function to generate ObjectID in object.move
        let test_channel_id = object::named_object_id<Message>();
        let mentions = vector::empty();
        vector::push_back(&mut mentions, @0x43);
        let msg_id = new_message_object(
            1, 
            test_channel_id, 
            @0x42, 
            string::utf8(b"test content"), 
            type_normal(),
            mentions
        );
        let msg_obj = object::borrow_object<Message>(msg_id);
        let msg = object::borrow(msg_obj);
        
        assert!(get_id(msg) == 1, 0);
        assert!(get_channel_id(msg) == test_channel_id, 1);
        assert!(get_content(msg) == string::utf8(b"test content"), 2);
        assert!(get_type(msg) == type_normal(), 3);
        assert!(get_sender(msg) == @0x42, 4);
        assert!(object::owner(msg_obj) == @0x42, 5);
    }
}