module nuwa_framework::agent_runner {

    use std::string::{String};
    use std::vector;
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::decimal_value;
    use moveos_std::type_info;
    use moveos_std::result::{Result};

    use rooch_framework::coin::{Self, Coin};
    use rooch_framework::gas_coin::RGas;
    use rooch_framework::account_coin_store;

    use nuwa_framework::action::ActionGroup;
    use nuwa_framework::agent_input_v2::{Self, AgentInput};
    use nuwa_framework::agent_input_info::{Self, AgentInputInfo};
    use nuwa_framework::ai_request;
    use nuwa_framework::ai_service;
    use nuwa_framework::prompt_builder;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action_dispatcher;
    use nuwa_framework::state_providers;
    use nuwa_framework::task_spec::{Self, TaskSpecifications};
    use nuwa_framework::agent_cap::{AgentCap};
    use nuwa_framework::config;

    friend nuwa_framework::channel_entry;

    const ErrorInsufficientBaseFee: u64 = 1;

    public fun generate_system_prompt<I: copy + drop>(
        _agent: &Object<Agent>,
        _input: nuwa_framework::agent_input::AgentInput<I>,
    ): String {
        abort 0
    }

    public fun generate_system_prompt_v2<I: copy + drop>(
        _agent: &Object<Agent>,
        _input: nuwa_framework::agent_input::AgentInput<I>,
        _input_coin: nuwa_framework::agent_input::CoinInputInfo,
    ): String {
        abort 0
    }

    public fun generate_system_prompt_v3(
        agent: &Object<Agent>,
        agent_input_info: AgentInputInfo,
        app_task_specs: TaskSpecifications,
    ): String {
        let states = state_providers::get_agent_state(agent);
        let available_actions = get_available_actions();
        let agent_info = agent::get_agent_info_v2(agent);
        let memory_store = agent::borrow_memory_store(agent);
        let task_specs = agent::get_agent_task_specs(agent);
        task_spec::merge_task_specifications(&mut task_specs, app_task_specs);
        prompt_builder::build_complete_prompt_internal(
            agent_info,
            memory_store,
            agent_input_info,
            available_actions,
            task_specs,
            states,
        )
    }

    public fun process_input<I: copy + drop>(
        _caller: &signer,
        _agent_obj: &mut Object<Agent>,
        _input: nuwa_framework::agent_input::AgentInput<I>,
        _fee: Coin<RGas>,
    ) {
       abort 0
    }

    public fun process_input_v2<I: copy + drop + store>(
        _caller: &signer,
        _agent_obj: &mut Object<Agent>,
        _input: nuwa_framework::agent_input::AgentInput<I>,
        _fee: Coin<RGas>,
    ) {
        abort 0
    }

    public(friend) fun process_input_internal<I: copy + drop + store>(
        agent_obj: &mut Object<Agent>,
        input: AgentInput<I>,
        fee: Coin<RGas>,
        app_task_specs: TaskSpecifications,
    ) : Result<ObjectID, String> {
        
        let agent_id = object::id(agent_obj);
        let model_provider = *agent::get_agent_model_provider(agent_obj);
         
        
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

        let input_info = agent_input_v2::into_agent_input_info(input, coin_input_info);
        // Generate system prompt with context
        let system_prompt = generate_system_prompt_v3(
            agent_obj,
            input_info,
            app_task_specs,
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

        agent::update_last_active_timestamp(agent_obj);
        result
    }

    public fun process_input_by_cap<I: copy + drop + store>(
        agent_obj: &mut Object<Agent>,
        input: AgentInput<I>,
        fee: Coin<RGas>,
        app_task_specs: TaskSpecifications,
        _agent_cap: &mut Object<AgentCap>,
    ) : Result<ObjectID, String> {
        
        process_input_internal(agent_obj, input, fee, app_task_specs)
    }

    fun get_available_actions(): vector<ActionGroup> {
        action_dispatcher::get_action_groups()
    }
}