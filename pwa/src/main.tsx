import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "@roochnetwork/rooch-sdk-kit/dist/index.css";
import '@radix-ui/themes/styles.css';
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import { networkConfig } from "./hooks/use-networks.ts";
import { PACKAGE_ID } from "./constants.ts";
import { RoochProvider, WalletProvider } from "@roochnetwork/rooch-sdk-kit";
import { ErrorGuard } from './error-guard.tsx';
import { HelmetProvider } from 'react-helmet-async';

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme appearance="light">
      <QueryClientProvider client={queryClient}>
        <RoochProvider
          networks={networkConfig}
          defaultNetwork='testnet'
          sessionConf={{
            appName: "Nuwa AI Agents",
            appUrl: "https://nuwa.rooch.io/",
            scopes: [`${PACKAGE_ID}::*::*`, `0x3::*::*`],
            maxInactiveInterval: 3600,
          }}
        >
          <WalletProvider preferredWallets={['UniSat']} chain="bitcoin" autoConnect>
            <HelmetProvider>
              <ErrorGuard>
                <App />
              </ErrorGuard>
            </HelmetProvider>
          </WalletProvider>
        </RoochProvider>
      </QueryClientProvider>
    </Theme>
  </StrictMode>,
)
