module nuwa_framework::action {
    use std::string::String;
    use std::vector;
    use std::option;
    use moveos_std::table::{Self, Table};
    use moveos_std::object;

    #[data_struct]
    struct ActionGroup has copy, drop, store{
        namespace: String,
        description: String,
        actions: vector<ActionDescription>,
    }
    
    #[data_struct]
    /// Action description for AI
    struct ActionDescription has copy, drop, store {
        name: String,
        description: String,
        args: vector<ActionArgument>,
        args_example: String,  // Changed from 'example' to 'args_example'
        usage_hint: String,       // When and how to use this action
        constraints: String,      // Requirements and limitations
    }

    #[data_struct]
    struct ActionArgument has copy, drop, store {
        name: String,
        type_desc: String,
        description: String,
        required: bool,
    }

    struct ActionRegistry has key {
        // Store action descriptions by type_info and name
        descriptions: Table<String, ActionDescription>,
    }

    const ERROR_ACTION_ALREADY_REGISTERED: u64 = 1;
    const ERROR_ACTION_NOT_FOUND: u64 = 2;

    fun init(){
        let registry = ActionRegistry {
            descriptions: table::new(),
        };
        let registry_obj = object::new_named_object(registry);
        object::to_shared(registry_obj);
    }

    fun borrow_mut_registry(): &mut ActionRegistry{
        let registry_obj_id = object::named_object_id<ActionRegistry>();
        let registry_obj = object::borrow_mut_object_extend<ActionRegistry>(registry_obj_id);
        object::borrow_mut(registry_obj)
    }

    /// Register a new action with its description
    public fun register_action(
        name: String,
        description: String,
        args: vector<ActionArgument>,
        args_example: String,  // Example in format: {"target":"0x42","content":"some text"}
        usage_hint: String,
        constraints: String,
    ) {
        let registry = borrow_mut_registry();
        assert!(!table::contains(&registry.descriptions, name), ERROR_ACTION_ALREADY_REGISTERED);

        let action_desc = new_action_description(
            name,
            description,
            args,
            args_example,
            usage_hint,
            constraints,
        );
        table::add(&mut registry.descriptions, name, action_desc);
    }

    /// Create a new action argument
    public fun new_action_argument(
        name: String,
        type_desc: String,
        description: String,
        required: bool,
    ): ActionArgument {
        ActionArgument {
            name,
            type_desc,
            description,
            required,
        }
    }

    public fun new_action_description(
        name: String,
        description: String,
        args: vector<ActionArgument>,
        args_example: String,
        usage_hint: String,
        constraints: String,
    ): ActionDescription {
        ActionDescription {
            name,
            description,
            args,
            args_example,
            usage_hint,
            constraints,
        }
    }

    public fun new_action_group(
        namespace: String,
        description: String,
        actions: vector<ActionDescription>,
    ): ActionGroup {
        ActionGroup {
            namespace,
            description,
            actions,
        }
    }

    /// Get all registered action descriptions
    public fun get_all_action_descriptions(): vector<ActionDescription> {
        let registry = borrow_mut_registry();
        let descriptions = vector::empty();
        
        let iter = table::list_field_keys(&registry.descriptions, option::none(), 100);
        while (table::field_keys_len(&iter) > 0) {
            let (_key, value) = table::next(&mut iter);
            vector::push_back(&mut descriptions, *value);
        };
        
        descriptions
    }

    /// Get action descriptions for the specified keys
    public fun get_action_descriptions(keys: &vector<String>): vector<ActionDescription> {
        let registry = borrow_mut_registry();
        let descriptions = vector::empty();
        let i = 0;
        let len = vector::length(keys);
        
        while (i < len) {
            let key = vector::borrow(keys, i);
            if (table::contains(&registry.descriptions, *key)) {
                let desc = table::borrow(&registry.descriptions, *key);
                vector::push_back(&mut descriptions, *desc);
            };
            i = i + 1;
        };
        
        descriptions
    }

    /// Get description for specific action
    public fun get_action_description(name: &String): ActionDescription {
        let registry = borrow_mut_registry();
        assert!(table::contains(&registry.descriptions, *name), ERROR_ACTION_NOT_FOUND);
        *table::borrow(&registry.descriptions, *name)
    }

    /// Getter functions for ActionDescription
    public fun get_name(action: &ActionDescription): &String {
        &action.name
    }

