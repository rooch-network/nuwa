module nuwa_framework::address_utils{
    use std::vector;
    use std::string::{Self, String};
    use moveos_std::address;
    use moveos_std::bcs;
    use moveos_std::hex;

    friend nuwa_framework::memory_action;
    friend nuwa_framework::prompt_builder;
    friend nuwa_framework::message;

    //TODO Migrate this function to address.move module
    /// Convert string address to Move address, handling both short and full-length addresses
    public(friend) fun parse_address(arg: &String): address {
        let bytes = *string::bytes(arg);
        let result = vector::empty();
        
        // Remove "0x" prefix if present
        if (vector::length(&bytes) >= 2 && 
            *vector::borrow(&bytes, 0) == 0x30 && 
            *vector::borrow(&bytes, 1) == 0x78) {
            let i = 2;
            while (i < vector::length(&bytes)) {
                vector::push_back(&mut result, *vector::borrow(&bytes, i));
                i = i + 1;
            };
        } else {
            result = bytes;
        };

        // Left pad with zeros to make it 64 characters long
        let padded = vector::empty();
        let needed_zeros = 64 - vector::length(&result);
        while (needed_zeros > 0) {
            vector::push_back(&mut padded, 0x30); // '0' in ASCII
            needed_zeros = needed_zeros - 1;
        };
        vector::append(&mut padded, result);
        
        address::from_ascii_bytes(&padded)
    }

     // Add helper function to convert address to string
    public(friend) fun address_to_string(addr: address): String {
        let addr_prefix = b"0x";
        let addr_bytes = hex::encode(bcs::to_bytes(&addr));
        vector::append(&mut addr_prefix, addr_bytes);
        string::utf8(addr_prefix)
    }

    #[test]
    fun test_parse_address() {
        use std::string;
        // Test short address
        let address_str = string::utf8(b"0x42");
        let address = parse_address(&address_str);
        assert!(address == @0x42, 1);

        // Test short address without prefix
        let address_str = string::utf8(b"42");
        let address = parse_address(&address_str);
        assert!(address == @0x42, 2);

        // Test full length address
        let address_str = string::utf8(b"0x0000000000000000000000000000000000000000000000000000000000000042");
        let address = parse_address(&address_str);
        assert!(address == @0x42, 3);
    }
}