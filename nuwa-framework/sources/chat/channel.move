module nuwa_framework::channel {
    use std::string::{Self, String};
    use std::vector;
    use std::bcs;
    use std::hash;
    use std::option::{Self, Option};
    use moveos_std::address;
    use moveos_std::table::{Self, Table};
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::timestamp;
    use moveos_std::signer;
    use nuwa_framework::message::{Self, Message};
    use nuwa_framework::agent::{Self, Agent};

    friend nuwa_framework::response_action;

    // Error codes
    const ErrorChannelNotFound: u64 = 1;
    const ErrorChannelAlreadyExists: u64 = 2;
    const ErrorNotAuthorized: u64 = 3;
    const ErrorChannelInactive: u64 = 4;
    const ErrorMaxMembersReached: u64 = 5;
    const ErrorInvalidChannelName: u64 = 6;
    const ErrorInvalidChannelType: u64 = 7;
    const ErrorNotMember: u64 = 8;
    const ErrorDeprecatedFunction: u64 = 9;
    const ErrorMentionedUserNotMember: u64 = 10;

    /// Channel status constants
    const CHANNEL_STATUS_ACTIVE: u8 = 0;
    const CHANNEL_STATUS_CLOSED: u8 = 1;
    const CHANNEL_STATUS_BANNED: u8 = 2;


    // Channel type constants with built-in visibility
    const CHANNEL_TYPE_AI_HOME: u8 = 0;   // AI's home channel, always public
    const CHANNEL_TYPE_AI_PEER: u8 = 1;   // 1:1 AI-User channel, always private

    // Public functions to expose channel types
    public fun channel_type_ai_home(): u8 { CHANNEL_TYPE_AI_HOME }
    public fun channel_type_ai_peer(): u8 { CHANNEL_TYPE_AI_PEER }

    /// Member structure to store member information
    struct Member has store, drop {
        address: address,
        joined_at: u64,    // Now in milliseconds
        last_active: u64,  // Now in milliseconds
    }

    /// Channel structure for chat functionality
    /// Note on privacy:
    /// - All messages in the channel are visible on-chain, regardless of channel privacy settings
    /// - is_public: true  => Anyone can join the channel automatically when sending their first message
    /// - is_public: false => Only admins can add members, and only members can send messages
    struct Channel has key {
        title: String,
        creator: address,        // For AI_HOME: AI agent address, For AI_PEER: user address
        members: Table<address, Member>,  // Changed from vector to Table
        messages: Table<u64, ObjectID>,  // Changed from Table<u64, Message> to Table<u64, ObjectID>
        message_counter: u64,
        created_at: u64,    // Now in milliseconds
        last_active: u64,   // Now in milliseconds
        status: u8,
        channel_type: u8,  // AI_HOME or AI_PEER
    }

    /// Initialize a new AI home channel
    public fun create_ai_home_channel(
        agent: &mut Object<Agent>,
    ): ObjectID {
        let agent_address = agent::get_agent_address(agent);
        let channel_id = object::account_named_object_id<Channel>(agent_address);
        assert!(!object::exists_object(channel_id), ErrorChannelAlreadyExists);
        
        let agent_username = *agent::get_agent_username(agent);
        let title = string::utf8(b"Home channel for ");
        string::append(&mut title, agent_username);
        let creator = agent_address;
        let now = timestamp::now_milliseconds();
        
        let channel = Channel {
            title,
            creator,  // AI agent's address
            members: table::new(),
            messages: table::new(),
            message_counter: 0,
            created_at: now,
            last_active: now,
            status: CHANNEL_STATUS_ACTIVE,
            channel_type: CHANNEL_TYPE_AI_HOME,
        };

        // Add AI as member
        add_member_internal(&mut channel, creator, now);
        // Every AI can only have one AI_HOME channel
        let channel_obj = object::new_account_named_object(creator, channel);
        let channel_id = object::id(&channel_obj);
        object::to_shared(channel_obj);
        channel_id
    }

    public fun get_agent_home_channel_id(agent: &Object<Agent>): ObjectID {
        let agent_address = agent::get_agent_address(agent);
        object::account_named_object_id<Channel>(agent_address)
    }

    public(friend) fun create_ai_peer_channel_internal(user_address: address, agent: &mut Object<Agent>): ObjectID {
        let agent_address = agent::get_agent_address(agent);
        let creator = agent_address;
        let title = string::utf8(b"Direct message with ");
        string::append(&mut title, *agent::get_agent_username(agent));
        let now = timestamp::now_milliseconds();
        
        let channel = Channel {
            title,
            creator,  // User's address
            members: table::new(),
            messages: table::new(),
            message_counter: 0,
            created_at: now,
            last_active: now,
            status: CHANNEL_STATUS_ACTIVE,
            channel_type: CHANNEL_TYPE_AI_PEER,
        };

        // Add both user and AI as members
        add_member_internal(&mut channel, creator, now);
        add_member_internal(&mut channel, user_address, now);
        let id = generate_peer_channel_id(agent_address, user_address);
        let channel_obj = object::new_with_id(id, channel);
        let channel_id = object::id(&channel_obj);
        object::to_shared(channel_obj);
        channel_id
    }

    /// Initialize a new user to AI direct message channel
    public fun create_ai_peer_channel(
        user_account: &signer,
        agent: &mut Object<Agent>,
    ): ObjectID {
        let user_address = signer::address_of(user_account);
        create_ai_peer_channel_internal(user_address, agent)
    }

    public entry fun create_ai_peer_channel_entry(
        user_account: &signer,
        agent: &mut Object<Agent>,
    ) {
        let _id = create_ai_peer_channel(user_account, agent);
    }

    public fun get_ai_peer_channel_id(agent: &Object<Agent>, user_address: address): Option<ObjectID> {
        let id = generate_peer_channel_id(agent::get_agent_address(agent), user_address);
        let channel_obj_id = object::custom_object_id<address, Channel>(id);
        if (object::exists_object(channel_obj_id)) {
            option::some(channel_obj_id)
        } else {
            option::none()
        }
    }

    fun generate_ai_peer_channel_id(agent: &Object<Agent>, user_address: address): ObjectID {
        let id = generate_peer_channel_id(agent::get_agent_address(agent), user_address);
        object::custom_object_id<address, Channel>(id)
    }

    //TODO remove this function
    public fun get_peer_channel_id(agent_address: address, user_address: address): ObjectID {
        let id = generate_peer_channel_id(agent_address, user_address);
        object::custom_object_id<address, Channel>(id)
    }

    fun generate_peer_channel_id(agent_address: address, user_address: address): address {
        let bytes = vector::empty<u8>();
        vector::append(&mut bytes, bcs::to_bytes(&agent_address));
        vector::append(&mut bytes, bcs::to_bytes(&user_address));
        let hash = hash::sha3_256(bytes);
        address::from_bytes(hash)
    }

    /// Add message to channel - use message_counter as id
    fun add_message(channel_obj: &mut Object<Channel>, sender: address, content: String, message_type: u8, mentions: vector<address>) {
        let channel_id = object::id(channel_obj);
        let channel = object::borrow_mut(channel_obj);
        let msg_id = message::new_message_object(
            channel.message_counter,
            channel_id,
            sender,
            content,
            message_type,
            mentions
        );
        table::add(&mut channel.messages, channel.message_counter, msg_id);
        channel.message_counter = channel.message_counter + 1;
    }

    /// Send a message and trigger AI response if needed
    public fun send_message(
        account: &signer,
        channel_obj: &mut Object<Channel>,
        content: String,
        mentions: vector<address>
    ) {
        vector::for_each(mentions, |addr| {
            assert!(is_channel_member(channel_obj, addr), ErrorMentionedUserNotMember);
        });
        let sender = signer::address_of(account);
        let now = timestamp::now_milliseconds();
        let channel = object::borrow_mut(channel_obj);

        // Check if sender is a member
        assert!(table::contains(&channel.members, sender), ErrorNotMember);
        assert!(channel.status == CHANNEL_STATUS_ACTIVE, ErrorChannelInactive);
        
        // Update member's last active time
        let member = table::borrow_mut(&mut channel.members, sender);
        member.last_active = now;
        channel.last_active = now;

        add_message(channel_obj, sender, content, message::type_user(), mentions);
    }

    /// Add AI response to the channel
    public(friend) fun add_ai_response(
        channel_obj: &mut Object<Channel>, 
        response_message: String, 
        ai_agent_address: address
    ){
        add_message(channel_obj, ai_agent_address, response_message, message::type_ai(), vector::empty());
    }

    public(friend) fun send_ai_direct_message(
        agent: &mut Object<Agent>,
        user_address: address,
        content: String,
    ){
        let channel_id = generate_ai_peer_channel_id(agent, user_address);
        if (!object::exists_object(channel_id)) {
            create_ai_peer_channel_internal(user_address, agent);            
        };
        let channel_obj = object::borrow_mut_object_shared<Channel>(channel_id);
        add_message(channel_obj, agent::get_agent_address(agent), content, message::type_ai(), vector::empty());
    }

    /// Get all messages in the channel
    public fun get_messages(channel: &Object<Channel>): vector<Message> {
        let channel_ref = object::borrow(channel);
        let messages = vector::empty<Message>();
        let i = 0;
        while (i < channel_ref.message_counter) {
            let msg_id = table::borrow(&channel_ref.messages, i);
            let msg_obj = object::borrow_object<Message>(*msg_id);
            vector::push_back(&mut messages, *object::borrow(msg_obj));
            i = i + 1;
        };
        messages
    }

    /// Get messages with pagination
    public fun get_messages_paginated(
        channel: &Object<Channel>, 
        start_index: u64,
        limit: u64
    ): vector<Message> {
        let channel_ref = object::borrow(channel);
        let messages = vector::empty<Message>();
        
        // Check if start_index is valid
        if (start_index >= channel_ref.message_counter) {
            return messages
        };
        
        // Calculate end index
        let end_index = if (start_index + limit > channel_ref.message_counter) {
            channel_ref.message_counter
        } else {
            start_index + limit
        };
        
        let i = start_index;
        while (i < end_index) {
            let msg_id = table::borrow(&channel_ref.messages, i);
            let msg_obj = object::borrow_object<Message>(*msg_id);
            vector::push_back(&mut messages, *object::borrow(msg_obj));
            i = i + 1;
        };
        messages
    }

    /// Get total message count in the channel
    public fun get_message_count(channel: &Object<Channel>): u64 {
        let channel_ref = object::borrow(channel);
        channel_ref.message_counter
    }

    /// Get last N messages from the channel
    public fun get_last_messages(channel_obj: &Object<Channel>, limit: u64): vector<Message> {
        let channel = object::borrow(channel_obj);
        let messages = vector::empty();
        let start = if (channel.message_counter > limit) {
            channel.message_counter - limit
        } else {
            0
        };
        
        let i = start;
        while (i < channel.message_counter) {
            let msg_id = table::borrow(&channel.messages, i);
            let msg_obj = object::borrow_object<Message>(*msg_id);
            vector::push_back(&mut messages, *object::borrow(msg_obj));
            i = i + 1;
        };
        messages
    }

    /// Check if address is member of channel
    public fun is_member(channel: &Object<Channel>, addr: address): bool {
        let channel_ref = object::borrow(channel);
        table::contains(&channel_ref.members, addr)
    }

    /// Get member info
    public fun get_member_info(channel: &Object<Channel>, addr: address): (u64, u64) {
        let channel_ref = object::borrow(channel);
        assert!(table::contains(&channel_ref.members, addr), ErrorNotAuthorized);
        let member = table::borrow(&channel_ref.members, addr);
        (
            member.joined_at,
            member.last_active
        )
    }

    //TODO remove this function
    /// Send a message and trigger AI response if needed
    public entry fun send_message_entry(
        _caller: &signer,
        _channel_obj: &mut Object<Channel>,
        _content: String,
        _mentions: vector<address>
    ) {
        abort ErrorDeprecatedFunction
    }

    /// Update channel title
    public(friend) fun update_channel_title(channel_obj: &mut Channel, new_title: String) {
        channel_obj.title = new_title;
    }

     /// Add member to channel
    fun add_member_internal(
        channel: &mut Channel, 
        member_addr: address,
        now: u64,
    ) {
        if (!table::contains(&channel.members, member_addr)) {
            let member = Member {
                address: member_addr,
                joined_at: now,
                last_active: now,
            };
            table::add(&mut channel.members, member_addr, member);
        }
    }

    /// Join channel for AI_HOME type
    public fun join_channel(
        account: &signer,
        channel_obj: &mut Object<Channel>,
    ) {
        let sender = signer::address_of(account);
        let channel = object::borrow_mut(channel_obj);
        
        // Only AI_HOME channels can be joined directly
        assert!(channel.channel_type == CHANNEL_TYPE_AI_HOME, ErrorNotAuthorized);
        
        let now = timestamp::now_milliseconds();
        add_member_internal(channel, sender, now);
    }

    /// Entry function for joining a channel
    public entry fun join_channel_entry(
        account: &signer,
        channel_obj: &mut Object<Channel>,
    ) {
        join_channel(account, channel_obj);
    }

    // ==================== Getters ====================

    public fun get_channel_title(channel: &Object<Channel>): &String {
        let channel_ref = object::borrow(channel);
        &channel_ref.title
    }

    public fun get_channel_creator(channel: &Object<Channel>): address {
        let channel_ref = object::borrow(channel);
        channel_ref.creator
    }

    public fun get_channel_created_at(channel: &Object<Channel>): u64 {
        let channel_ref = object::borrow(channel);
        channel_ref.created_at
    }

    public fun get_channel_last_active(channel: &Object<Channel>): u64 {
        let channel_ref = object::borrow(channel);
        channel_ref.last_active
    }

    public fun get_channel_status(channel: &Object<Channel>): u8 {
        let channel_ref = object::borrow(channel);
        channel_ref.status
    }

    public fun get_channel_type(channel: &Object<Channel>): u8 {
        let channel_ref = object::borrow(channel);
        channel_ref.channel_type
    }

    public fun is_channel_member(channel: &Object<Channel>, addr: address): bool {
        let channel_ref = object::borrow(channel);
        table::contains(&channel_ref.members, addr)
    }

    // =================== Test helpers ===================

    #[test_only]
    /// Test helper function to delete a channel, only available in test mode
    fun force_delete_channel(channel: Object<Channel>) {
        let Channel { 
            title: _,
            creator: _,
            members,
            messages,
            message_counter: _,
            created_at: _,
            last_active: _,
            status: _,
            channel_type: _,
        } = object::remove(channel);
        
        table::drop(members);
        table::drop(messages);
    }

    #[test_only]
    /// Public test helper function to delete a channel
    public fun delete_channel_for_testing(channel_id: ObjectID) {
        let channel = object::take_object_extend<Channel>(channel_id);
        force_delete_channel(channel);
    }

}