    public fun get_description(action: &ActionDescription): &String {
        &action.description
    }

    public fun get_args(action: &ActionDescription): &vector<ActionArgument> {
        &action.args
    }

    public fun get_args_example(action: &ActionDescription): &String {
        &action.args_example
    }

    public fun get_usage_hint(action: &ActionDescription): &String { &action.usage_hint }
    public fun get_constraints(action: &ActionDescription): &String { &action.constraints }

    // Add getters for ActionArgument
    public fun get_arg_name(arg: &ActionArgument): &String { &arg.name }
    public fun get_arg_type_desc(arg: &ActionArgument): &String { &arg.type_desc }
    public fun get_arg_description(arg: &ActionArgument): &String { &arg.description }
    public fun get_arg_required(arg: &ActionArgument): bool { arg.required }

    public fun get_actions_from_group(group: &ActionGroup): &vector<ActionDescription> {
        &group.actions
    }

    #[test]
    public fun init_for_test(){
        init();
    }

    #[test]
    fun test_register_memory_action() {
        use std::string;
        init_for_test();
        
        // Register a memory action
        let args = vector[
            new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"Memory content"),
                true,
            )
        ];

        register_action(
            string::utf8(b"add_memory"),
            string::utf8(b"Add a new memory"),
            args,
            string::utf8(b"{\"action\":\"add_memory\",\"args\":[\"test memory\"]}"),
            string::utf8(b"Use this action to add a new memory"),
            string::utf8(b"Memory content must be a non-empty string"),
        );

        // Verify registration
        let desc = get_action_description(&string::utf8(b"add_memory"));
        assert!(desc.name == string::utf8(b"add_memory"), 1);
    }


    #[test]
    fun test_get_action_descriptions() {
        use std::string;
        init_for_test();
        
        // Register a test action
        let args = vector[
            new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"Memory content"),
                true,
            )
        ];

        register_action(
            string::utf8(b"add_memory"),
            string::utf8(b"Add a new memory"),
            args,
            string::utf8(b"{\"action\":\"add_memory\",\"args\":[\"test memory\"]}"),
            string::utf8(b"Use this action to add a new memory"),
            string::utf8(b"Memory content must be a non-empty string"),
        );

        let action_key = string::utf8(b"add_memory");
        
        // Get descriptions using the key
        let keys = vector::singleton(action_key);
        let descriptions = get_action_descriptions(&keys);
        
        assert!(vector::length(&descriptions) == 1, 1);
        let desc = vector::borrow(&descriptions, 0);
        assert!(desc.name == string::utf8(b"add_memory"), 2);
    }

    #[test]
    fun test_get_all_action_descriptions() {
        use std::string;
        init_for_test();
        
        // Register test actions
        let memory_args = vector[
            new_action_argument(
                string::utf8(b"target"),
                string::utf8(b"address"),
                string::utf8(b"The target address"),
                true,
            )
        ];

        let response_args = vector[
            new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"Response content"),
                true,
            )
        ];

        register_action(
            string::utf8(b"memory::add"),
            string::utf8(b"Add a new memory"),
            memory_args,
            string::utf8(b"{\"action\":\"memory::add\",\"args\":[\"0x123\",\"test memory\"]}"),
            string::utf8(b"Use this action to store memories"),
            string::utf8(b"Target must be valid address"),
        );

        register_action(
            string::utf8(b"response::say"),
            string::utf8(b"Send a response"),
            response_args,
            string::utf8(b"{\"action\":\"response::say\",\"args\":[\"hello\"]}"),
            string::utf8(b"Use this action to respond"),
            string::utf8(b"Content must not be empty"),
        );

        // Get all descriptions
        let descriptions = get_all_action_descriptions();
        
        // Verify we got both actions
        assert!(vector::length(&descriptions) == 2, 1);
        
        // Verify action names
        let found_memory = false;
        let found_response = false;
        let i = 0;
        while (i < vector::length(&descriptions)) {
            let desc = vector::borrow(&descriptions, i);
            if (desc.name == string::utf8(b"memory::add")) {
                found_memory = true;
            };
            if (desc.name == string::utf8(b"response::say")) {
                found_response = true;
            };
            i = i + 1;
        };
        
        assert!(found_memory && found_response, 2);
    }
}
