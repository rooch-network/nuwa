module nuwa_framework::memory_action {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;
    
    use moveos_std::object::Object;
    use moveos_std::json;
    use moveos_std::result::{ok, err_str, Result};

    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::memory;
    use nuwa_framework::action::{Self, ActionGroup};
    use nuwa_framework::agent_input_info;
    use nuwa_framework::prompt_input::{Self, PromptInput};
    friend nuwa_framework::action_dispatcher;

    /// Memory action names using more intuitive namespacing
    const ACTION_NAME_REMEMBER_SELF: vector<u8> = b"memory::remember_self";
    public fun action_name_remember_self(): String { string::utf8(ACTION_NAME_REMEMBER_SELF) }
    const ACTION_NAME_REMEMBER_USER: vector<u8> = b"memory::remember_user";    
    public fun action_name_remember_user(): String { string::utf8(ACTION_NAME_REMEMBER_USER) } 
    
    // Add new memory::none action
    const ACTION_NAME_NONE: vector<u8> = b"memory::none";
    public fun action_name_none(): String { string::utf8(ACTION_NAME_NONE) }


    #[data_struct]
    /// Arguments for adding a memory about oneself
    struct RememberSelfArgs has copy, drop, store {
        content: String,     // Memory content
    }

    public fun create_remember_self_args(
        content: String,
    ): RememberSelfArgs {
        RememberSelfArgs {
            content,
        }
    }

    #[data_struct]
    /// Arguments for adding a memory about a user
    struct RememberUserArgs has copy, drop, store {
        content: String,     // Memory content
    }

    public fun create_remember_user_args(
        content: String,
    ): RememberUserArgs {
        RememberUserArgs {
            content,
        }
    }


    // Action examples - simplified examples for better AI understanding
    const REMEMBER_SELF_EXAMPLE: vector<u8> = b"{\"content\":\"I find that I connect well with users who share personal stories\"}";
    const REMEMBER_USER_EXAMPLE: vector<u8> = b"{\"content\":\"User prefers detailed technical explanations\"}";

    // Add example for memory::none action
    const NONE_EXAMPLE: vector<u8> = b"{\"reason\":null}";

    #[data_struct]
    /// Arguments for the memory::none action
    struct NoneArgs has copy, drop, store {
        reason: Option<String>,     // Optional reason for not creating memory
    }

    public fun create_none_args(
        reason: Option<String>
    ): NoneArgs {
        NoneArgs {
            reason
        }
    }

    public(friend) fun get_action_group(): ActionGroup {
        action::new_action_group(
            string::utf8(b"memory"),
            string::utf8(b"Memory actions for storing and updating personal and user memories. You MUST use at least one memory action in EVERY interaction, use memory::none if there's nothing to remember."),
            get_action_descriptions()
        )   
    }

    public(friend) fun get_action_descriptions(): vector<action::ActionDescription> {
        let descriptions = vector::empty();
        
        // First add the memory::none action with clear instruction about memory actions requirement
        let none_args = vector[
            action::new_action_argument(
                string::utf8(b"reason"),
                string::utf8(b"string"),
                string::utf8(b"Optional reason why no memory should be created, can be null"),
                false,
            ),
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_NONE),
            string::utf8(b"Explicitly indicate that nothing should be remembered from this interaction"),
            none_args,
            string::utf8(NONE_EXAMPLE),
        ));

        // Register remember_self action (AI's memories about itself)
        let remember_self_args = vector[
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The content of your memory about yourself"),
                true,
            ),
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_REMEMBER_SELF),
            string::utf8(b"Remember something about yourself, Use this to record your own thoughts, feelings, goals, or personal development"),
            remember_self_args,
            string::utf8(REMEMBER_SELF_EXAMPLE),
        ));

        // Register remember_user action (AI's memories about the user)
        let remember_user_args = vector[
            action::new_action_argument(
                string::utf8(b"content"),
                string::utf8(b"string"),
                string::utf8(b"The content of your memory about the user"),
                true,
            ), 
        ];

        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_REMEMBER_USER),
            string::utf8(b"Remember something about the current user, Use this to record important information about the user you're speaking with"),
            remember_user_args,
            string::utf8(REMEMBER_USER_EXAMPLE),
        ));
        descriptions
    }

    /// Execute memory actions
    public(friend) fun execute_internal(agent: &mut Object<Agent>, prompt: &PromptInput, action_name: String, args_json: String) :Result<bool, String> {
        let agent_address = agent::get_agent_address(agent);
        let store = agent::borrow_mut_memory_store(agent);
        
        if (action_name == string::utf8(ACTION_NAME_REMEMBER_SELF)) {
            // Add memory about self
            let args_opt = json::from_json_option<RememberSelfArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                return err_str(b"Invalid arguments for remember_self action")
            };
            let args = option::destroy_some(args_opt);
            memory::add_memory(store, agent_address, args.content);
            ok(true)
        } 
        else if (action_name == string::utf8(ACTION_NAME_REMEMBER_USER)) {
            // Add memory about current user
            let args_opt = json::from_json_option<RememberUserArgs>(string::into_bytes(args_json));
            if (!option::is_some(&args_opt)) {
                return err_str(b"Invalid arguments for remember_user action")
            };
            let args = option::destroy_some(args_opt);
            let agent_input = prompt_input::get_input_info(prompt);
            let current_user = agent_input_info::get_sender(agent_input);
            memory::add_memory(store, current_user, args.content);
            ok(true)
        }
        else if (action_name == string::utf8(ACTION_NAME_NONE)) {
            ok(false)
        }
        else {
            err_str(b"Unsupported action")
        }
    }
    

    #[test_only]
    struct TestInput has copy, drop, store{

    }

    #[test]
    fun test_memory_actions() {
        use std::vector;
        use nuwa_framework::agent;
        use nuwa_framework::agent_input_info;
        use nuwa_framework::memory;
        use moveos_std::object;
        use moveos_std::result;
        
        nuwa_framework::genesis::init_for_test();
        
        let (agent_obj, cap) = agent::create_default_test_agent();
        let agent_address = agent::get_agent_address(agent_obj);
        let test_addr = @0x42;

        let response_channel_id = object::derive_object_id_for_test();
    
        let agent_input_info = agent_input_info::new_agent_input_info_for_test(
            test_addr,
            response_channel_id,
            string::utf8(b"Test input"),
            TestInput{},
            1000000000000000000u256
        );

        let agent_info = agent::get_agent_info(agent_obj);
        let prompt_input = prompt_input::new_prompt_input_for_test(agent_info, agent_input_info);

        // Test remember_self action
        let remember_self_json = string::utf8(b"{\"content\":\"I enjoy helping with technical explanations\"}");
        let result = execute_internal(agent_obj, &prompt_input, string::utf8(ACTION_NAME_REMEMBER_SELF), remember_self_json);
        assert!(result::is_ok(&result), 1);

        // Test remember_user action
        let remember_user_json = string::utf8(b"{\"content\":\"User likes detailed explanations\"}");
        let result = execute_internal(agent_obj, &prompt_input, string::utf8(ACTION_NAME_REMEMBER_USER), remember_user_json);
        assert!(result::is_ok(&result), 2);
        
        let store = agent::borrow_memory_store(agent_obj);
       
        let self_memories = memory::get_context_memories(store, agent_address);
        assert!(vector::length(&self_memories) == 1, 1);
        let self_memory = vector::borrow(&self_memories, 0);
        assert!(memory::get_content(self_memory) == string::utf8(b"I enjoy helping with technical explanations"), 2);
        
        // Verify user memory
        let user_memories = memory::get_context_memories(store, test_addr);
        assert!(vector::length(&user_memories) == 1, 3);
        let user_memory = vector::borrow(&user_memories, 0);
        assert!(memory::get_content(user_memory) == string::utf8(b"User likes detailed explanations"), 4);
        
        agent::destroy_agent_cap(cap);
    }

    #[test]
    fun test_memory_action_examples() {
        // Test remember_self example
        let self_args = json::from_json<RememberSelfArgs>(REMEMBER_SELF_EXAMPLE);
        assert!(self_args.content == string::utf8(b"I find that I connect well with users who share personal stories"), 1);

        // Test remember_user example
        let user_args = json::from_json<RememberUserArgs>(REMEMBER_USER_EXAMPLE);
        assert!(user_args.content == string::utf8(b"User prefers detailed technical explanations"), 5);
    }

    // Add a new test for the memory::none action
    #[test]
    fun test_memory_none_action() {
        let _none_args = json::from_json<NoneArgs>(NONE_EXAMPLE);
    }
}