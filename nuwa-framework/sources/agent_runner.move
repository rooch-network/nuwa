module nuwa_framework::agent_runner {

    use std::string::{Self, String};
    use std::vector;
    use std::option;
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::decimal_value;
    use moveos_std::type_info;
    use moveos_std::result::{Self, is_err};

    use rooch_framework::coin::{Self, Coin};
    use rooch_framework::gas_coin::RGas;
    use rooch_framework::account_coin_store;

    use nuwa_framework::action::ActionGroup;
    use nuwa_framework::agent_input::{Self, AgentInput};
    use nuwa_framework::agent_input_info::{Self, AgentInputInfo};
    use nuwa_framework::ai_request;
    use nuwa_framework::ai_service;
    use nuwa_framework::prompt_builder;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action_dispatcher;
    use nuwa_framework::state_providers;
    use nuwa_framework::task_spec;
    use nuwa_framework::agent_cap::{AgentCap};
    use nuwa_framework::config;
    use nuwa_framework::channel::{Self, Channel};

    friend nuwa_framework::channel_entry;
    friend nuwa_framework::ai_callback;

    const ErrorInsufficientBaseFee: u64 = 1;


    public fun generate_system_prompt(
        agent: &Object<Agent>,
        agent_input_info: AgentInputInfo,
    ): String {
        let states = state_providers::get_agent_state(agent);
        let available_actions = get_available_actions();
        let agent_info = agent::get_agent_info(agent);
        let memory_store = agent::borrow_memory_store(agent);
        let task_specs = agent::get_agent_task_specs(agent);
        task_spec::merge_task_specifications(&mut task_specs, *agent_input_info::get_app_task_specs(&agent_input_info));
        prompt_builder::build_complete_prompt_internal(
            agent_info,
            memory_store,
            agent_input_info,
            available_actions,
            task_specs,
            states,
        )
    }

    fun process_input_internal(
        agent_obj: &mut Object<Agent>,
        input_info: AgentInputInfo,
    ) {
        let agent_id = object::id(agent_obj);
        let model_provider = *agent::get_agent_model_provider(agent_obj);
        
        // Generate system prompt with context
        let system_prompt = generate_system_prompt(
            agent_obj,
            input_info,
        );
        // Create chat messages
        let messages = vector::empty();
        
        // Add system message
        vector::push_back(&mut messages, ai_request::new_system_chat_message(system_prompt));

        // Create chat request
        let chat_request = ai_request::new_chat_request(
            model_provider,
            messages,
        );
        //Use the agent signer to call the AI service
        let agent_signer = agent::create_agent_signer(agent_obj);  
        // Call AI service
        let result = ai_service::request_ai(&agent_signer, agent_id, input_info, chat_request); 
        if (is_err(&result)) {
            let ai_addr = agent::get_agent_address(agent_obj);
            let err = result::unwrap_err(result);
            let response = string::utf8(b"Call AI agent failed:");
            string::append(&mut response, err);
            let channel_id = agent_input_info::get_response_channel_id(&input_info);
            let channel_obj = object::borrow_mut_object_shared<Channel>(channel_id);
            channel::add_ai_response(channel_obj, response, ai_addr, 0);
        }else{
            let request_id = result::unwrap(result);
            agent::add_processing_request(agent_obj, request_id);
        };
    }

    public(friend) fun submit_input_internal<I: copy + drop + store>(
        agent_obj: &mut Object<Agent>,
        input: AgentInput<I>,
        fee: Coin<RGas>, 
    ) {
        
        let coin_type = type_info::type_name<RGas>();
        let coin_symbol = coin::symbol_by_type<RGas>();
        let decimals = coin::decimals_by_type<RGas>();
        let amount = coin::value(&fee);
        assert!(amount >= config::get_ai_agent_base_fee(), ErrorInsufficientBaseFee);
        let agent_addr = agent::get_agent_address(agent_obj);
        account_coin_store::deposit<RGas>(agent_addr, fee);

        let amount_except_base_fee = amount - config::get_ai_agent_base_fee();

        let coin_input_info = agent_input_info::new_coin_input_info(
            coin_symbol,
            coin_type,
            decimal_value::new(amount_except_base_fee, decimals),
        );

        let input_info = agent_input::into_agent_input_info(input, coin_input_info);
        agent::append_input(agent_obj, input_info);
        agent::update_last_active_timestamp(agent_obj);
    }

    public fun submit_input_by_cap<I: copy + drop + store>(
        agent_obj: &mut Object<Agent>,
        input: AgentInput<I>,
        fee: Coin<RGas>,
        _agent_cap: &mut Object<AgentCap>,
    ) {
        submit_input_internal(agent_obj, input, fee)
    }

    /// Try to process the input of the agent
    public entry fun try_process_input(agent_obj: &mut Object<Agent>){
        if (agent::is_processing_request(agent_obj)) {
            return
        };
        let input = agent::dequeue_input(agent_obj);
        if (option::is_some(&input)) {
            let input = option::destroy_some(input);
            process_input_internal(agent_obj, input)
        }
    }

    public(friend) entry fun finish_request(agent_obj: &mut Object<Agent>, request_id: ObjectID) {
        agent::finish_request(agent_obj, request_id);
    }

    fun get_available_actions(): vector<ActionGroup> {
        action_dispatcher::get_action_groups()
    }
}