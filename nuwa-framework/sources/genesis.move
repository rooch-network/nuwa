module nuwa_framework::genesis {
    use nuwa_framework::name_registry;

    fun init(){
        name_registry::genesis_init();
    }
    

    #[test_only]
    public fun init_for_test(){
        rooch_framework::genesis::init_for_test();
        init(); 
    }
}