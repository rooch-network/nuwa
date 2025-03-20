module nuwa_framework::memory_info {
    use std::string::{Self, String};
    use nuwa_framework::memory::{Memory};
    use nuwa_framework::string_utils::{build_json_section};
    
    struct MemoryInfo has copy, drop, store {
        self_memories: vector<Memory>,
        user_memories: vector<Memory>,
    }
    
    public fun new(self_memories: vector<Memory>, user_memories: vector<Memory>): MemoryInfo {
        MemoryInfo {
            self_memories,
            user_memories,
        }
    }

    public fun format_prompt(memory_info: &MemoryInfo): String {
        let result = string::utf8(b"");
        string::append(&mut result, string::utf8(b"Self-Memories\n"));
        string::append(&mut result, build_json_section(&memory_info.self_memories));
        string::append(&mut result, string::utf8(b"Relational Memories about the sender\n"));
        string::append(&mut result, build_json_section(&memory_info.user_memories));
        result
    }

    #[test_only]
    public fun mock_memory_info(): MemoryInfo {
        use std::vector;
        let self_memories = vector::empty();
        let user_memories = vector::empty();
        new(self_memories, user_memories)
    }

}