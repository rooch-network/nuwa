'use client'

import { useRouter } from "next/navigation";
import { Leaderboard } from "@/app/components/leaderboard/Leaderboard";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { BarLoader } from "@/app/components/shared/BarLoader";
import { useSupabaseAuth } from "../components/providers/SupabaseAuthProvider";

// 定义淡入动画变体
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: "easeOut"
        }
    }
};

export default function LeaderboardPage() {
    const { session } = useSupabaseAuth();
    const router = useRouter();

    useEffect(() => {
        if (!session || !session.user) {
            router.push("/");
        }
    }, [session, router]);

    if (session.isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <BarLoader />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <main className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="max-w-6xl mx-auto mt-6 sm:mt-10 md:mt-20"
            >
                <div className="w-full">
                    <Leaderboard />
                </div>
            </motion.div>
        </main>
    );
} 