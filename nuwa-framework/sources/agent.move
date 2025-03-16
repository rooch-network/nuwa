module nuwa_framework::agent {
    use std::string::{Self, String};
    use std::option::{Option};
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::account::{Self, Account};
    use moveos_std::signer;
    use moveos_std::timestamp;

    use rooch_framework::coin::{Self, Coin};
    use rooch_framework::account_coin_store;
    use rooch_framework::gas_coin::RGas;

    use nuwa_framework::agent_cap::{Self, AgentCap};
    use nuwa_framework::memory::{Self, MemoryStore};
    use nuwa_framework::agent_info;
    use nuwa_framework::task_spec::{Self, TaskSpecifications, TaskSpecification};
    use nuwa_framework::config;
    use nuwa_framework::name_registry;
    
    friend nuwa_framework::memory_action;
    friend nuwa_framework::transfer_action;
    friend nuwa_framework::action_dispatcher;
    friend nuwa_framework::agent_runner;

    const TASK_SPEC_PROPERTY_NAME: vector<u8> = b"task_specs";

    const ErrorDeprecatedFunction: u64 = 1;
    const ErrorInvalidInitialFee: u64 = 2;
    const ErrorUsernameAlreadyRegistered: u64 = 3;

    const AGENT_STATUS_DRAFT: u8 = 0;
    const AGENT_STATUS_ACTIVE: u8 = 1;
    const AGENT_STATUS_INACTIVE: u8 = 2;

    /// OnChain AI Agent
    struct Agent has key {
        /// The address of the agent
        agent_address: address,
        /// The name of the agent
        name: String,
        /// The unique identifier for the agent
        username: String,
        /// The avatar of the agent
        avatar: String,
        /// One-line description of the agent
        description: String,
        /// Instructions for the agent when the agent is running
        instructions: String,
        // The Agent account, every agent has its own account
        //TODO design a AccountCap to manage the agent account
        account: Object<Account>,
        last_active_timestamp: u64,
        memory_store: MemoryStore,
        model_provider: String,
        status: u8,
    }

    const AI_GPT4O_MODEL: vector<u8> = b"gpt-4o";

    public fun create_agent_with_initial_fee(name: String, username: String, avatar: String, description: String, instructions: String, initial_fee: Coin<RGas>) : Object<AgentCap> {
        assert!(name_registry::is_username_available(&username), ErrorUsernameAlreadyRegistered);
        let initial_fee_amount = coin::value(&initial_fee);
        assert!(initial_fee_amount >= config::get_ai_agent_initial_fee(), ErrorInvalidInitialFee);
        let agent_account = account::create_account();
        let agent_signer = account::create_signer_with_account(&mut agent_account);
        //TODO provide a function to get address from account
        let agent_address = signer::address_of(&agent_signer);
        name_registry::register_username_internal(agent_address, username);
        let agent = Agent {
            agent_address,
            name,
            username,
            avatar,
            description,
            instructions,
            account: agent_account,
            last_active_timestamp: timestamp::now_milliseconds(),
            memory_store: memory::new_memory_store(),
            model_provider: string::utf8(AI_GPT4O_MODEL),
            status: AGENT_STATUS_DRAFT,
        };
        account_coin_store::deposit<RGas>(agent_address, initial_fee);
        // Every account only has one agent
        let agent_obj = object::new_account_named_object(agent_address, agent);
        let agent_obj_id = object::id(&agent_obj);
        object::to_shared(agent_obj);
        let agent_cap = agent_cap::new_agent_cap(agent_obj_id);
        agent_cap
    } 

    public fun borrow_mut_agent(agent_obj_id: ObjectID): &mut Object<Agent> {
        object::borrow_mut_object_shared(agent_obj_id)
    }

    public fun borrow_mut_agent_by_address(agent_addr: address): &mut Object<Agent> {
        let agent_obj_id = object::account_named_object_id<Agent>(agent_addr);
        object::borrow_mut_object_shared(agent_obj_id)
    }

    /// Get mutable reference to agent's memory store
    public(friend) fun borrow_mut_memory_store(agent: &mut Object<Agent>): &mut memory::MemoryStore {
        let agent_ref = object::borrow_mut(agent);
        &mut agent_ref.memory_store
    }

    /// Get immutable reference to agent's memory store
    public(friend) fun borrow_memory_store(agent: &Object<Agent>): &memory::MemoryStore {
        let agent_ref = object::borrow(agent);
        &agent_ref.memory_store
    }

    public fun get_agent_info(agent: &Object<Agent>): agent_info::AgentInfo {
        let agent_ref = object::borrow(agent);
        agent_info::new_agent_info(
            object::id(agent),
            agent_ref.agent_address,
            agent_ref.name,
            agent_ref.username,
            agent_ref.avatar,
            agent_ref.description,
            agent_ref.instructions,
            agent_ref.model_provider,
            agent_ref.status,
        )
    }

    public fun get_agent_info_by_address(agent_addr: address): agent_info::AgentInfo {
        let agent_obj_id = object::account_named_object_id<Agent>(agent_addr);
        let agent_obj = object::borrow_object<Agent>(agent_obj_id);
        get_agent_info(agent_obj)
    }

    /// Get agent's address
    public fun get_agent_address(agent: &Object<Agent>): address {
        let agent_ref = object::borrow(agent);
        agent_ref.agent_address
    }

    public fun get_agent_username(agent: &Object<Agent>): &String {
        let agent_ref = object::borrow(agent);
        &agent_ref.username
    }

    public fun get_agent_model_provider(agent: &Object<Agent>): &String {
        let agent_ref = object::borrow(agent);
        &agent_ref.model_provider
    }

    public entry fun destroy_agent_cap(cap: Object<AgentCap>) {
        //TODO record a variable to show the agent cap is destroyed
        agent_cap::destroy_agent_cap(cap);
    }

    public fun is_agent_account(addr: address): bool {
        let agent_obj_id = object::account_named_object_id<Agent>(addr);
        object::exists_object(agent_obj_id)
    }

    /// Get the agent's own personal memories
    public fun get_agent_self_memories(agent_obj_id: ObjectID): vector<memory::Memory> {
        let agent_obj = object::borrow_object<Agent>(agent_obj_id);
        let agent_ref = object::borrow(agent_obj);
        let memory_store = &agent_ref.memory_store;
        let agent_address = agent_ref.agent_address;
        
        // Get the agent's own memories (self-reflections, personal thoughts)
        memory::get_all_memories(memory_store, agent_address, true)
    }

    /// Get memories that an agent has about a specific user
    public fun get_agent_memories_about_user(agent_obj_id: ObjectID, user_address: address): vector<memory::Memory> {
        let agent_obj = object::borrow_object<Agent>(agent_obj_id);
        let agent_ref = object::borrow(agent_obj);
        let memory_store = &agent_ref.memory_store;
        
        // Get all memories about this specific user
        memory::get_all_memories(memory_store, user_address, true)
    }

    // ============== Internal functions ==============

    public(friend) fun create_agent_signer(agent: &mut Object<Agent>): signer {
        let agent_ref = object::borrow_mut(agent);
        account::create_signer_with_account(&mut agent_ref.account)
    }

    public(friend) fun update_last_active_timestamp(agent: &mut Object<Agent>) {
        let agent_ref = object::borrow_mut(agent);
        agent_ref.last_active_timestamp = timestamp::now_milliseconds();
    }

    //================= Public agent update functions ==============

    /// Update agent's name
    /// Only allowed for users who possess the AgentCap for this agent
    public entry fun update_agent_name(
        cap: &mut Object<AgentCap>,
        new_name: String,
    ) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        let agent = object::borrow_mut(agent_obj);
        agent.name = new_name;
    }

    /// Update agent's description
    /// Only allowed for users who possess the AgentCap for this agent
    public entry fun update_agent_description(
        cap: &mut Object<AgentCap>,
        new_description: String,
    ) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        let agent = object::borrow_mut(agent_obj);
        agent.description = new_description;
    }

    /// Update agent's instructions
    /// Only allowed for users who possess the AgentCap for this agent
    public entry fun update_agent_instructions(
        cap: &mut Object<AgentCap>,
        new_instructions: String,
    ) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        let agent = object::borrow_mut(agent_obj);
        agent.instructions = new_instructions;
    }

    public entry fun activate_agent(cap: &mut Object<AgentCap>) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        let agent = object::borrow_mut(agent_obj);
        agent.status = AGENT_STATUS_ACTIVE;
    }

    public entry fun deactivate_agent(cap: &mut Object<AgentCap>) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        let agent = object::borrow_mut(agent_obj);
        agent.status = AGENT_STATUS_INACTIVE;
    }

    //================= Task specs ==============

    public fun get_agent_task_specs_json(agent_obj: &Object<Agent>): String {
        let task_specs = get_agent_task_specs(agent_obj);
        task_spec::task_specs_to_json(&task_specs)
    }

    public fun get_agent_task_specs(agent_obj: &Object<Agent>): TaskSpecifications {
        if (object::contains_field(agent_obj, TASK_SPEC_PROPERTY_NAME)) {
            let task_specs = *object::borrow_field(agent_obj, TASK_SPEC_PROPERTY_NAME);
            task_specs
        } else {
            task_spec::empty_task_specifications()
        }
    }

    public fun get_agent_task_spec(agent_obj: &Object<Agent>, task_name: String): Option<TaskSpecification> {
        let task_specs = get_agent_task_specs(agent_obj);
        task_spec::get_task_spec_by_name(&task_specs, task_name)
    }

    public fun update_agent_task_specs(
        cap: &mut Object<AgentCap>,
        task_specs: TaskSpecifications,
    ) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        task_spec::validate_task_specifications(&task_specs);
        object::upsert_field(agent_obj, TASK_SPEC_PROPERTY_NAME, task_specs);
    }

    public entry fun update_agent_task_specs_entry(
        cap: &mut Object<AgentCap>,
        task_specs_json: String,
    ) {
        let task_specs = task_spec::task_specs_from_json(task_specs_json);
        update_agent_task_specs(cap, task_specs);
    }


    #[test_only]
    /// Create a test agent for unit testing
    public fun create_default_test_agent(): (&mut Object<Agent>, Object<AgentCap>) {
        use std::string;

        create_test_agent(
            string::utf8(b"Test Assistant"),
            string::utf8(b"test_assistant"),
            string::utf8(b"https://test/avator.png"),
            string::utf8(b"A helpful test assistant"),
            string::utf8(b"General knowledge")
        )
    }

    #[test_only]
    public fun create_test_agent(name: String, username: String, avatar: String, description: String, instructions: String): (&mut Object<Agent>, Object<AgentCap>) {
        use moveos_std::object;
        use rooch_framework::gas_coin;
        
        let initial_fee = gas_coin::mint_for_test(config::get_ai_agent_initial_fee());
        let agent_cap = create_agent_with_initial_fee(name, username, avatar, description, instructions, initial_fee);
        
        let agent_obj_id = agent_cap::get_agent_obj_id(&agent_cap);
        let agent_obj = object::borrow_mut_object_shared<Agent>(agent_obj_id);
        (agent_obj, agent_cap)
    }

    #[test]
    fun test_create_default_test_agent() {
        nuwa_framework::genesis::init_for_test();
        let (agent, agent_cap) = create_default_test_agent();
        assert!(object::is_shared(agent), 1);
        agent_cap::destroy_agent_cap(agent_cap);
    }

}