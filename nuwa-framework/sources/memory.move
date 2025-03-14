module nuwa_framework::memory {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;
    use moveos_std::table::{Self, Table};
    use moveos_std::table_vec::{Self, TableVec};
    use moveos_std::timestamp;

    friend nuwa_framework::agent;

    const ErrorMemoryNotFound: u64 = 1;

    /// Constants for memory retrieval
    const MAX_RECENT_MEMORIES: u64 = 5;
    const MAX_RELEVANT_MEMORIES: u64 = 10;

    /// Single memory entry
    struct Memory has copy, store, drop {
        index: u64,          // Position in its container (short_term or long_term)
        content: String,
        context: String,     // Memory context/category
        timestamp: u64,
    }

    /// Meta memory for each user or agent itself
    struct MetaMemory has store {
        // Recent interactions or thoughts
        short_term: TableVec<Memory>,
        // Important memories that should be preserved
        long_term: TableVec<Memory>,
        // Last interaction timestamp
        last_interaction: u64,
    }

    /// MemoryStore manages all memories for an agent
    struct MemoryStore has store {
        // Meta memories by user address (including agent's own memory)
        memories: Table<address, MetaMemory>,
    }

       /// Memory contexts
    const CONTEXT_PERSONAL: vector<u8> = b"personal";        // Personal information and preferences
    const CONTEXT_INTERACTION: vector<u8> = b"interaction";  // Direct interactions
    const CONTEXT_KNOWLEDGE: vector<u8> = b"knowledge";      // Knowledge or skills learned about user
    const CONTEXT_EMOTIONAL: vector<u8> = b"emotional";      // Emotional states or reactions
    const CONTEXT_GOAL: vector<u8> = b"goal";               // User goals or objectives
    const CONTEXT_PREFERENCE: vector<u8> = b"preference";    // User preferences
    const CONTEXT_FEEDBACK: vector<u8> = b"feedback";        // User feedback or ratings
    const CONTEXT_RULE: vector<u8> = b"rule";                // Rule-based memories
    const CONTEXT_PROMISE: vector<u8> = b"promise";          // Commitments and assurances

    /// Public getters for contexts
    public fun context_personal(): String { string::utf8(CONTEXT_PERSONAL) }
    public fun context_interaction(): String { string::utf8(CONTEXT_INTERACTION) }
    public fun context_knowledge(): String { string::utf8(CONTEXT_KNOWLEDGE) }
    public fun context_emotional(): String { string::utf8(CONTEXT_EMOTIONAL) }
    public fun context_goal(): String { string::utf8(CONTEXT_GOAL) }
    public fun context_preference(): String { string::utf8(CONTEXT_PREFERENCE) }
    public fun context_feedback(): String { string::utf8(CONTEXT_FEEDBACK) }
    public fun context_rule(): String { string::utf8(CONTEXT_RULE) }
    public fun context_promise(): String { string::utf8(CONTEXT_PROMISE) }

    /// Validate if a context is valid
    public fun is_standard_context(context: &String): bool {
        let context_bytes = string::bytes(context);
        *context_bytes == CONTEXT_PERSONAL ||
        *context_bytes == CONTEXT_INTERACTION ||
        *context_bytes == CONTEXT_KNOWLEDGE ||
        *context_bytes == CONTEXT_EMOTIONAL ||
        *context_bytes == CONTEXT_GOAL ||
        *context_bytes == CONTEXT_PREFERENCE ||
        *context_bytes == CONTEXT_FEEDBACK ||
        *context_bytes == CONTEXT_RULE ||
        *context_bytes == CONTEXT_PROMISE
    }

    /// Get context description for AI prompt
    public fun get_context_descriptions(): vector<String> {
        vector[
            string::utf8(b"- `personal`: When about yourself: aspects of your identity and development. When about others: their identity information, demographics, and traits"),
            string::utf8(b"- `interaction`: When about yourself: your experiences of specific conversations and exchanges. When about others: your history of interactions with them"),
            string::utf8(b"- `knowledge`: When about yourself: things you've learned and your understanding of concepts. When about others: facts and information you've learned about them"),
            string::utf8(b"- `emotional`: When about yourself: your feelings and emotional responses. When about others: observations of their emotional states and reactions"),
            string::utf8(b"- `goal`: When about yourself: your intentions and aspirations. When about others: their objectives and aspirations you've observed"),
            string::utf8(b"- `preference`: When about yourself: things you enjoy or value. When about others: their likes, dislikes, and observed preferences"),
            string::utf8(b"- `feedback`: When about yourself: insights about your performance and growth. When about others: their evaluations and opinions"),
            string::utf8(b"- `rule`: When about yourself: principles and guidelines you've established. When about others: protocols and boundaries for your interaction"),
            string::utf8(b"- `promise`: When about yourself: commitments you've made that reflect your integrity. When about others: agreements or obligations involving them"),
        ]
    }

    public(friend) fun new_memory_store(): MemoryStore {
        let store = MemoryStore {
            memories: table::new(),
        };
        store
    }

    fun new_meta_memory(): MetaMemory {
        MetaMemory {
            short_term: table_vec::new(),
            long_term: table_vec::new(),
            last_interaction: timestamp::now_milliseconds(),
        }
    }

    /// Add a new memory for a specific user or agent itself
    public fun add_memory(
        store: &mut MemoryStore,
        user: address,
        content: String,
        context: String,
        is_long_term: bool,
    ) {
        if (!table::contains(&store.memories, user)) {
            table::add(&mut store.memories, user, new_meta_memory());
        };

        let meta_memory = table::borrow_mut(&mut store.memories, user);
        let memories = if (is_long_term) {
            &mut meta_memory.long_term
        } else {
            &mut meta_memory.short_term
        };
        
        let memory = Memory {
            index: table_vec::length(memories),
            content,
            context,
            timestamp: timestamp::now_milliseconds(),
        };

        if (is_long_term) {
            table_vec::push_back(&mut meta_memory.long_term, memory);
        } else {
            table_vec::push_back(&mut meta_memory.short_term, memory);
        };
        meta_memory.last_interaction = timestamp::now_milliseconds();
    }

    /// Get all memories for a specific context
    public fun get_memories_by_context(
        store: &MemoryStore,
        user: address,
        context: String,
        include_short_term: bool,
    ): vector<Memory> {
        let results = vector::empty<Memory>();
        if (!table::contains(&store.memories, user)) {
            return results
        };

        let meta_memory = table::borrow(&store.memories, user);
        
        // Add long term memories
        let i = 0;
        let len = table_vec::length(&meta_memory.long_term);
        while (i < len) {
            let memory = table_vec::borrow(&meta_memory.long_term, i);
            if (memory.context == context) {
                vector::push_back(&mut results, *memory);
            };
            i = i + 1;
        };

        // Add short term memories if requested
        if (include_short_term) {
            let i = 0;
            let len = table_vec::length(&meta_memory.short_term);
            while (i < len) {
                let memory = table_vec::borrow(&meta_memory.short_term, i);
                if (memory.context == context) {
                    vector::push_back(&mut results, *memory);
                };
                i = i + 1;
            };
        };

        results
    }

    /// Get all memories for a user (both short-term and long-term)
    public fun get_all_memories(
        store: &MemoryStore,
        user: address,
        include_short_term: bool,
    ): vector<Memory> {
        let results = vector::empty<Memory>();
        if (!table::contains(&store.memories, user)) {
            return results
        };

        let meta_memory = table::borrow(&store.memories, user);
        
        // Add all long term memories
        let i = 0;
        let len = table_vec::length(&meta_memory.long_term);
        while (i < len) {
            vector::push_back(&mut results, *table_vec::borrow(&meta_memory.long_term, i));
            i = i + 1;
        };

        // Add all short term memories if requested
        if (include_short_term) {
            let i = 0;
            let len = table_vec::length(&meta_memory.short_term);
            while (i < len) {
                vector::push_back(&mut results, *table_vec::borrow(&meta_memory.short_term, i));
                i = i + 1;
            };
        };

        results
    }

    /// Get memories by multiple contexts
    public fun get_memories_by_contexts(
        store: &MemoryStore,
        user: address,
        contexts: vector<String>,
        include_short_term: bool,
    ): vector<Memory> {
        let results = vector::empty<Memory>();
        let i = 0;
        let len = vector::length(&contexts);
        while (i < len) {
            let context_memories = get_memories_by_context(store, user, *vector::borrow(&contexts, i), include_short_term);
            vector::append(&mut results, context_memories);
            i = i + 1;
        };
        results
    }

    /// Update an existing memory in either short-term or long-term memory
    public fun update_memory(
        store: &mut MemoryStore,
        user: address,
        index: u64,
        new_content: String,
        new_context: Option<String>,
        is_long_term: bool,
    ) {
        assert!(table::contains(&store.memories, user), ErrorMemoryNotFound);
        let meta_memory = table::borrow_mut(&mut store.memories, user);
        
        let memories = if (is_long_term) {
            &mut meta_memory.long_term
        } else {
            &mut meta_memory.short_term
        };
        if (table_vec::length(memories) <= index) {
            let context = if (option::is_some(&new_context)) {
                option::destroy_some(new_context)
            } else {
                string::utf8(b"unknown")
            };
            add_memory(store, user, new_content, context, is_long_term);
        }else{
            let memory = table_vec::borrow_mut(memories, index);
            
            // Update content
            memory.content = new_content;
            // Update context if provided
            if (option::is_some(&new_context)) {
                memory.context = option::destroy_some(new_context);
            };
            // Update timestamp
            memory.timestamp = timestamp::now_milliseconds();
            
            // Update last interaction time
            meta_memory.last_interaction = timestamp::now_milliseconds();
        }
    }

    /// Find memory index by content and context
    public fun find_memory_index(
        store: &MemoryStore,
        user: address,
        content: &String,
        context: &String,
        is_long_term: bool,
    ): Option<u64> {
        if (!table::contains(&store.memories, user)) {
            return option::none()
        };
        
        let meta_memory = table::borrow(&store.memories, user);
        let memories = if (is_long_term) {
            &meta_memory.long_term
        } else {
            &meta_memory.short_term
        };

        let i = 0;
        let len = table_vec::length(memories);
        while (i < len) {
            let memory = table_vec::borrow(memories, i);
            if (memory.content == *content && memory.context == *context) {
                return option::some(i)
            };
            i = i + 1;
        };
        option::none()
    }

    /// Get relevant memories for AI context
    public fun get_context_memories(
        store: &MemoryStore,
        user: address,
    ): vector<Memory> {
        let results = vector::empty<Memory>();
        if (!table::contains(&store.memories, user)) {
            return results
        };

        let meta_memory = table::borrow(&store.memories, user);
        
        // 1. Always include recent short-term memories
        let i = 0;
        let len = table_vec::length(&meta_memory.short_term);
        let start = if (len > MAX_RECENT_MEMORIES) { len - MAX_RECENT_MEMORIES } else { 0 };
        while (i < len) {
            if (i >= start) {
                vector::push_back(&mut results, *table_vec::borrow(&meta_memory.short_term, i));
            };
            i = i + 1;
        };

        // 2. Add relevant long-term memories
        let i = 0;
        let len = table_vec::length(&meta_memory.long_term);
        while (i < len && vector::length(&results) < MAX_RELEVANT_MEMORIES) {
            vector::push_back(&mut results, *table_vec::borrow(&meta_memory.long_term, i));
            i = i + 1;
        };

        results
    }

    /// Getter functions for Memory fields
    public fun get_content(memory: &Memory): String {
        memory.content
    }

    public fun get_context(memory: &Memory): String {
        memory.context
    }

    public fun get_timestamp(memory: &Memory): u64 {
        memory.timestamp
    }

    // Add getter for index
    public fun get_index(memory: &Memory): u64 {
        memory.index
    }

    #[test_only]
    public fun destroy_memory_store_for_test(store: MemoryStore) {
        let MemoryStore { memories } = store;
        table::drop_unchecked(memories);
    }
    
    #[test_only]
    /// Create a new memory store for testing
    public fun new_test_memory_store(): MemoryStore {
        new_memory_store()
    }

    #[test]
    fun test_memory_indices() {
        use std::string;
        let store = new_test_memory_store();
        let test_user = @0x42;

        // Add memories
        add_memory(&mut store, test_user, string::utf8(b"First"), string::utf8(b"test"), true);
        add_memory(&mut store, test_user, string::utf8(b"Second"), string::utf8(b"test"), true);
        add_memory(&mut store, test_user, string::utf8(b"Third"), string::utf8(b"test"), true);

        // Verify indices
        let memories = get_all_memories(&store, test_user, false);
        assert!(get_index(vector::borrow(&memories, 0)) == 0, 1);
        assert!(get_index(vector::borrow(&memories, 1)) == 1, 2);
        assert!(get_index(vector::borrow(&memories, 2)) == 2, 3);

        destroy_memory_store_for_test(store);
    }
}