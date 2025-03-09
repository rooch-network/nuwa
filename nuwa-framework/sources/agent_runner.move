module nuwa_framework::agent_runner {

    use std::string::{String};
    use std::vector;
    use moveos_std::object::{Self, Object};

    use rooch_framework::coin::{Self, Coin};
    use rooch_framework::gas_coin::RGas;

    use nuwa_framework::action::ActionGroup;
    use nuwa_framework::agent_input::{Self, AgentInput};
    use nuwa_framework::ai_request;
    use nuwa_framework::ai_service;
    use nuwa_framework::prompt_builder;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action_dispatcher;
    use nuwa_framework::state_providers;


    public fun generate_system_prompt<I: copy + drop>(
        agent: &Object<Agent>,
        input: AgentInput<I>,
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
        coin::destroy_zero(fee);
        let agent_id = object::id(agent_obj);
        let model_provider = *agent::get_agent_model_provider(agent_obj);
        
        let input_info = agent_input::to_agent_input_info_v2(input);
        // Generate system prompt with context
        let system_prompt = generate_system_prompt(
            agent_obj,
            input
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