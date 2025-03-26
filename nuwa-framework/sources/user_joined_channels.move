module nuwa_framework::user_joined_channels {
    use std::vector;
    use moveos_std::object::{Self, Object, ObjectID};
    

    friend nuwa_framework::channel;

    const MAX_JOINED_CHANNELS: u64 = 20;

    const ErrorOverMaxJoinedChannels: u64 = 1;

    struct UserChannelStore has key {
        joined_channel_ids: vector<ObjectID>,
    }

    struct JoinedChannel has store, copy, drop {
        channel_id: ObjectID,
        agent_id: ObjectID,
        joined_at: u64,
        active_at: u64,
    }

    fun borrow_mut_user_channel_store(user_address: address): &mut Object<UserChannelStore> {
        let user_channel_store_object_id = object::account_named_object_id<UserChannelStore>(user_address);
        if (!object::exists_object(user_channel_store_object_id)) {
            let user_channel_store_obj = object::new_account_named_object(user_address, UserChannelStore{
                joined_channel_ids: vector[]
            });
            object::transfer_extend(user_channel_store_obj, user_address);
        };
        object::borrow_mut_object_extend<UserChannelStore>(user_channel_store_object_id)
    }

    public(friend) fun join_channel(user_address: address, channel_id: ObjectID, agent_id: ObjectID, now: u64){
        let user_channel_store_obj = borrow_mut_user_channel_store(user_address);
        object::add_field(user_channel_store_obj, channel_id, JoinedChannel{
            channel_id,
            agent_id,
            joined_at: now,
            active_at: now,
        });
        let user_channel_store = object::borrow_mut(user_channel_store_obj);
        assert!(vector::length(&user_channel_store.joined_channel_ids) < MAX_JOINED_CHANNELS, ErrorOverMaxJoinedChannels);
        vector::push_back(&mut user_channel_store.joined_channel_ids, channel_id);
    }

    public(friend) fun leave_channel(user_address: address, channel_id: ObjectID){
        let user_channel_store_obj = borrow_mut_user_channel_store(user_address);
        if (!object::contains_field(user_channel_store_obj, channel_id)) {
            return
        };
        let JoinedChannel{channel_id: _, agent_id: _, joined_at: _, active_at: _} = object::remove_field(user_channel_store_obj, channel_id);
        let user_channel_store = object::borrow_mut(user_channel_store_obj);
        vector::remove_value(&mut user_channel_store.joined_channel_ids, &channel_id);
    }

    public(friend) fun active_in_channel(user_address: address, channel_id: ObjectID, now: u64){
        let user_channel_store_obj = borrow_mut_user_channel_store(user_address);
        if (!object::contains_field(user_channel_store_obj, channel_id)) {
            return
        };
        let joined_channel: &mut JoinedChannel = object::borrow_mut_field(user_channel_store_obj, channel_id);
        joined_channel.active_at = now;
    }

    public fun get_joined_channels(user_address: address): vector<JoinedChannel> {
        let user_channel_store_object_id = object::account_named_object_id<UserChannelStore>(user_address);
        if (!object::exists_object(user_channel_store_object_id)) {
            return vector[]
        };
        let user_channel_store_obj = object::borrow_object<UserChannelStore>(user_channel_store_object_id);
        let joined_channel_ids = object::borrow(user_channel_store_obj).joined_channel_ids;
        let joined_channels = vector[];
        vector::for_each(joined_channel_ids, |channel_id| {
            let joined_channel: &JoinedChannel = object::borrow_field(user_channel_store_obj, channel_id);
            vector::push_back(&mut joined_channels, *joined_channel);
        });
        joined_channels
    }

    #[test_only]
    use moveos_std::timestamp;

    #[test]
    fun test_join_and_leave_channel() {

        // Mock channel and agent IDs
        let channel_id = object::derive_object_id_for_test();
        let agent_id = object::derive_object_id_for_test();
        let test_addr = @0x42;
        let now = timestamp::now_milliseconds();
        // Test joining channel
        join_channel(test_addr, channel_id, agent_id, now);
        let joined_channels = get_joined_channels(test_addr);
        assert!(vector::length(&joined_channels) == 1, 1);
        let joined_channel = vector::borrow(&joined_channels, 0);
        assert!(joined_channel.channel_id == channel_id, 2);
        assert!(joined_channel.agent_id == agent_id, 3);

        // Test leaving channel
        leave_channel(test_addr, channel_id);
        joined_channels = get_joined_channels(test_addr);
        assert!(vector::length(&joined_channels) == 0, 4);
    }

    #[test]
    fun test_active_in_channel() {

        // Mock channel and agent IDs
        let channel_id = object::derive_object_id_for_test();
        let agent_id = object::derive_object_id_for_test();
        let test_addr = @0x42;
        let now = timestamp::now_milliseconds();
        // Join channel
        join_channel(test_addr, channel_id, agent_id, now);
        let joined_channels = get_joined_channels(test_addr);
        let initial_active_at = vector::borrow(&joined_channels, 0).active_at;
        // Test active in channel
        timestamp::fast_forward_milliseconds_for_test(1000);
        let now = timestamp::now_milliseconds();
        active_in_channel(test_addr, channel_id, now);
        joined_channels = get_joined_channels(test_addr);
        let updated_active_at = vector::borrow(&joined_channels, 0).active_at;
        assert!(updated_active_at > initial_active_at, 1);
    }

    #[test]
    #[expected_failure(abort_code = ErrorOverMaxJoinedChannels)]
    fun test_max_joined_channels() {
        let test_addr = @0x42;
        let now = timestamp::now_milliseconds();
        // Try to join more than MAX_JOINED_CHANNELS channels
        let i = 0;
        while (i <= MAX_JOINED_CHANNELS) {
            let channel_id = object::derive_object_id_for_test();
            let agent_id = object::derive_object_id_for_test();
            join_channel(test_addr, channel_id, agent_id, now);
            i = i + 1;
        };
    }

    #[test]
    fun test_leave_nonexistent_channel() {
        // Mock channel and agent IDs
        let channel_id = object::derive_object_id_for_test();
        let test_addr = @0x42;

        // Try to leave a channel that hasn't been joined
        leave_channel(test_addr, channel_id);
        let joined_channels = get_joined_channels(test_addr);
        assert!(vector::length(&joined_channels) == 0, 1);
    }

    #[test]
    fun test_active_in_nonexistent_channel() {
        // Mock channel and agent IDs
        let channel_id = object::derive_object_id_for_test();
        let test_addr = @0x42;
        let now = timestamp::now_milliseconds();
        // Try to mark activity in a channel that hasn't been joined
        active_in_channel(test_addr, channel_id, now);
        let joined_channels = get_joined_channels(test_addr);
        assert!(vector::length(&joined_channels) == 0, 1);
    }
}