module nuwa_framework::agent_runner {

    use std::string::{Self, String};
    use std::vector;
    use moveos_std::object::{Self, Object, ObjectID};
    use moveos_std::signer;
    use moveos_std::timestamp;

    use nuwa_framework::character::{Self, Character};
    use nuwa_framework::agent_cap::{Self, AgentCap};
    use nuwa_framework::memory::{Self, MemoryStore};
    use nuwa_framework::action::{Self, ActionDescription};
    use nuwa_framework::agent_input::{AgentInput};
    use nuwa_framework::agent_state::{Self, AgentStates};
    use nuwa_framework::ai_request;
    use nuwa_framework::ai_service;
    use nuwa_framework::prompt_builder;
    use nuwa_framework::agent::{Self, Agent};

    public fun generate_system_prompt<I: copy + drop>(
        agent: &Object<Agent>,
        states: AgentStates,
        input: AgentInput<I>,
    ): String {
        let character = object::borrow(&agent.character);
        let available_actions = agent::get_available_actions(&input);
        let agent_info = agent::get_agent_info(agent);
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
        caller: &signer,
        agent_obj: &mut Object<Agent>,
        input: AgentInput<I>,
        fee: Coin<RGas>,
    ) {
        //keep a fee argument for future usage.
        coin::destroy_zero(fee);
        let agent_id = object::id(agent_obj);
        let model_provider = agent::get_agent_model_provider(agent_obj);
        
        // Generate system prompt with context
        let system_prompt = generate_system_prompt(
            agent_obj,
            states,
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
        ai_service::request_ai(caller, agent_id, chat_request);

        agent::update_last_active_timestamp(agent_obj);
    }
}