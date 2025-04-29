'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/app/components/chat/Chat";
import { motion } from "framer-motion";
import { BarLoader } from "@/app/components/shared/BarLoader";
import { useSupabaseAuth } from "./components/providers/SupabaseAuthProvider";
import { GridHoverHero } from "./components/hero/GridHoverHero";

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

export default function Home() {
  const { session } = useSupabaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!session || session.user === null) {
      router.push("/");
    }
  }, [session, router]);

  if (session.isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <BarLoader />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session || session.user === null) {
    return <GridHoverHero />;
  }

  return (
    <main className="container mx-auto px-2 sm:px-4 sm:py-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="max-w-6xl mx-auto sm:mt-10 md:mt-20"
      >
        <div className="w-full">
          <Chat />
        </div>
      </motion.div>
    </main>
  );
} 