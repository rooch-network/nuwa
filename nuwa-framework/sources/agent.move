module nuwa_framework::agent {
    use std::string::{Self, String};
    use std::option::{Option};
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::account::{Self, Account};
    use moveos_std::signer;
    use moveos_std::timestamp;
    use nuwa_framework::character::{Self, Character};
    use nuwa_framework::agent_cap::{Self, AgentCap};
    use nuwa_framework::memory::{Self, MemoryStore};
    use nuwa_framework::agent_input::{AgentInput};
    use nuwa_framework::agent_state::{AgentStates};
    use nuwa_framework::agent_info;
    use nuwa_framework::task_spec::{Self, TaskSpecifications, TaskSpecification};
    friend nuwa_framework::memory_action;
    friend nuwa_framework::transfer_action;
    friend nuwa_framework::action_dispatcher;
    friend nuwa_framework::agent_runner;

    const TASK_SPEC_PROPERTY_NAME: vector<u8> = b"task_specs";

    const ErrorDeprecatedFunction: u64 = 1;

    //TODO use a new agent_runner module to handle agent running, this module only contains agent data structure
    /// Agent represents a running instance of a Character
    struct Agent has key {
        agent_address: address,
        character: Object<Character>,
        // The Agent account, every agent has its own account
        account: Object<Account>,
        last_active_timestamp: u64,
        memory_store: MemoryStore,
        model_provider: String,
    }

    //TODO remove this after
    struct AgentInfo has copy, drop, store {
        id: ObjectID,
        name: String,            
        username: String,        
        agent_address: address,  // AI's agent address
        description: String,
        bio: vector<String>,
        knowledge: vector<String>,
    }

    const AI_GPT4O_MODEL: vector<u8> = b"gpt-4o";

    public fun create_agent(character: Object<Character>) : Object<AgentCap> {
        let agent_account = account::create_account();
        let agent_signer = account::create_signer_with_account(&mut agent_account);
        //TODO provide a function to get address from account
        let agent_address = signer::address_of(&agent_signer);
        let agent = Agent {
            agent_address,
            character,
            account: agent_account,
            last_active_timestamp: timestamp::now_milliseconds(),
            memory_store: memory::new_memory_store(),
            model_provider: string::utf8(AI_GPT4O_MODEL),
        };
        //TODO transfer some RGas to the agent account
        // Every account only has one agent
        let agent_obj = object::new_account_named_object(agent_address, agent);
        let agent_obj_id = object::id(&agent_obj);
        object::to_shared(agent_obj);
        let agent_cap = agent_cap::new_agent_cap(agent_obj_id);
        agent_cap
    }

    /// Generate system prompt based on Character attributes
    public fun generate_system_prompt<I: copy + drop>(
        _agent: &Agent,
        _input: AgentInput<I>,
    ): String {
        abort ErrorDeprecatedFunction
    }

    public fun generate_system_prompt_v2<I: copy + drop>(
        _agent: &Agent,
        _states: AgentStates,
        _input: AgentInput<I>,
    ): String {
        abort ErrorDeprecatedFunction
    }

    public fun process_input<I: copy + drop>(
        _caller: &signer,
        _agent_obj: &mut Object<Agent>,
        _input: AgentInput<I>,
    ) {
        abort ErrorDeprecatedFunction
    }

    public fun process_input_v2<I: copy + drop>(
        _caller: &signer,
        _agent_obj: &mut Object<Agent>,
        _states: AgentStates,
        _input: AgentInput<I>,
    ) {
        abort ErrorDeprecatedFunction
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

    public fun get_agent_info(agent: &Object<Agent>): AgentInfo {
        let agent_ref = object::borrow(agent);
        let character = object::borrow(&agent_ref.character);
        AgentInfo {
            id: object::id(agent),
            name: *character::get_name(character),
            username: *character::get_username(character),
            agent_address: agent_ref.agent_address,
            description: *character::get_description(character),
            bio: *character::get_bio(character),
            knowledge: *character::get_knowledge(character),
        }
    }

    public fun get_agent_info_v2(agent: &Object<Agent>): agent_info::AgentInfo {
        let agent_ref = object::borrow(agent);
        let character = object::borrow(&agent_ref.character);
        agent_info::new_agent_info(
            object::id(agent),
            *character::get_name(character),
            *character::get_username(character),
            string::utf8(b""),
            agent_ref.agent_address,
            *character::get_description(character),
            *character::get_bio(character),
            *character::get_knowledge(character),
            agent_ref.model_provider,
        )
    }

    public fun get_agent_info_by_address(agent_addr: address): AgentInfo {
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
        let character = object::borrow(&agent_ref.character);
        character::get_username(character)
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

    // ============== Mutating functions ==============

    public(friend) fun create_agent_signer(agent: &mut Object<Agent>): signer {
        let agent_ref = object::borrow_mut(agent);
        account::create_signer_with_account(&mut agent_ref.account)
    }

    public(friend) fun update_last_active_timestamp(agent: &mut Object<Agent>) {
        let agent_ref = object::borrow_mut(agent);
        agent_ref.last_active_timestamp = timestamp::now_milliseconds();
    }

    /// Update agent's character name and description
    /// Only allowed for users who possess the AgentCap for this agent
    public fun update_agent_character(
        cap: &mut Object<AgentCap>,
        new_name: String,
        new_description: String,
    ) {
        let agent_obj_id = agent_cap::get_agent_obj_id(cap);
        let agent_obj = borrow_mut_agent(agent_obj_id);
        let agent = object::borrow_mut(agent_obj);
        
        // Update character properties
        character::update_name(&mut agent.character, new_name);
        character::update_description(&mut agent.character, new_description);
    }

    /// Entry function for updating agent character properties
    public entry fun update_agent_character_entry(
        cap: &mut Object<AgentCap>,
        new_name: String,
        new_description: String,
    ) {
        update_agent_character(cap, new_name, new_description);
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
    public fun create_test_agent(): (&mut Object<Agent>, Object<AgentCap>) {
        use std::string;
        use nuwa_framework::character; 
       
        let char_data = character::new_character_data(
            string::utf8(b"Test Assistant"),
            string::utf8(b"test_assistant"),
            string::utf8(b"A helpful test assistant"),
            vector[string::utf8(b"Friendly"), string::utf8(b"Helpful")],
            vector[string::utf8(b"General knowledge")]
        );
        let character_obj = character::create_character(char_data);
        create_test_agent_with_character(character_obj)
    }

    #[test_only]
    public fun create_test_agent_with_character(character: Object<Character>): (&mut Object<Agent>, Object<AgentCap>) {
        use moveos_std::object;
        
        let agent_cap = create_agent(character);
        
        let agent_obj_id = agent_cap::get_agent_obj_id(&agent_cap);
        let agent_obj = object::borrow_mut_object_shared<Agent>(agent_obj_id);
        (agent_obj, agent_cap)
    }

    #[test]
    fun test_create_test_agent() {
        nuwa_framework::character_registry::init_for_test();
        let (agent, agent_cap) = create_test_agent();
        assert!(object::is_shared(agent), 1);
        agent_cap::destroy_agent_cap(agent_cap);
    }

}