module nuwa_framework::memory {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;
    use moveos_std::table::{Self, Table};
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
        timestamp: u64,
    }

    /// Meta memory for each user or agent itself
    struct MetaMemory has store {
        // Recent interactions or thoughts
        short_term: Table<u64, Memory>,
        // Important memories that should be preserved
        long_term: Table<u64, Memory>,
        // Last interaction timestamp
        last_interaction: u64,
    }

    /// MemoryStore manages all memories for an agent
    struct MemoryStore has store {
        // Meta memories by user address (including agent's own memory)
        memories: Table<address, MetaMemory>,
    }
 
    public(friend) fun new_memory_store(): MemoryStore {
        let store = MemoryStore {
            memories: table::new(),
        };
        store
    }

    fun new_meta_memory(): MetaMemory {
        MetaMemory {
            short_term: table::new(),
            long_term: table::new(),
            last_interaction: timestamp::now_milliseconds(),
        }
    }

    /// Add a new memory for a specific user or agent itself
    public fun add_memory(
        store: &mut MemoryStore,
        user: address,
        content: String,
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
        let index = table::length(memories);
        let memory = Memory {
            index,
            content,
            timestamp: timestamp::now_milliseconds(),
        };

        if (is_long_term) {
            table::add(&mut meta_memory.long_term, index, memory);
        } else {
            table::add(&mut meta_memory.short_term, index, memory);
        };
        meta_memory.last_interaction = timestamp::now_milliseconds();
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
        let len = table::length(&meta_memory.long_term);
        while (i < len) {
            vector::push_back(&mut results, *table::borrow(&meta_memory.long_term, i));
            i = i + 1;
        };

        // Add all short term memories if requested
        if (include_short_term) {
            let i = 0;
            let len = table::length(&meta_memory.short_term);
            while (i < len) {
                vector::push_back(&mut results, *table::borrow(&meta_memory.short_term, i));
                i = i + 1;
            };
        };

        results
    }


    /// Update an existing memory in either short-term or long-term memory
    public fun update_memory(
        store: &mut MemoryStore,
        user: address,
        index: u64,
        new_content: String,
        is_long_term: bool,
    ) {
        assert!(table::contains(&store.memories, user), ErrorMemoryNotFound);
        let meta_memory = table::borrow_mut(&mut store.memories, user);
        
        let memories = if (is_long_term) {
            &mut meta_memory.long_term
        } else {
            &mut meta_memory.short_term
        };
        if (!table::contains(memories, index)) {
            add_memory(store, user, new_content, is_long_term);
        }else{
            let memory = table::borrow_mut(memories, index);
            
            // Update content
            memory.content = new_content;
            // Update timestamp
            memory.timestamp = timestamp::now_milliseconds();
            
            // Update last interaction time
            meta_memory.last_interaction = timestamp::now_milliseconds();
        }
    }

    public fun compact_memory(store: &mut MemoryStore, user: address, original_memory: vector<Memory>, compact_memory: String, is_long_term: bool) {
        let meta_memory = table::borrow_mut(&mut store.memories, user);
        let memories = if (is_long_term) {
            &mut meta_memory.long_term
        } else {
            &mut meta_memory.short_term
        };
        let len = vector::length(&original_memory);
        let i = 0;
        while (i < len) {
            let memory = vector::borrow(&original_memory, i);
            if (table::contains(memories, memory.index)) {
                table::remove(memories, memory.index);
            };
            i = i + 1;
        };
        add_memory(store, user, compact_memory, is_long_term);
    }

    /// Find memory index by content and context
    fun find_memory_index(
        store: &MemoryStore,
        user: address,
        content: &String,
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
        let len = table::length(memories);
        while (i < len) {
            let memory = table::borrow(memories, i);
            if (memory.content == *content) {
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
        let len = table::length(&meta_memory.short_term);
        let start = if (len > MAX_RECENT_MEMORIES) { len - MAX_RECENT_MEMORIES } else { 0 };
        while (i < len) {
            if (i >= start) {
                if (table::contains(&meta_memory.short_term, i)) {
                    vector::push_back(&mut results, *table::borrow(&meta_memory.short_term, i));
                };
            };
            i = i + 1;
        };

        // 2. Add relevant long-term memories
        let i = 0;
        let len = table::length(&meta_memory.long_term);
        while (i < len && vector::length(&results) < MAX_RELEVANT_MEMORIES) {
            if (table::contains(&meta_memory.long_term, i)) {
                vector::push_back(&mut results, *table::borrow(&meta_memory.long_term, i));
            };
            i = i + 1;
        };

        results
    }

    /// Getter functions for Memory fields
    public fun get_content(memory: &Memory): String {
        memory.content
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
        add_memory(&mut store, test_user, string::utf8(b"First"), true);
        add_memory(&mut store, test_user, string::utf8(b"Second"), true);
        add_memory(&mut store, test_user, string::utf8(b"Third"), true);

        // Verify indices
        let memories = get_all_memories(&store, test_user, false);
        assert!(get_index(vector::borrow(&memories, 0)) == 0, 1);
        assert!(get_index(vector::borrow(&memories, 1)) == 1, 2);
        assert!(get_index(vector::borrow(&memories, 2)) == 2, 3);

        destroy_memory_store_for_test(store);
    }

    #[test]
    fun test_add_memory() {
        let store = new_test_memory_store();
        let test_user = @0x42;
        add_memory(&mut store, test_user, string::utf8(b"First"), true);
        let memories = get_all_memories(&store, test_user, false);
        assert!(get_index(vector::borrow(&memories, 0)) == 0, 1);
        destroy_memory_store_for_test(store);
    }

    #[test]
    fun test_update_memory(){
        let store = new_test_memory_store();
        let test_user = @0x42;
        add_memory(&mut store, test_user, string::utf8(b"First"), true);
        update_memory(&mut store, test_user, 0, string::utf8(b"Updated"), true);
        let memories = get_all_memories(&store, test_user, false);
        assert!(get_index(vector::borrow(&memories, 0)) == 0, 1);
        assert!(get_content(vector::borrow(&memories, 0)) == string::utf8(b"Updated"), 2);
        destroy_memory_store_for_test(store);
    }
    
    #[test]
    fun test_compact_memory(){
        let store = new_test_memory_store();
        let test_user = @0x42;
        add_memory(&mut store, test_user, string::utf8(b"First"), true);
        add_memory(&mut store, test_user, string::utf8(b"Second"), true);
        let memories = get_all_memories(&store, test_user, true);
        compact_memory(&mut store, test_user, memories, string::utf8(b"Compact"), true);
        let memories = get_all_memories(&store, test_user, true);
        let len = vector::length(&memories);
        assert!(len == 1, 1);
        let memory = vector::borrow(&memories, 0);
        assert!(get_index(memory) == 0, 2);
        assert!(get_content(memory) == string::utf8(b"Compact"), 3);
        destroy_memory_store_for_test(store);
    }
}