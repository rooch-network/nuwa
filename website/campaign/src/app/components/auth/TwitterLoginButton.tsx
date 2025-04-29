'use client'

import { FaTwitter } from "react-icons/fa";
import { useSupabaseAuth } from "../providers/SupabaseAuthProvider";

export const TwitterLoginButton = () => {
    const { session, signIn, signOut } = useSupabaseAuth();

    if (session.isLoading) {
        return <div>Loading...</div>;
    }

    if (session.user) {
        const userData = session.user;
        const userMetadata = userData.user_metadata;
        
        const username = userMetadata.preferred_username || 
                         userMetadata.user_name || 
                         userMetadata.twitter_handle;
                         
        const name = userMetadata.name || 
                     userMetadata.full_name || 
                     'User';
        
        const avatarUrl = userMetadata.avatar_url || 
                          userMetadata.picture || 
                          '';

        return (
            <div className="flex flex-col items-center">
                <div className="flex items-center space-x-2 mb-4">
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt={name || "User avatar"}
                            className="w-10 h-10 rounded-full"
                        />
                    )}
                    <div>
                        <p className="font-medium">{name}</p>
                        {username && <p className="text-sm text-gray-500">@{username}</p>}
                    </div>
                </div>
                <button
                    onClick={() => signOut()}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("twitter")}
            className="flex items-center space-x-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold py-2 px-4 rounded"
        >
            <FaTwitter className="text-xl" />
            <span>Sign in with Twitter</span>
        </button>
    );
};