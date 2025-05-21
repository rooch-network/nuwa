# Custodian Service

A Custodian Service implementation based on NIP-3, allowing Web2 users to create AI Agent DIDs without directly holding a crypto wallet.

## Features

- Support for multiple Web2 authentication methods (via Supabase Auth):
  - Google OAuth
  - GitHub OAuth
  - Email OTP
- Compliance with NIP-3 Delegated-Control Protocol
- Allows users to generate device keys and maintain operational control over their DID
- Support for controller switching, enabling DID migration

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Authentication: Supabase Auth
- Database: Supabase (PostgreSQL)

## Environment Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account

### Configuring Supabase

1. Create a new project on [Supabase](https://supabase.com/)
2. In Authentication settings, enable the following authentication providers:
   - Email (Email OTP)
   - Google OAuth
   - GitHub OAuth
3. Note down the project URL and anon key

### Local Development Setup

1. Clone the repository and install dependencies

```bash
git clone <repository-url>
cd nuwa-services/custodian-service/typescript
npm install
```

2. Create a `.env` file, referencing `.env.example`:

```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Custodian Service Configuration
VITE_CUSTODIAN_DID=did:example:custodian123
VITE_CUSTODIAN_SERVICE_NAME=Example Custodian Service
VITE_CUSTODIAN_SERVICE_ENDPOINT=https://custodian.example.com/api

# Server Configuration
PORT=3000
NODE_ENV=development
```

3. Start the development server

```bash
npm run start
```

This will launch both the Vite frontend development server and Express backend.

## Project Structure

```
src/
├── components/         # React components
│   ├── Auth.tsx        # Authentication component
│   └── AgentDIDCreator.tsx # DID creation component
├── services/           # Service classes
│   ├── supabaseService.ts # Supabase authentication service
│   └── agentDIDService.ts # Agent DID service
├── server/             # Backend server
│   ├── index.ts        # Server entry
│   └── api.ts          # API routes
├── types/              # TypeScript type definitions
│   └── index.ts        # Type declarations
├── utils/              # Utility functions
│   └── didUtils.ts     # DID-related utilities
└── App.tsx             # Main application component
```

## API Endpoints

### GET /api/did

Get the Custodian's DID document, including service definitions and supported authentication methods.

### POST /api/agent-did

Create a new Agent DID.

Request body:
```json
{
  "userIdentifierHash": "string",
  "devicePublicKey": "string"
}
```

### POST /api/switch-controller

Switch the controller of an Agent DID.

Request body:
```json
{
  "agentDID": "string",
  "newController": "string",
  "signature": "string"
}
```

## Deployment

Build the production version:

```bash
npm run build
```

This will generate frontend assets in the `dist` directory. The backend server can be run using:

```bash
NODE_ENV=production npm run server
```

Or deploy using a process manager like PM2.

## Important Notes

- In the current implementation, the on-chain method for creating Agent DIDs is empty and needs to be implemented based on actual requirements.
- For actual deployments, ensure you use secure key management solutions.
- Supabase configuration should be adjusted and protected according to your environment.

## References

- [NIP-3: Custodian Delegated Control Protocol](https://github.com/rooch-network/nuwa/blob/main/nips/nips/nip-3.md)
- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
