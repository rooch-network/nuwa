module nuwa_framework::action_dispatcher {
    use std::string::{Self, String};
    use std::vector;
    use moveos_std::json;
    use moveos_std::object::{Object, ObjectID};
    use moveos_std::result::{Self, is_ok, is_err, err_str, Result};
    use nuwa_framework::memory_action;
    use nuwa_framework::response_action;
    use nuwa_framework::transfer_action;
    use nuwa_framework::task_action;
    use nuwa_framework::agent::Agent;
    use nuwa_framework::string_utils;
    use nuwa_framework::action::{ActionDescription, ActionGroup};
    use nuwa_framework::agent_input_info::{Self, AgentInputInfo};

    friend nuwa_framework::ai_callback;
    
    #[data_struct]
    struct ActionCall has copy, drop {
        action: String,
        /// JSON string containing action-specific arguments
        args: String,  
    }

    #[data_struct]
    /// Response structure from AI - contains a vector of action calls
    /// Each action call has:
    /// - "action": specifies the action name, e.g., "memory::add"
    /// - "args": contains a JSON object string with action-specific parameters
    struct ActionResponse has copy, drop {
        actions: vector<ActionCall>
    }

    struct ActionEvent has copy, drop, store{
        action: String,
        args: String,
        success: bool,
        error: String,
    }

    //TODO remove this
    entry fun register_actions() {
    }

    public fun get_action_groups(): vector<ActionGroup> {
        let groups = vector::empty();
        let memory_group = memory_action::get_action_group();
        vector::push_back(&mut groups, memory_group);
        let response_group = response_action::get_action_group();
        vector::push_back(&mut groups, response_group);
        let transfer_group = transfer_action::get_action_group();
        vector::push_back(&mut groups, transfer_group);
        groups
    }

    public fun get_action_descriptions(): vector<ActionDescription> {
        let descriptions = vector::empty();

        // Register memory actions
        let memory_descriptions = memory_action::get_action_descriptions();
        vector::append(&mut descriptions, memory_descriptions);

        // Register response actions
        let response_descriptions = response_action::get_action_descriptions();
        vector::append(&mut descriptions, response_descriptions);

        // Register transfer actions
        let transfer_descriptions = transfer_action::get_action_descriptions();
        vector::append(&mut descriptions, transfer_descriptions);

        descriptions
    }
 
    public(friend) fun dispatch_actions_internal(agent: &mut Object<Agent>, agent_input: AgentInputInfo, response: String) {
        let action_response = parse_line_based_response(&response);
        let actions = action_response.actions;
        let i = 0;
        let len = vector::length(&actions);
        let default_channel_id = agent_input_info::get_response_channel_id(&agent_input);
        if (len == 0) {
            //If the AI response format is not correct, reply to the current message
            response_action::reply_to_current_message(agent, &agent_input, response);
            return
        };
        while (i < len) {
            let action_call = vector::borrow(&actions, i);
            execute_action(agent, &agent_input, default_channel_id, action_call);
            i = i + 1;
        };
    }

    /// Execute a single action call
    fun execute_action(agent: &mut Object<Agent>, agent_input: &AgentInputInfo, default_channel_id: ObjectID, action_call: &ActionCall) {
        let action_name = &action_call.action;
        let args = &action_call.args;
        let skip_event = false;
        let result: Result<bool,String> = if (string_utils::starts_with(action_name, &b"memory::")) {
            let result = memory_action::execute_internal(agent, agent_input, *action_name, *args);
            if(is_ok(&result)){
                //if the memory action is none, skip the event
                let updated_memory:bool = result::unwrap(result);
                if(!updated_memory){
                    skip_event = true;
                };
            };
            result
        } else if (string_utils::starts_with(action_name, &b"response::")) {
            //skip all response actions
            skip_event = true;
            response_action::execute_internal(agent, agent_input, *action_name, *args)
        } else if (string_utils::starts_with(action_name, &b"transfer::")) {
            transfer_action::execute_internal(agent, agent_input, *action_name, *args)
        } else if (string_utils::starts_with(action_name, &b"task::")) {
            task_action::execute_internal(agent, agent_input, *action_name, *args)
        } else {
            err_str(b"Unsupported action")
        };
        if (!skip_event) {
            let event = ActionEvent {
                action: *action_name,
                args: *args,
                success: is_ok(&result),
                error: if (is_err(&result)) { result::unwrap_err(result) } else { string::utf8(b"") },
            };
            response_action::send_event_to_channel(agent, default_channel_id, string::utf8(json::to_json(&event)));
        };
    }

    /// Parse JSON response into ActionResponse
    public fun parse_response(json_str: String): ActionResponse {
        json::from_json<ActionResponse>(string::into_bytes(json_str))
    }
    
    /// Get actions from ActionResponse
    public fun get_actions(response: &ActionResponse): &vector<ActionCall> {
        &response.actions
    }

    /// Get action name from ActionCall
    public fun get_action_name(action_call: &ActionCall): &String {
        &action_call.action
    }

    /// Get action arguments from ActionCall
    public fun get_action_args(action_call: &ActionCall): &String {
        &action_call.args
    }

    /// Create an action call with a raw string args
    public fun create_action_call(action: String, args_json: String): ActionCall {
        ActionCall { action, args: args_json }
    }

    /// Create an action call with any serializable args type
    /// This provides a type-safe way to create action calls
    public fun create_action_call_with_object<T: copy + drop>(action: String, args: T): ActionCall {
        let args_json = string::utf8(json::to_json(&args));
        ActionCall { action, args: args_json }
    }

    /// Create a new empty ActionResponse
    public fun create_empty_response(): ActionResponse {
        ActionResponse { actions: vector::empty() }
    }

    /// Add an action to an ActionResponse
    public fun add_action(response: &mut ActionResponse, action_call: ActionCall) {
        vector::push_back(&mut response.actions, action_call);
    }

    /// Convert ActionResponse to JSON string
    public fun response_to_json(response: &ActionResponse): String {
        string::utf8(json::to_json(response))
    }    

    /// Create an ActionResponse from a vector of ActionCalls
    public fun create_action_response(actions: vector<ActionCall>): ActionResponse {
        ActionResponse { actions }
    }

    /// Parse a line-based response string into an ActionResponse
    //TODO handle no line break case
    public fun parse_line_based_response(response: &String): ActionResponse {
        let actions = vector::empty<ActionCall>();
        let lines = string_utils::split(response, &string::utf8(b"\n"));
        
        let i = 0;
        let len = vector::length(&lines);
        
        while (i < len) {
            let line = string_utils::trim(vector::borrow(&lines, i));
            
            if (!string::is_empty(&line)) {
                // Find the first space to separate action name from parameters
                let line_bytes = string::bytes(&line);
                let line_len = vector::length(line_bytes);
                let j = 0;
                let found_space = false;
                
                while (j < line_len && !found_space) {
                    if (*vector::borrow(line_bytes, j) == 0x20) { // Space character (ASCII 32)
                        found_space = true;
                    } else {
                        j = j + 1;
                    }
                };
                
                if (found_space && j < line_len) {
                    let action = string::utf8(string_utils::get_substr(line_bytes, 0, j));
                    let args = string::utf8(string_utils::get_substr(line_bytes, j + 1, line_len));
                    
                    // Remove any extra spaces
                    let trimmed_action = string_utils::trim(&action);
                    let trimmed_args = string_utils::trim(&args);
                    
                    if (!string::is_empty(&trimmed_action) && !string::is_empty(&trimmed_args)) {
                        // Check for JSON format in args
                        if (string::index_of(&trimmed_args, &string::utf8(b"{")) == 0) {
                            let action_call = create_action_call(trimmed_action, trimmed_args);
                            vector::push_back(&mut actions, action_call);
                        }
                    }
                }
            };
            i = i + 1;
        };
        
        ActionResponse { actions }
    }

    /// Convert ActionResponse to string format
    public fun response_to_str(response: &ActionResponse): String {
        let result = string::utf8(b"");
        let actions = &response.actions;
        let len = vector::length(actions);
        let i = 0;
        
        while (i < len) {
            let action_call = vector::borrow(actions, i);
            
            // Add action name
            string::append(&mut result, action_call.action);
            string::append(&mut result, string::utf8(b" "));
            
            // Add parameters
            string::append(&mut result, action_call.args);
            
            // Add newline if not the last action
            if (i + 1 < len) {
                string::append(&mut result, string::utf8(b"\n"));
            };
            
            i = i + 1;
        };
        
        result
    }

    #[test_only]
    public fun init_for_test() {
        init();
    }

    #[test]
    fun test_dispatch_actions() {
        use nuwa_framework::agent;
        use nuwa_framework::memory;
        use nuwa_framework::memory_action;
        use nuwa_framework::response_action;
        use nuwa_framework::channel;
        use nuwa_framework::message;
        use nuwa_framework::agent_input;
        use nuwa_framework::message_for_agent;
        use rooch_framework::gas_coin::RGas;

        // Initialize
        nuwa_framework::genesis::init_for_test();

        let (agent, cap) = agent::create_default_test_agent();
        let test_addr = @0x42;
       

        let channel_id = channel::create_ai_home_channel(agent);
       
        // Using type-specific constructors with serialization
        let memory_args = memory_action::create_remember_user_args(
            string::utf8(b"User prefers detailed explanations"), 
            string::utf8(b"preference"),
            true,
        );
        
        let response_args = response_action::create_say_args(
            string::utf8(b"I understand you prefer detailed explanations.")
        );

        let memory_action = create_action_call_with_object(
            memory_action::action_name_remember_user(),
            memory_args
        );
        
        let response_action = create_action_call_with_object(
            response_action::action_name_say(), 
            response_args
        );

        // Alternative fluent API style
        let mut_response = create_empty_response();
        add_action(&mut mut_response, memory_action);
        add_action(&mut mut_response, response_action);
        let test_response = response_to_str(&mut_response);

        let message = message::new_message_for_test(
            1,
            channel_id,
            test_addr,
            string::utf8(b"Hi, I'm Alex. I prefer learning with real code examples and practical projects. I'm very interested in Move smart contracts and blockchain development. Could you help me learn?"),
            message::type_normal(),
            vector::empty(),
            0
        );
        let coin_input_info = agent_input_info::new_coin_input_info_by_type<RGas>(1000000000000000000u256);
        let agent_input = message_for_agent::new_agent_input(vector[message]);
        let agent_input_info = agent_input::into_agent_input_info(agent_input, coin_input_info);

        // Execute actions
        dispatch_actions_internal(agent, agent_input_info, test_response);

        // Verify memory was added
        let store = agent::borrow_memory_store(agent);
        let memories = memory::get_context_memories(store, test_addr);
        assert!(vector::length(&memories) == 1, 1);
        let memory = vector::borrow(&memories, 0);
        assert!(memory::get_content(memory) == string::utf8(b"User prefers detailed explanations"), 2);
        assert!(memory::get_context(memory) == string::utf8(b"preference"), 3);

        agent::destroy_agent_cap(cap);
    }

    #[test_only]
    #[data_struct]
    struct TestArgs has copy, drop {
        value: u64
    }

    #[test]
    fun test_response_builder() {
        // Test the fluent API for building responses
        let mut_response = create_empty_response();
        
        // Add a simple action with raw JSON
        add_action(&mut mut_response, create_action_call(
            string::utf8(b"response::say"),
            string::utf8(b"{\"content\":\"Hello world!\"}")
        ));
        
        add_action(&mut mut_response, create_action_call_with_object(
            string::utf8(b"test::action"),
            TestArgs { value: 42 }
        ));
        
        // Convert to JSON
        let json = response_to_json(&mut_response);
        
        // Parse back and verify
        let parsed = parse_response(json);
        let actions = get_actions(&parsed);
        assert!(vector::length(actions) == 2, 1);
        
        assert!(vector::borrow(actions, 0).action == string::utf8(b"response::say"), 2);
        assert!(vector::borrow(actions, 1).action == string::utf8(b"test::action"), 3);
    }

    #[test]
    fun test_response_to_str() {
        let mut_response = create_empty_response();
        
        add_action(&mut mut_response, create_action_call(
            string::utf8(b"memory::add"),
            string::utf8(b"{\"target\":\"0x42\",\"content\":\"test content\"}")
        ));
        
        add_action(&mut mut_response, create_action_call(
            string::utf8(b"response::say"),
            string::utf8(b"{\"channel_id\":\"0x123\",\"content\":\"Hello\"}")
        ));
        
        let str = response_to_str(&mut_response);
        
        // Parse back and verify
        let parsed = parse_line_based_response(&str);
        let actions = get_actions(&parsed);
        assert!(vector::length(actions) == 2, 1);
        
        let first_action = vector::borrow(actions, 0);
        assert!(get_action_name(first_action) == &string::utf8(b"memory::add"), 2);
        assert!(get_action_args(first_action) == &string::utf8(b"{\"target\":\"0x42\",\"content\":\"test content\"}"), 3);
        
        let second_action = vector::borrow(actions, 1);
        assert!(get_action_name(second_action) == &string::utf8(b"response::say"), 4);
        assert!(get_action_args(second_action) == &string::utf8(b"{\"channel_id\":\"0x123\",\"content\":\"Hello\"}"), 5);
    }

    #[test]
    fun test_parse_line_based_response() {
        // Test line-based format
        let response = string::utf8(b"memory::add {\"target\":\"0x42\",\"content\":\"test content\"}\nresponse::say {\"channel_id\":\"0x123\",\"content\":\"Hello\"}");
        let action_response = parse_line_based_response(&response);
        let actions = get_actions(&action_response);
        
        assert!(vector::length(actions) == 2, 1);
        
        let first_action = vector::borrow(actions, 0);
        assert!(get_action_name(first_action) == &string::utf8(b"memory::add"), 2);
        
        let second_action = vector::borrow(actions, 1);
        assert!(get_action_name(second_action) == &string::utf8(b"response::say"), 3);
    }

}