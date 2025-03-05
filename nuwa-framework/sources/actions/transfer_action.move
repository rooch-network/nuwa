module nuwa_framework::transfer_action {
    use std::vector;
    use std::string::{Self, String};
    use std::option;
    use moveos_std::object::{Object};
    use moveos_std::json;
    use moveos_std::type_info;
    use rooch_framework::transfer;
    use rooch_framework::gas_coin::RGas;
    use nuwa_framework::agent::{Self, Agent};
    use nuwa_framework::action::{Self, ActionDescription, ActionGroup};

    // Action names
    const ACTION_NAME_TRANSFER: vector<u8> = b"transfer::coin";
    // Action examples
    const TRANSFER_ACTION_EXAMPLE: vector<u8> = b"{\"to\":\"rooch1a47ny79da3tthtnclcdny4xtadhaxcmqlnpfthf3hqvztkphcqssqd8edv\",\"amount\":\"100\",\"coin_type\":\"0x0000000000000000000000000000000000000000000000000000000000000003::gas_coin::RGas\",\"memo\":\"Payment for services\"}";

    #[data_struct]
    /// Arguments for the transfer coin action
    struct TransferActionArgs has copy, drop {
        to: address,          // The recipient address in string format
        amount: String,         // Amount to transfer
        coin_type: String,    // The coin type to transfer (fully qualified type name)
        memo: String,         // Optional memo for the transfer, leave empty if not needed
    }

    /// Register all transfer-related actions
    public fun register_actions() {
    }

    entry fun register_actions_entry() {
        register_actions();
    }

    public fun get_action_group(): ActionGroup {
        action::new_action_group(
            string::utf8(b"transfer"),
            string::utf8(b"Actions related to coin transfers, including sending and managing coins."),
            get_action_descriptions()
        )   
    }

    public fun get_action_descriptions() : vector<ActionDescription> {
        let descriptions = vector::empty();
        // Register transfer coin action
        let transfer_args = vector[
            action::new_action_argument(
                string::utf8(b"to"),
                string::utf8(b"string"),
                string::utf8(b"Recipient address"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"amount"),
                string::utf8(b"string"),
                string::utf8(b"Amount to transfer (as a string)"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"coin_type"),
                string::utf8(b"string"),
                string::utf8(b"Coin type to transfer (e.g. '0x0000000000000000000000000000000000000000000000000000000000000003::gas_coin::RGas')"),
                true,
            ),
            action::new_action_argument(
                string::utf8(b"memo"),
                string::utf8(b"string"),
                string::utf8(b"Optional memo for the transfer, leave empty if not needed"),
                true,
            ),
        ];
        vector::push_back(&mut descriptions, action::new_action_description(
            string::utf8(ACTION_NAME_TRANSFER),
            string::utf8(b"Transfer coin_type coins to an address"),
            transfer_args,
            string::utf8(TRANSFER_ACTION_EXAMPLE),
            string::utf8(b"Use this action to transfer coin_type coins from your account to another address"),
            string::utf8(b"Transfers will be executed immediately and are irreversible"),
        ));
        descriptions
    }
    

    /// Execute a transfer action
    public fun execute(agent: &mut Object<Agent>, action_name: String, args_json: String) {
        if (action_name == string::utf8(ACTION_NAME_TRANSFER)) {
            let args_opt = json::from_json_option<TransferActionArgs>(string::into_bytes(args_json));
            if (option::is_none(&args_opt)) {
                std::debug::print(&string::utf8(b"Invalid arguments for transfer action"));
                return
            };

            let args = option::destroy_some(args_opt);
            execute_transfer(agent, args.to, args.amount, args.coin_type);
        };
    }

    /// Execute the transfer operation with dynamic coin type support
    fun execute_transfer(agent: &mut Object<Agent>, to: address, amount_str: String, coin_type_str: String) {
        let amount_opt = moveos_std::string_utils::parse_u256_option(&amount_str);
        if (option::is_none(&amount_opt)) {
            std::debug::print(&string::utf8(b"Invalid amount for transfer"));
            return
        };
        let amount = option::destroy_some(amount_opt);
        let signer = agent::create_agent_signer(agent);
        
        // Handle different coin types based on the string value
        if (coin_type_str == type_info::type_name<RGas>()) {
            transfer::transfer_coin<RGas>(&signer, to, amount);
        } else {
            // For handling other coin types, you would need to implement a 
            // more sophisticated type resolution mechanism
            // This is a placeholder for demonstration
            std::debug::print(&string::utf8(b"Unsupported coin type: "));
            std::debug::print(&coin_type_str);
        }
    }

    #[test]
    fun test_transfer_action_examples() {
        // Test transfer action example
        let transfer_args = json::from_json<TransferActionArgs>(TRANSFER_ACTION_EXAMPLE);
        assert!(transfer_args.to == @0xed7d3278adec56bbae78fe1b3254cbeb6fd36360fcc295dd31b81825d837c021, 0);
        assert!(transfer_args.amount == string::utf8(b"100"), 1);
        assert!(transfer_args.coin_type == string::utf8(b"0x0000000000000000000000000000000000000000000000000000000000000003::gas_coin::RGas"), 2);
        assert!(transfer_args.memo == string::utf8(b"Payment for services"), 3);
        std::debug::print(&type_info::type_name<RGas>());
        assert!(transfer_args.coin_type == type_info::type_name<RGas>(), 4);
    }
}