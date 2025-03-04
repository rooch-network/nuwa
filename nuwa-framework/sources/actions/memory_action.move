module nuwa_framework::memory_action {
    use std::string::{Self, String};
    use std::option;
    use std::vector;
    
    use moveos_std::object::Object;
    use moveos_std::json;

    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::memory;
    use nuwa_framework::action;
    use nuwa_framework::agent_input::{Self, AgentInputInfo};

    /// Memory action names using more intuitive namespacing
    const ACTION_NAME_REMEMBER_SELF: vector<u8> = b"memory::remember_self";
    const ACTION_NAME_REMEMBER_USER: vector<u8> = b"memory::remember_user";
    const ACTION_NAME_UPDATE_SELF: vector<u8> = b"memory::update_self";
    const ACTION_NAME_UPDATE_USER: vector<u8> = b"memory::update_user";
    
    /// Special content to mark "deleted" memories
    const MEMORY_DELETED_MARK: vector<u8> = b"[deleted]";

    // Context constants - keeping these for backwards compatibility
    public fun context_personal(): String { memory::context_personal() }
    public fun context_interaction(): String { memory::context_interaction() }
    public fun context_knowledge(): String { memory::context_knowledge() }
    public fun context_emotional(): String { memory::context_emotional() }
    public fun context_goal(): String { memory::context_goal() }
    public fun context_preference(): String { memory::context_preference() }
    public fun context_feedback(): String { memory::context_feedback() }
    public fun context_rule(): String { memory::context_rule() }
    
    public fun is_valid_context(context: &String): bool {
        memory::is_standard_context(context)
    }

    //TODO remove this
    #[data_struct]
    /// Arguments for the add memory action
    struct AddMemoryArgs has copy, drop {
        target: address,     // Target address
        content: String,     // Memory content
        context: String,     // Context tag for the memory
        is_long_term: bool,  // Whether this is a long-term memory
    }

    #[data_struct]
    /// Arguments for adding a memory about oneself
    struct RememberSelfArgs has copy, drop {
        content: String,     // Memory content
        context: String,     // Context tag for the memory
        is_long_term: bool,  // Whether this is a long-term memory
    }

    //TODO Remove this
    #[data_struct]
    /// Arguments for the update memory action
    struct UpdateMemoryArgs has copy, drop {
        target: address,     // Target address
        index: u64,          // Memory index
        new_content: String, // New memory content
        new_context: String, // New context tag (optional)
        is_long_term: bool,  // Whether this is a long-term memory
    }

    #[data_struct]
    /// Arguments for adding a memory about a user
    struct RememberUserArgs has copy, drop {
        content: String,     // Memory content
        context: String,     // Context tag for the memory
        is_long_term: bool,  // Whether this is a long-term memory
    }

    #[data_struct]
    /// Arguments for updating a memory about oneself
    struct UpdateSelfMemoryArgs has copy, drop {
        index: u64,          // Memory index
        new_content: String, // New memory content
        new_context: String, // New context tag
        is_long_term: bool,  // Whether this is a long-term memory
    }

    #[data_struct]
    /// Arguments for updating a memory about a user
    struct UpdateUserMemoryArgs has copy, drop {
        index: u64,          // Memory index
        new_content: String, // New memory content
        new_context: String, // New context tag
        is_long_term: bool,  // Whether this is a long-term memory
    }

    //TODO remove this
    /// Create arguments for add memory action
    public fun create_add_memory_args(
        target: address,
        content: String,
        context: String,
        is_long_term: bool
    ): AddMemoryArgs {
        AddMemoryArgs {
            target,
            content,
            context,
            is_long_term
        }
    }

    //TODO remove this
    /// Create arguments for update memory action
    public fun create_update_memory_args(
        target: address,
        index: u64,
        new_content: String,
        new_context: String,
        is_long_term: bool
    ): UpdateMemoryArgs {
        UpdateMemoryArgs {
            target,
            index,
            new_content,
            new_context,
            is_long_term
        }
    }

    // Action examples - simplified examples for better AI understanding
    const REMEMBER_SELF_EXAMPLE: vector<u8> = b"{\"content\":\"I find that I connect well with users who share personal stories\",\"context\":\"personal\",\"is_long_term\":true}";
    const REMEMBER_USER_EXAMPLE: vector<u8> = b"{\"content\":\"User prefers detailed technical explanations\",\"context\":\"preference\",\"is_long_term\":true}";
    const UPDATE_SELF_EXAMPLE: vector<u8> = b"{\"index\":2,\"new_content\":\"I've noticed I'm more effective when I ask clarifying questions\",\"new_context\":\"personal\",\"is_long_term\":true}";
    const UPDATE_USER_EXAMPLE: vector<u8> = b"{\"index\":3,\"new_content\":\"User now prefers concise explanations with code examples\",\"new_context\":\"preference\",\"is_long_term\":true}";

    public fun register_actions() {
        //TODO deprecated, remove this
    }

    public fun get_action_descriptions(): vector<action::ActionDescription> {
        let descriptions = vector::empty();
        // Register remember_self action (AI's memories about itself)
        let remember_self_args = vector[
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The content of your memory about yourself"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"context"),
                string::utf8(b"string"),
                string::utf8(b"The context tag for your memory (personal, goal, etc.)"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"is_long_term"),
                string::utf8(b"bool"),
                string::utf8(b"Whether to store as a permanent memory"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_REMEMBER_SELF),
            string::utf8(b"Remember something about yourself"),
            remember_self_args,
            string::utf8(REMEMBER_SELF_EXAMPLE),
            string::utf8(b"Use this to record your own thoughts, feelings, goals, or personal development"),
            string::utf8(b"Self-memories help you maintain continuity of identity"),
        ));

        // Register remember_user action (AI's memories about the user)
        let remember_user_args = vector[
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The content of your memory about the user"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"context"),
                string::utf8(b"string"),
                string::utf8(b"The context tag for your memory (preference, feedback, etc.)"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"is_long_term"),
                string::utf8(b"bool"),
                string::utf8(b"Whether to store as a permanent memory"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_REMEMBER_USER),
            string::utf8(b"Remember something about the current user"),
            remember_user_args,
            string::utf8(REMEMBER_USER_EXAMPLE),
            string::utf8(b"Use this to record important information about the user you're speaking with"),
            string::utf8(b"User memories help you personalize future interactions"),
        ));

        // Register update_self action (updating AI's memories about itself)
        let update_self_args = vector[
            action::new_action_argument(
                string::utf8(b"index"),
                string::utf8(b"u64"),
                string::utf8(b"The index of your memory to update"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"new_content"),
                string::utf8(b"string"),
                string::utf8(b"The updated content"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"new_context"),
                string::utf8(b"string"),
                string::utf8(b"The updated context tag"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"is_long_term"),
                string::utf8(b"bool"),
                string::utf8(b"Whether to store as a permanent memory"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_UPDATE_SELF),
            string::utf8(b"Update a memory about yourself"),
            update_self_args,
            string::utf8(UPDATE_SELF_EXAMPLE),
            string::utf8(b"Use this to modify your existing memories about yourself"),
            string::utf8(b"Set content to '[deleted]' to mark a memory for deletion"),
        ));

        // Register update_user action (updating AI's memories about the user)
        let update_user_args = vector[
            action::new_action_argument(
                string::utf8(b"index"),
                string::utf8(b"u64"),
                string::utf8(b"The index of the user memory to update"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"new_content"),
                string::utf8(b"string"),
                string::utf8(b"The updated content"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"new_context"),
                string::utf8(b"string"),
                string::utf8(b"The updated context tag"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"is_long_term"),
                string::utf8(b"bool"),
                string::utf8(b"Whether to store as a permanent memory"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_UPDATE_USER),
            string::utf8(b"Update a memory about the current user"),
            update_user_args,
            string::utf8(UPDATE_USER_EXAMPLE),
            string::utf8(b"Use this to modify your existing memories about the user"),
            string::utf8(b"Set content to '[deleted]' to mark a memory for deletion"),
        ));
        descriptions
    }

    public fun execute(_agent: &mut Object<Agent>, _action_name: String, _args_json: String){
        //TODO deprecated, remove this
    }

    /// Execute memory actions
    public fun execute_v2(agent: &mut Object<Agent>, agent_input: &AgentInputInfo, action_name: String, args_json: String) {
        let agent_address = agent::get_agent_address(agent);
        let store = agent::borrow_mut_memory_store(agent);
        
        if (action_name == string::utf8(ACTION_NAME_REMEMBER_SELF)) {
            // Add memory about self
            let args_opt = json::from_json_option<RememberSelfArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for remember_self action"));
                return
            };
            let args = option::destroy_some(args_opt);
            memory::add_memory(store, agent_address, args.content, args.context, args.is_long_term);
        } 
        else if (action_name == string::utf8(ACTION_NAME_REMEMBER_USER)) {
            // Add memory about current user
            let args_opt = json::from_json_option<RememberUserArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for remember_user action"));
                return
            };
            let args = option::destroy_some(args_opt);
            let current_user = agent_input::get_sender_from_info(agent_input);
            memory::add_memory(store, current_user, args.content, args.context, args.is_long_term);
        }
        else if (action_name == string::utf8(ACTION_NAME_UPDATE_SELF)) {
            // Update memory about self
            let args_opt = json::from_json_option<UpdateSelfMemoryArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for update_self action"));
                return
            };
            let args = option::destroy_some(args_opt);
            memory::update_memory(
                store,
                agent_address,
                args.index,
                args.new_content,
                option::some(args.new_context),
                args.is_long_term
            );
        }
        else if (action_name == string::utf8(ACTION_NAME_UPDATE_USER)) {
            // Update memory about current user
            let args_opt = json::from_json_option<UpdateUserMemoryArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for update_user action"));
                return
            };
            let args = option::destroy_some(args_opt);
            let current_user = agent_input::get_sender_from_info(agent_input);
            memory::update_memory(
                store,
                current_user,
                args.index,
                args.new_content,
                option::some(args.new_context),
                args.is_long_term
            );
        };
    }

    #[test]
    fun test_memory_actions() {
        use std::vector;
        use nuwa_framework::agent;
        action::init_for_test();
        register_actions();

        let (agent_obj, cap) = agent::create_test_agent();
        let test_addr = @0x42;
        
        // Set the current user for the agent
        agent::set_current_user(agent_obj, test_addr);
        
        // Test remember_self action
        let remember_self_json = string::utf8(b"{\"content\":\"I enjoy helping with technical explanations\",\"context\":\"personal\",\"is_long_term\":true}");
        execute(agent_obj, string::utf8(ACTION_NAME_REMEMBER_SELF), remember_self_json);

        // Test remember_user action
        let remember_user_json = string::utf8(b"{\"content\":\"User likes detailed explanations\",\"context\":\"preference\",\"is_long_term\":true}");
        execute(agent_obj, string::utf8(ACTION_NAME_REMEMBER_USER), remember_user_json);
        
        // Verify self memory
        let store = agent::borrow_memory_store(agent_obj);
        let self_memories = memory::get_self_memories(store);
        assert!(vector::length(&self_memories) == 1, 1);
        let self_memory = vector::borrow(&self_memories, 0);
        assert!(memory::get_content(self_memory) == string::utf8(b"I enjoy helping with technical explanations"), 2);
        
        // Verify user memory
        let user_memories = memory::get_context_memories(store, test_addr);
        assert!(vector::length(&user_memories) == 1, 3);
        let user_memory = vector::borrow(&user_memories, 0);
        assert!(memory::get_content(user_memory) == string::utf8(b"User likes detailed explanations"), 4);
        
        // Test update_self action
        let update_self_json = string::utf8(b"{\"index\":0,\"new_content\":\"I find I'm most effective when providing code examples\",\"new_context\":\"personal\",\"is_long_term\":true}");
        execute(agent_obj, string::utf8(ACTION_NAME_UPDATE_SELF), update_self_json);
        
        // Test update_user action
        let update_user_json = string::utf8(b"{\"index\":0,\"new_content\":\"User now prefers concise explanations\",\"new_context\":\"preference\",\"is_long_term\":true}");
        execute(agent_obj, string::utf8(ACTION_NAME_UPDATE_USER), update_user_json);
        
        // Verify updated memories
        store = agent::borrow_memory_store(agent_obj);
        self_memories = memory::get_self_memories(store);
        let updated_self_memory = vector::borrow(&self_memories, 0);
        assert!(memory::get_content(updated_self_memory) == string::utf8(b"I find I'm most effective when providing code examples"), 5);
        
        user_memories = memory::get_context_memories(store, test_addr);
        let updated_user_memory = vector::borrow(&user_memories, 0);
        assert!(memory::get_content(updated_user_memory) == string::utf8(b"User now prefers concise explanations"), 6);
        
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_memory_action_examples() {
        // Test remember_self example
        let self_args = json::from_json<RememberSelfArgs>(REMEMBER_SELF_EXAMPLE);
        assert!(self_args.content == string::utf8(b"I find that I connect well with users who share personal stories"), 1);
        assert!(self_args.context == string::utf8(b"personal"), 2);
        assert!(self_args.is_long_term == true, 3);
        assert!(memory::is_standard_context(&self_args.context), 4);

        // Test remember_user example
        let user_args = json::from_json<RememberUserArgs>(REMEMBER_USER_EXAMPLE);
        assert!(user_args.content == string::utf8(b"User prefers detailed technical explanations"), 5);
        assert!(user_args.context == string::utf8(b"preference"), 6);
        assert!(user_args.is_long_term == true, 7);
        assert!(memory::is_standard_context(&user_args.context), 8);

        // Test update_self example
        let update_self_args = json::from_json<UpdateSelfMemoryArgs>(UPDATE_SELF_EXAMPLE);
        assert!(update_self_args.index == 2, 9);
        assert!(update_self_args.new_content == string::utf8(b"I've noticed I'm more effective when I ask clarifying questions"), 10);
        assert!(update_self_args.new_context == string::utf8(b"personal"), 11);
        assert!(update_self_args.is_long_term == true, 12);

        // Test update_user example
        let update_user_args = json::from_json<UpdateUserMemoryArgs>(UPDATE_USER_EXAMPLE);
        assert!(update_user_args.index == 3, 13);
        assert!(update_user_args.new_content == string::utf8(b"User now prefers concise explanations with code examples"), 14);
        assert!(update_user_args.new_context == string::utf8(b"preference"), 15);
        assert!(update_user_args.is_long_term == true, 16);
    }
}