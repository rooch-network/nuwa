module nuwa_framework::agent_runner {

    use std::string::{String};
    use std::vector;
    use moveos_std::object::{Self, Object};
    use moveos_std::decimal_value;
    use moveos_std::type_info;

    use rooch_framework::coin::{Self, Coin};
    use rooch_framework::gas_coin::RGas;
    use rooch_framework::account_coin_store;

    use nuwa_framework::action::ActionGroup;
    use nuwa_framework::agent_input::{Self, AgentInput, CoinInputInfo};
    use nuwa_framework::ai_request;
    use nuwa_framework::ai_service;
    use nuwa_framework::prompt_builder;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action_dispatcher;
    use nuwa_framework::state_providers;


    public fun generate_system_prompt<I: copy + drop>(
        _agent: &Object<Agent>,
        _input: AgentInput<I>,
    ): String {
        abort 0
    }

    public fun generate_system_prompt_v2<I: copy + drop>(
        agent: &Object<Agent>,
        input: AgentInput<I>,
        input_coin: CoinInputInfo,
    ): String {
        let states = state_providers::get_agent_state(agent);
        std::debug::print(&states);
        let available_actions = get_available_actions(&input);
        let agent_info = agent::get_agent_info_v2(agent);
        let memory_store = agent::borrow_memory_store(agent);
        prompt_builder::build_complete_prompt_v3(
            agent_info,
            memory_store,
            input,
            input_coin,
            available_actions,
            states,
        )
    }

    public fun process_input<I: copy + drop>(
        _caller: &signer,
        _agent_obj: &mut Object<Agent>,
        _input: AgentInput<I>,
        _fee: Coin<RGas>,
    ) {
       abort 0
    }

    public fun process_input_v2<I: copy + drop + store>(
        caller: &signer,
        agent_obj: &mut Object<Agent>,
        input: AgentInput<I>,
        fee: Coin<RGas>,
    ) {
        //keep a fee argument for future usage.
        
        let agent_id = object::id(agent_obj);
        let model_provider = *agent::get_agent_model_provider(agent_obj);
        
        let input_info = agent_input::to_agent_input_info_v2(input);
        
        let coin_type = type_info::type_name<RGas>();
        let coin_symbol = coin::symbol_by_type<RGas>();
        let decimals = coin::decimals_by_type<RGas>();
        let amount = coin::value(&fee);
        let agent_addr = agent::get_agent_address(agent_obj);
        account_coin_store::deposit<RGas>(agent_addr, fee);
        let coin_input_info = agent_input::new_coin_input_info(
            coin_symbol,
            coin_type,
            decimal_value::new(amount, decimals),
        );
        // Generate system prompt with context
        let system_prompt = generate_system_prompt_v2(
            agent_obj,
            input,
            coin_input_info,
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

        // Call AI service
        ai_service::request_ai(caller, agent_id, input_info, chat_request);

        agent::update_last_active_timestamp(agent_obj);
    }

    fun get_available_actions<I: drop>(_input: &AgentInput<I>): vector<ActionGroup> {
        action_dispatcher::get_action_groups()
    }
}