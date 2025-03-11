module nuwa_framework::ring_buffer {
    use std::vector;
    use std::option::{Self, Option};
 

    const ErrorEmptyBuffer: u64 = 1;
    const ErrorZeroCapacity: u64 = 2;
    const ErrorInvalidIndex: u64 = 3;

    /// A ring buffer implementation that reuses the underlying vector
    /// when it reaches its capacity.
    struct RingBuffer<E: copy + drop> has copy, store, drop {
        /// The underlying vector to store elements
        buffer: vector<E>,
        /// The maximum capacity of the buffer
        capacity: u64,
        /// The current number of elements in the buffer
        size: u64,
        /// The index of the head (first element) in the buffer
        head: u64,
        /// The index of the tail (where next element will be inserted) in the buffer
        tail: u64,
    }
    
    /// Create a new ring buffer with the specified capacity
    public fun new<E: copy + drop>(capacity: u64, default_value: E): RingBuffer<E> {
        assert!(capacity > 0, ErrorZeroCapacity);
        
        let buffer = vector[];
        let i = 0;
        while (i < capacity) {
            vector::push_back(&mut buffer, default_value);
            i = i + 1;
        };

        RingBuffer {
            buffer,
            capacity,
            size: 0,
            head: 0,
            tail: 0,
        }
    }

    /// Returns true if the buffer is empty
    public fun is_empty<E: copy + drop>(ring_buffer: &RingBuffer<E>): bool {
        ring_buffer.size == 0
    }

    /// Returns true if the buffer is full
    public fun is_full<E: copy + drop>(ring_buffer: &RingBuffer<E>): bool {
        ring_buffer.size == ring_buffer.capacity
    }

    /// Returns the current number of elements in the buffer
    public fun size<E: copy + drop>(ring_buffer: &RingBuffer<E>): u64 {
        ring_buffer.size
    }

    /// Returns the maximum capacity of the buffer
    public fun capacity<E: copy + drop>(ring_buffer: &RingBuffer<E>): u64 {
        ring_buffer.capacity
    }

    /// Push an item to the ring buffer.
    /// If the buffer is full, the oldest item will be overwritten.
    /// Returns the replaced item if any.
    public fun push<E: copy + drop>(ring_buffer: &mut RingBuffer<E>, item: E): Option<E> {
        let old_item = if (is_full(ring_buffer)) {
            // If buffer is full, save the item at head position
            let head_item = *vector::borrow(&ring_buffer.buffer, ring_buffer.head);
            // Replace head item with new item
            *vector::borrow_mut(&mut ring_buffer.buffer, ring_buffer.head) = item;
            // Move head forward
            ring_buffer.head = if (ring_buffer.head + 1 == ring_buffer.capacity) {
                0
            } else {
                ring_buffer.head + 1
            };
            option::some(head_item)
        } else {
            // If buffer is not full
            *vector::borrow_mut(&mut ring_buffer.buffer, ring_buffer.tail) = item;
            ring_buffer.size = ring_buffer.size + 1;
            option::none()
        };

        // Move tail forward
        ring_buffer.tail = if (ring_buffer.tail + 1 == ring_buffer.capacity) {
            0
        } else {
            ring_buffer.tail + 1
        };
        old_item
    }

    /// Pop the oldest item from the ring buffer.
    /// Returns None if the buffer is empty.
    public fun pop<E: copy + drop>(ring_buffer: &mut RingBuffer<E>): Option<E> {
        if (is_empty(ring_buffer)) {
            return option::none()
        };
        
        // Get item at head position
        let item = *vector::borrow(&ring_buffer.buffer, ring_buffer.head);
        ring_buffer.size = ring_buffer.size - 1;
        
        if (!is_empty(ring_buffer)) {
            // Move head forward
            ring_buffer.head = if (ring_buffer.head + 1 == ring_buffer.capacity) {
                0
            } else {
                ring_buffer.head + 1
            };
        } else {
            // Reset pointers when empty
            ring_buffer.head = 0;
            ring_buffer.tail = 0;
        };
        
        option::some(item)
    }

    /// Get a reference to the oldest item without removing it.
    /// Aborts if the buffer is empty.
    public fun peek<E: copy + drop>(ring_buffer: &RingBuffer<E>): &E {
        assert!(!is_empty(ring_buffer), ErrorEmptyBuffer);
        vector::borrow(&ring_buffer.buffer, ring_buffer.head)
    }

    /// Clear the ring buffer, removing all elements
    public fun clear<E: copy + drop>(ring_buffer: &mut RingBuffer<E>){
        ring_buffer.size = 0;
        ring_buffer.head = 0;
        ring_buffer.tail = 0;
    }

    /// Returns a vector containing all elements in the ring buffer in FIFO order.
    /// The ring buffer remains unchanged.
    public fun to_vector<E: copy + drop>(ring_buffer: &RingBuffer<E>): vector<E> {
        let result = vector::empty();
        if (is_empty(ring_buffer)) {
            return result
        };
        
        let count = 0;
        let current = ring_buffer.head;
        
        while (count < ring_buffer.size) {
            vector::push_back(&mut result, *vector::borrow(&ring_buffer.buffer, current));
            current = if (current + 1 == ring_buffer.capacity) {
                0
            } else {
                current + 1
            };
            count = count + 1;
        };
        
        result
    }

    /// Get a reference to the element at the specified index.
    /// Index 0 refers to the oldest element (head), and index size-1 refers to the newest element.
    /// Aborts if the index is out of bounds.
    public fun get<E: copy + drop>(ring_buffer: &RingBuffer<E>, index: u64): &E {
        assert!(index < ring_buffer.size, ErrorInvalidIndex);
        let actual_index = if (ring_buffer.head + index >= ring_buffer.capacity) {
            // Wrap around if we exceed capacity
            ring_buffer.head + index - ring_buffer.capacity
        } else {
            ring_buffer.head + index
        };
        vector::borrow(&ring_buffer.buffer, actual_index)
    }

    #[test]
    fun test_new_ring_buffer() {
        let buffer = new<u64>(5, 0);
        assert!(is_empty(&buffer), 0);
        assert!(!is_full(&buffer), 0);
        assert!(size(&buffer) == 0, 0);
        assert!(capacity(&buffer) == 5, 0);
    }

    #[test]
    fun test_push_full() {
        let buffer = new<u64>(3, 0);
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        push(&mut buffer, 30);
        assert!(is_full(&buffer), 0);
        let item = *peek(&buffer);
        assert!(item == 10, 0);
    }

    #[test]
    fun test_push_pop_basic() {
        let buffer = new<u64>(3, 0);
        
        // Push elements
        let replaced = push(&mut buffer, 10);
        assert!(option::is_none(&replaced), 0);
        assert!(size(&buffer) == 1, 0);
        
        replaced = push(&mut buffer, 20);
        assert!(option::is_none(&replaced), 0);
        assert!(size(&buffer) == 2, 0);
        
        replaced = push(&mut buffer, 30);
        assert!(option::is_none(&replaced), 0);
        assert!(size(&buffer) == 3, 0);
        assert!(is_full(&buffer), 0);
        
        // Pop elements in FIFO order
        let popped = pop(&mut buffer);
        assert!(option::is_some(&popped), 0);
        assert!(option::extract(&mut popped) == 10, 0);
        assert!(size(&buffer) == 2, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 20, 0);
        assert!(size(&buffer) == 1, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 30, 0);
        assert!(size(&buffer) == 0, 0);
        assert!(is_empty(&buffer), 0);
        
        // Pop from empty buffer
        popped = pop(&mut buffer);
        assert!(option::is_none(&popped), 0);
    }

    #[test]
    fun test_circular_overwrite() {
        let buffer = new<u64>(3, 0);
        
        // Fill the buffer
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        push(&mut buffer, 30);
        assert!(is_full(&buffer), 0);
        
        // Push more elements, which should overwrite the oldest ones
        let replaced = push(&mut buffer, 40);
        assert!(option::is_some(&replaced), 0);
        assert!(option::extract(&mut replaced) == 10, 0); // 10 was replaced
        
        replaced = push(&mut buffer, 50);
        assert!(option::extract(&mut replaced) == 20, 0); // 20 was replaced
        
        // Buffer should now contain [30, 40, 50]
        assert!(size(&buffer) == 3, 0);
        
        // Verify contents by popping
        let popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 30, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 40, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 50, 0);
        
        assert!(is_empty(&buffer), 0);
    }

    #[test]
    fun test_peek() {
        let buffer = new<u64>(3, 0);
        
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        
        // Peek should return the oldest element without removing it
        let item = peek(&buffer);
        assert!(*item == 10, 0);
        assert!(size(&buffer) == 2, 0); // Size unchanged
        
        // Pop and verify the same element is returned
        let popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 10, 0);
        
        // Peek at the next element
        item = peek(&buffer);
        assert!(*item == 20, 0);
    }

    #[test]
    #[expected_failure(abort_code = ErrorEmptyBuffer)]
    fun test_peek_empty() {
        let buffer = new<u64>(3, 0);
        // This should abort with ErrorEmptyBuffer
        let _ = peek(&buffer);
    }

    #[test]
    fun test_clear() {
        let buffer = new<u64>(3, 0);
        
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        push(&mut buffer, 30);
        
        clear(&mut buffer);
        
        assert!(is_empty(&buffer), 0);
        assert!(size(&buffer) == 0, 0);
    }

    #[test]
    fun test_push_pop_cycle() {
        let buffer = new<u64>(3, 0);
        
        // Fill and empty the buffer multiple times to test the circular behavior
        let i = 0;
        while (i < 10) {
            push(&mut buffer, i);
            
            if (i >= 3) {
                // Buffer should start replacing elements
                assert!(is_full(&buffer), 0);
            };
            i = i + 1;
        };
        
        // Buffer should now contain [7, 8, 9]
        assert!(size(&buffer) == 3, 0);
        
        let popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 7, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 8, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 9, 0);
        
        assert!(is_empty(&buffer), 0);
    }

    #[test]
    fun test_complex_sequence() {
        let buffer = new<u64>(5, 0);
        
        // Push some elements
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        push(&mut buffer, 30);
        
        // Pop one
        let popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 10, 0);
        
        // Push more
        push(&mut buffer, 40);
        push(&mut buffer, 50);
        push(&mut buffer, 60);
        
        // Buffer should now contain [20, 30, 40, 50, 60]
        assert!(size(&buffer) == 5, 0);
        assert!(is_full(&buffer), 0);
        
        // Push one more to trigger replacement
        let replaced = push(&mut buffer, 70);
        assert!(option::extract(&mut replaced) == 20, 0);
        
        // Buffer should now contain [30, 40, 50, 60, 70]
        let item = peek(&buffer);
        assert!(*item == 30, 0);
        
        // Pop all and verify
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 30, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 40, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 50, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 60, 0);
        
        popped = pop(&mut buffer);
        assert!(option::extract(&mut popped) == 70, 0);
        
        assert!(is_empty(&buffer), 0);
    }

    #[test]
    fun test_to_vector() {
        let buffer = new<u64>(3, 0);
        
        // Test empty buffer
        let elements = to_vector(&buffer);
        assert!(vector::is_empty(&elements), 0);
        
        // Test partially filled buffer
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        elements = to_vector(&buffer);
        assert!(vector::length(&elements) == 2, 0);
        assert!(*vector::borrow(&elements, 0) == 10, 0);
        assert!(*vector::borrow(&elements, 1) == 20, 0);
        
        // Test full buffer
        push(&mut buffer, 30);
        elements = to_vector(&buffer);
        assert!(vector::length(&elements) == 3, 0);
        assert!(*vector::borrow(&elements, 0) == 10, 0);
        assert!(*vector::borrow(&elements, 1) == 20, 0);
        assert!(*vector::borrow(&elements, 2) == 30, 0);
        
        // Test after wraparound
        push(&mut buffer, 40);
        elements = to_vector(&buffer);
        assert!(vector::length(&elements) == 3, 0);
        assert!(*vector::borrow(&elements, 0) == 20, 0);
        assert!(*vector::borrow(&elements, 1) == 30, 0);
        assert!(*vector::borrow(&elements, 2) == 40, 0);
    }

    #[test]
    fun test_get() {
        let buffer = new<u64>(3, 0);
        
        // Push some elements
        push(&mut buffer, 10);
        push(&mut buffer, 20);
        push(&mut buffer, 30);
        
        // Test accessing elements by index
        let item = get(&buffer, 0);
        assert!(*item == 10, 0); // oldest element
        
        item = get(&buffer, 1);
        assert!(*item == 20, 0); // middle element
        
        item = get(&buffer, 2);
        assert!(*item == 30, 0); // newest element
        
        // Test after wraparound
        push(&mut buffer, 40);
        
        item = get(&buffer, 0);
        assert!(*item == 20, 0); // oldest element after wraparound
        
        item = get(&buffer, 1);
        assert!(*item == 30, 0); // middle element after wraparound
        
        item = get(&buffer, 2);
        assert!(*item == 40, 0); // newest element after wraparound
    }

    #[test]
    #[expected_failure(abort_code = ErrorInvalidIndex)]
    fun test_get_out_of_bounds() {
        let buffer = new<u64>(3, 0);
        push(&mut buffer, 10);
        // This should abort with ErrorInvalidIndex
        let _ = get(&buffer, 1);
    }
}