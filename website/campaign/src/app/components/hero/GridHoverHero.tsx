'use client'

import React, { useEffect, useState } from "react";
import { useAnimate } from "framer-motion";
// import { signIn } from "next-auth/react";
import { useSupabaseAuth } from "../providers/SupabaseAuthProvider";

interface GridHoverHeroProps {
    onJoinClick?: () => void;
}

export const GridHoverHero = ({ onJoinClick }: GridHoverHeroProps) => {
    const [scope, animate] = useAnimate();
    const { signIn } = useSupabaseAuth();

    const [size, setSize] = useState({ columns: 0, rows: 0 });

    useEffect(() => {
        generateGridCount();
        window.addEventListener("resize", generateGridCount);

        return () => window.removeEventListener("resize", generateGridCount);
    }, []);

    const generateGridCount = () => {
        const columns = Math.floor(document.body.clientWidth / 75);
        const rows = Math.floor(document.body.clientHeight / 75);

        setSize({
            columns,
            rows,
        });
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        // @ts-ignore
        const id = `#${e.target.id}`;
        animate(id, { background: "rgba(129, 140, 248, 0)" }, { duration: 1.5 });
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        // @ts-ignore
        const id = `#${e.target.id}`;
        animate(id, { background: "rgba(129, 140, 248, 1)" }, { duration: 0.15 });
    };

    const handleTwitterLogin = () => {
        // 调用Twitter登录
        signIn('twitter');

        // 如果提供了onJoinClick回调，也执行它
        if (onJoinClick) {
            onJoinClick();
        }
    };

    return (
        <div className="bg-neutral-950">
            <div
                ref={scope}
                className="grid h-screen w-full grid-cols-[repeat(auto-fit,_minmax(75px,_1fr))] grid-rows-[repeat(auto-fit,_minmax(75px,_1fr))]"
            >
                {[...Array(size.rows * size.columns)].map((_, i) => (
                    <div
                        key={i}
                        id={`square-${i}`}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={handleMouseEnter}
                        className="h-full w-full border-[1px] border-neutral-900"
                    />
                ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8">
                <h1 className="text-center text-7xl font-black uppercase text-white sm:text-8xl md:text-9xl">
                    The Campaign
                </h1>
                <p className="mb-6 mt-4 max-w-3xl text-center text-lg font-light text-neutral-500 md:text-xl">
                    This is the campaign description.Lorem ipsum dolor sit amet consectetur adipisicing elit. Labore
                    quisquam nemo excepturi officia necessitatibus veritatis enim ipsam!
                    Laudantium, reiciendis officia!
                </p>
                <button
                    onClick={handleTwitterLogin}
                    className="pointer-events-auto bg-indigo-400 px-4 py-2 text-xl font-bold uppercase text-neutral-950 mix-blend-difference"
                >
                    Login with Twitter
                </button>
            </div>
        </div>
    );
}; 