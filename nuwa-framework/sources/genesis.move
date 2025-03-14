module nuwa_framework::genesis {
    
    //TODO init other modules in this module
    fun init(){

    }
    

    #[test_only]
    public fun init_for_test(){
        rooch_framework::genesis::init_for_test();
        init();
        nuwa_framework::character_registry::init_for_test();
    }
}