// Copyright (c) RoochNetwork
// SPDX-License-Identifier: Apache-2.0

module nuwa_framework::agent_cap {

    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::event;
    
    const ErrorAgentCapNotFound: u64 = 1;
    const ErrorCallerHasNoMemoryCap: u64 = 2;
    const ErrorCallerHasNoMemoryCreateCap: u64 = 3;
    const ErrorCallerHasNoMemoryDeleteCap: u64 = 4;
    const ErrorCallerHasNoMemoryUpdateCap: u64 = 5;

    friend nuwa_framework::agent;

    struct AgentCap has store, key {
        agent_obj_id: ObjectID,
    }

    //TODO Remove this cap
    /// A cap for managing the memory of an agent.
    struct MemoryCap has store, key {
        agent_obj_id: ObjectID,
        create: bool,
        remove: bool,
        update: bool,
    }

    struct AgentCapDestroyedEvent has copy, drop, store {
        agent_obj_id: ObjectID,
    }

    struct MemoryCapDestroyedEvent has copy, drop, store {
        agent_obj_id: ObjectID,
        create: bool,
        remove: bool,
        update: bool,
    }

    public(friend) fun new_agent_cap(agent_obj_id: ObjectID) : Object<AgentCap> {
        let cap = AgentCap {
            agent_obj_id,
        };
        object::new(cap)
    }


    public(friend) fun destroy_agent_cap(cap: Object<AgentCap>) {
        let agent_cap = object::remove(cap);
        let AgentCap { agent_obj_id } = agent_cap;
        event::emit(AgentCapDestroyedEvent { agent_obj_id });
    }

    public entry fun destroy_memory_cap(_cap: Object<MemoryCap>) {
        abort 0
    }

    public fun borrow_mut_agent_cap(caller: &signer, agent_obj_id: ObjectID) : &mut Object<AgentCap> {
        assert!(object::exists_object(agent_obj_id), ErrorAgentCapNotFound);
        object::borrow_mut_object<AgentCap>(caller, agent_obj_id)
    }

    public fun check_agent_cap(_cap: &mut Object<AgentCap>) : ObjectID {
        abort 0
    }

    public fun check_memory_create_cap(_cap: &mut Object<MemoryCap>) : ObjectID {
        abort 0
    }

    public fun check_memory_remove_cap(_cap: &mut Object<MemoryCap>) : ObjectID {
        abort 0
    }

    public fun check_memory_update_cap(_cap: &mut Object<MemoryCap>) : ObjectID {
        abort 0
    }

    public fun get_agent_obj_id(cap: &Object<AgentCap>) : ObjectID {
        let cap = object::borrow(cap);
        cap.agent_obj_id
    }

    #[test_only]
    public fun issue_agent_cap_for_test(agent_obj_id: ObjectID) : Object<AgentCap> {
        new_agent_cap(agent_obj_id)
    }


}
