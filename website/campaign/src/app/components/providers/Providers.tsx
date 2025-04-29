'use client'

import { SupabaseAuthProvider } from "./SupabaseAuthProvider";
import { MissionsProvider } from "../../context/MissionsContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SupabaseAuthProvider>
            <MissionsProvider>
                {children}
            </MissionsProvider>
        </SupabaseAuthProvider>
    );
}