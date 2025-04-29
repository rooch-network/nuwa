import { motion } from 'framer-motion';
import { useSupabaseAuth } from '../providers/SupabaseAuthProvider';

export const Greeting = () => {
    const { session } = useSupabaseAuth();
    const twitterName = session?.user?.user_metadata?.name || 'there';

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-semibold"
            >
                Hello {twitterName}! I'm Nuwa.
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-gray-500"
            >
                Are you ready to take on some missions?
            </motion.div>
        </div>
    );
}; 