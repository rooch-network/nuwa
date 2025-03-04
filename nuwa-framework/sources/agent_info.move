module nuwa_framework::agent_info {
    use std::string::{Self, String};
    use std::vector;
    use moveos_std::json;
    use moveos_std::object::{ObjectID};

    #[data_struct]
    struct AgentInfo has copy, drop, store {
        id: ObjectID,
        name: String,            
        username: String,
        avatar: String,        
        agent_address: address,  // AI's agent address
        description: String,
        bio: vector<String>,
        knowledge: vector<String>,
        model_provider: String,
    }

    public fun new_agent_info(
        id: ObjectID,
        name: String,
        username: String,
        avatar: String,
        agent_address: address,
        description: String,
        bio: vector<String>,
        knowledge: vector<String>,
        model_provider: String,
    ): AgentInfo {
        AgentInfo {
            id,
            name,
            username,
            avatar,
            agent_address,
            description,
            bio,
            knowledge,
            model_provider,
        }
    }

    // ============ Getters ============
    public fun get_id(agent_info: &AgentInfo): ObjectID {
        agent_info.id
    }

    public fun get_name(agent_info: &AgentInfo): &String {
        &agent_info.name
    }

    public fun get_username(agent_info: &AgentInfo): &String {
        &agent_info.username
    }

    public fun get_avatar(agent_info: &AgentInfo): &String {
        &agent_info.avatar
    }

    public fun get_agent_address(agent_info: &AgentInfo): address {
        agent_info.agent_address
    }

    public fun get_description(agent_info: &AgentInfo): &String {
        &agent_info.description
    }

    public fun get_bio(agent_info: &AgentInfo): &vector<String> {
        &agent_info.bio
    }

    public fun get_knowledge(agent_info: &AgentInfo): &vector<String> {
        &agent_info.knowledge
    }

    public fun get_model_provider(agent_info: &AgentInfo): &String {
        &agent_info.model_provider
    }

    /// The PromptAgentInfo struct is used to display agent information in a prompt
    struct PromptAgentInfo has copy, drop, store {
        name: String,            
        username: String,
        avatar: String,        
        agent_address: address,  // AI's agent address
        description: String,
        bio: vector<String>,
        knowledge: vector<String>,
        model_provider: String,
    }

    public fun to_prompt(agent_info: &AgentInfo): String {
        let prompt_agent_info = PromptAgentInfo {
            name: agent_info.name,
            username: agent_info.username,
            avatar: agent_info.avatar,
            agent_address: agent_info.agent_address,
            description: agent_info.description,
            bio: agent_info.bio,
            knowledge: agent_info.knowledge,
            model_provider: agent_info.model_provider,
        };
        let prompt = b"```json\n";
        vector::append(&mut prompt, json::to_json(&prompt_agent_info));
        vector::append(&mut prompt, b"\n```");
        string::utf8(prompt)
    }
}