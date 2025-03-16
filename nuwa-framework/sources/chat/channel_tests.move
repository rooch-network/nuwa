#[test_only]
module nuwa_framework::channel_tests {
    use std::string;
    use std::signer;
    use std::vector;
    use moveos_std::account;
    use moveos_std::timestamp;
    use moveos_std::object;
    use nuwa_framework::channel;
    use nuwa_framework::message;
    use nuwa_framework::agent;

    // Test helpers
    #[test_only]
    fun create_account_with_address(addr: address): signer {
        account::create_signer_for_testing(addr)
    }

    #[test]
    fun test_create_ai_home_channel() {
        nuwa_framework::genesis::init_for_test();
        let (agent, cap) = agent::create_test_agent();
        let ai_account = agent::get_agent_address(agent);
        timestamp::update_global_time_for_test(1000);

        let channel_id = channel::create_ai_home_channel(agent);
        let channel = object::borrow_object(channel_id);
        
        // Verify AI is a member
        assert!(channel::is_member(channel, ai_account), 0);
        
        // Try joining as a user
        let user = create_account_with_address(@0x43);
        let channel = object::borrow_mut_object_shared(channel_id);
        channel::join_channel(&user, channel);
        
        // Verify user is now a member
        let channel = object::borrow_object(channel_id);
        assert!(channel::is_member(channel, signer::address_of(&user)), 1);

        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_create_ai_peer_channel() {
        nuwa_framework::genesis::init_for_test();
        let user = create_account_with_address(@0x42);
        let (agent, cap) = agent::create_test_agent();
        let ai_address = agent::get_agent_address(agent);
        timestamp::update_global_time_for_test(1000);

        let channel_id = channel::create_ai_peer_channel(&user, agent);
        let channel = object::borrow_object(channel_id);
        
        // Verify both user and AI are members
        assert!(channel::is_member(channel, signer::address_of(&user)), 0);
        assert!(channel::is_member(channel, ai_address), 1);

        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_message_sending() {
        nuwa_framework::genesis::init_for_test();
        let user = create_account_with_address(@0x42);
        let (agent, cap) = agent::create_test_agent();
         
        // Create peer channel
        let channel_id = channel::create_ai_peer_channel(
            &user,
            agent
        );
        
        // Send message
        let channel = object::borrow_mut_object_shared(channel_id);
        let msg_content = string::utf8(b"Hello AI!");
        let mentions = vector::empty();
        let (_, _) = channel::send_message(&user, channel, msg_content, mentions, 0);
        
        // Verify message
        let channel = object::borrow_object(channel_id);
        let message_ids = channel::get_messages(channel);
        assert!(vector::length(&message_ids) == 1, 0);
        
        let msg_id = vector::borrow(&message_ids, 0);
        let msg_obj = object::borrow_object<message::Message>(*msg_id);
        let msg = object::borrow(msg_obj);
        assert!(message::get_content(msg) == msg_content, 1);
        assert!(message::get_sender(msg) == signer::address_of(&user), 2);
        assert!(message::get_type(msg) == message::type_normal(), 3);

        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }

    #[test]
    #[expected_failure(abort_code = channel::ErrorNotMember)]
    fun test_unauthorized_message() {
        nuwa_framework::genesis::init_for_test();
        let user1 = create_account_with_address(@0x42);
        let user2 = create_account_with_address(@0x44);
        let (agent, cap) = agent::create_test_agent();
        
        let channel_id = channel::create_ai_peer_channel(
            &user1,
            agent
        );
        
        // Try sending message from unauthorized user
        let channel = object::borrow_mut_object_shared(channel_id);
        
        let mentions = vector::empty();
        let (_, _) = channel::send_message(&user2, channel, string::utf8(b"Unauthorized message"), mentions, 0);

        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_message_pagination() {
        nuwa_framework::genesis::init_for_test();
        let user = create_account_with_address(@0x42);
        let (agent, cap) = agent::create_test_agent();
         
        let channel_id = channel::create_ai_peer_channel(
            &user,
            agent
        );
        
        // Send multiple messages
        let channel = object::borrow_mut_object_shared(channel_id);
        let i = 0;
        let mentions = vector::empty();
        while (i < 5) {
            let (_, _) = channel::send_message(&user, channel, string::utf8(b"Message"), mentions, 0);
            i = i + 1;
        };
        
        // Test pagination
        let channel = object::borrow_object(channel_id);
        let messages = channel::get_messages_paginated(channel, 1, 2);
        assert!(vector::length(&messages) == 2, 0);
        
        // Test last messages
        let messages = channel::get_last_messages(channel, 3);
        assert!(vector::length(&messages) == 3, 1);

        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_member_info() {
        nuwa_framework::genesis::init_for_test();
        let user = create_account_with_address(@0x42);
        let (agent, cap) = agent::create_test_agent();
        timestamp::update_global_time_for_test(1000);
        
        let channel_id = channel::create_ai_peer_channel(
            &user,
            agent
        );
        
        let channel = object::borrow_object(channel_id);
        let (joined_at, last_active) = channel::get_member_info(channel, signer::address_of(&user));
        assert!(joined_at == 1000, 0);
        assert!(last_active == 1000, 1);

        channel::delete_channel_for_testing(channel_id);
        agent::destroy_agent_cap(cap);
    }
}