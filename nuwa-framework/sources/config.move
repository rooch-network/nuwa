module nuwa_framework::config {

    /// The number of history messages to send to the AI agent
    const HISTORY_MESSAGE_SIZE: u64 = 10;
    public fun get_history_message_size(): u64 {
        HISTORY_MESSAGE_SIZE
    }
    
    /// The base fee to call the AI agent, default is 5 RGas
    const AI_AGENT_BASE_FEE: u256 = 5_0000_0000;
    public fun get_ai_agent_base_fee(): u256 {
        AI_AGENT_BASE_FEE
    }

    /// The initial fee to create an AI agent, default is 100 RGas
    const AI_AGENT_INITIAL_FEE: u256 = 100_0000_0000;
    public fun get_ai_agent_initial_fee(): u256 {
        AI_AGENT_INITIAL_FEE
    }
}