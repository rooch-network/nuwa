module nuwa_framework::memory_action {
    use std::string::{Self, String};
    use std::option;
    
    use moveos_std::object::Object;
    use moveos_std::json;

    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::memory;
    use nuwa_framework::action;

    /// Memory action names using namespaced format
    const ACTION_NAME_ADD: vector<u8> = b"memory::add";
    const ACTION_NAME_UPDATE: vector<u8> = b"memory::update";
    
    /// Special content to mark "deleted" memories
    const MEMORY_DELETED_MARK: vector<u8> = b"[deleted]";

    ///TODO remove functions below
    public fun context_personal(): String { memory::context_personal() }
    public fun context_interaction(): String { memory::context_interaction() }
    public fun context_knowledge(): String { memory::context_knowledge() }
    public fun context_emotional(): String { memory::context_emotional() }
    public fun context_goal(): String { memory::context_goal() }
    public fun context_preference(): String { memory::context_preference() }
    public fun context_feedback(): String { memory::context_feedback() }
    public fun context_rule(): String { memory::context_rule() }
    
    //TODO remove this function
    public fun is_valid_context(context: &String): bool {
        memory::is_standard_context(context)
    }

    #[data_struct]
    /// Arguments for the add memory action
    struct AddMemoryArgs has copy, drop {
        target: address,     // Target address
        content: String,     // Memory content
        context: String,     // Context tag for the memory
        is_long_term: bool,  // Whether this is a long-term memory
    }

    #[data_struct]
    /// Arguments for the update memory action
    struct UpdateMemoryArgs has copy, drop {
        target: address,     // Target address
        index: u64,          // Memory index
        new_content: String, // New memory content
        new_context: String, // New context tag (optional)
        is_long_term: bool,  // Whether this is a long-term memory
    }

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

    // Action examples
    const ADD_MEMORY_EXAMPLE: vector<u8> = b"{\"target\":\"0x5e379ab70f1cc09b5d8e86a32833ccf5eddef0cb376402b5d0d4e9074eb16a4f\",\"content\":\"User prefers detailed explanations\",\"context\":\"preference\",\"is_long_term\":true}";
    const UPDATE_MEMORY_EXAMPLE: vector<u8> = b"{\"target\":\"0x5e379ab70f1cc09b5d8e86a32833ccf5eddef0cb376402b5d0d4e9074eb16a4f\",\"index\":5,\"new_content\":\"User now prefers concise explanations\",\"new_context\":\"preference\",\"is_long_term\":true}";

    public fun register_actions() {

        // Register add_memory action
        let add_memory_args = vector[
            action::new_action_argument(
                string::utf8(b"target"),
                string::utf8(b"string"),
                string::utf8(b"The address to store memory for (user address or yourself address)"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The content of the memory"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"context"),
                string::utf8(b"string"),
                string::utf8(b"The context tag for the memory"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"is_long_term"),
                string::utf8(b"bool"),
                string::utf8(b"Whether to store as long-term memory"),
                true,
            ),
        ];

        action::register_action(
            string::utf8(ACTION_NAME_ADD),
            string::utf8(b"Add a new memory about a user or yourself"),
            add_memory_args,
            string::utf8(ADD_MEMORY_EXAMPLE),
            string::utf8(b"Use this to store important information about users or yourself"),
            string::utf8(b""),
        );

        // Register update_memory action
        let update_memory_args = vector[
            action::new_action_argument(
                string::utf8(b"target"),
                string::utf8(b"address"),
                string::utf8(b"The address whose memory to update"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"index"),
                string::utf8(b"u64"),
                string::utf8(b"The index of the memory to update"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"new_content"),
                string::utf8(b"string"),
                string::utf8(b"The new content"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"new_context"),
                string::utf8(b"string"),
                string::utf8(b"The new context for the memory"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"is_long_term"),
                string::utf8(b"bool"),
                string::utf8(b"Whether to store as long-term memory"),
                true,
            ),
        ];

        action::register_action(
            string::utf8(ACTION_NAME_UPDATE),
            string::utf8(b"Update an existing memory"),
            update_memory_args,
            string::utf8(UPDATE_MEMORY_EXAMPLE),
            string::utf8(b"Use this action to modify existing memories or mark them as deleted by setting content to '[deleted]'"),
            string::utf8(b""),
        );
    }

    /// Execute memory actions
    public fun execute(agent: &mut Object<Agent>, action_name: String, args_json: String) {
        if (action_name == string::utf8(ACTION_NAME_ADD)) {
            let args_opt = json::from_json_option<AddMemoryArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for action"));
                return
            };
            let args = option::destroy_some(args_opt);
            let store = agent::borrow_mut_memory_store(agent);
            memory::add_memory(store, args.target, args.content, args.context, args.is_long_term);
        } else if (action_name == string::utf8(ACTION_NAME_UPDATE)) {
            let args_opt = json::from_json_option<UpdateMemoryArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for action"));
                return
            };
            let args = option::destroy_some(args_opt);
            let store = agent::borrow_mut_memory_store(agent);
            memory::update_memory(
                store,
                args.target,
                args.index,
                args.new_content,
                option::some(args.new_context),
                args.is_long_term
            );
        };
    }

    /// Helper function to update memory
    fun update_memory(
        store: &mut memory::MemoryStore,
        user: address,
        old_content: String,
        new_content: String,
        context: String,
        is_long_term: bool,
    ) {
        let index_opt = memory::find_memory_index(
            store,
            user,
            &old_content,
            &context,
            is_long_term
        );
        
        if (option::is_some(&index_opt)) {
            let index = option::destroy_some(index_opt);
            memory::update_memory(
                store,
                user,
                index,
                new_content,
                option::some(context),
                is_long_term
            );
        };
    }

    #[test]
    fun test_memory_actions() {
        use std::vector;
        use nuwa_framework::agent;
        action::init_for_test();
        register_actions();

        let (agent, cap) = agent::create_test_agent();
        let test_addr = @0x42;
        
        // Test add memory
        let add_args_json = string::utf8(b"{\"target\":\"0x42\",\"content\":\"User likes detailed explanations\",\"context\":\"preference\",\"is_long_term\":true}");
        execute(agent, string::utf8(ACTION_NAME_ADD), add_args_json);

        // Test update memory
        let update_args_json = string::utf8(b"{\"target\":\"0x42\",\"index\":0,\"new_content\":\"User prefers comprehensive explanations\",\"new_context\":\"preference\",\"is_long_term\":true}");
        execute(agent, string::utf8(ACTION_NAME_UPDATE), update_args_json);
        
        // Verify the update
        let store = agent::borrow_memory_store(agent);
        let memories = memory::get_context_memories(store, test_addr);
        assert!(vector::length(&memories) == 1, 1);
        let updated_memory = vector::borrow(&memories, 0);
        assert!(memory::get_content(updated_memory) == string::utf8(b"User prefers comprehensive explanations"), 2);
        
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_memory_action_examples() {
        // Test add memory example
        let add_args = json::from_json<AddMemoryArgs>(ADD_MEMORY_EXAMPLE);
        assert!(add_args.target == @0x5e379ab70f1cc09b5d8e86a32833ccf5eddef0cb376402b5d0d4e9074eb16a4f, 1);
        assert!(add_args.content == string::utf8(b"User prefers detailed explanations"), 2);
        assert!(add_args.context == string::utf8(b"preference"), 3);
        assert!(add_args.is_long_term == true, 4);
        assert!(memory::is_standard_context(&add_args.context), 5);

        // Test update memory example
        let update_args = json::from_json<UpdateMemoryArgs>(UPDATE_MEMORY_EXAMPLE);
        assert!(update_args.target == @0x5e379ab70f1cc09b5d8e86a32833ccf5eddef0cb376402b5d0d4e9074eb16a4f, 6);
        assert!(update_args.index == 5, 7);
        assert!(update_args.new_content == string::utf8(b"User now prefers concise explanations"), 8);
        assert!(update_args.new_context == string::utf8(b"preference"), 9);
        assert!(update_args.is_long_term == true, 10);
        assert!(memory::is_standard_context(&update_args.new_context), 11);
    }
}