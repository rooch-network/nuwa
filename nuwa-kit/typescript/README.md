# Nuwa Protocol SDK for TypeScript

This package provides the official TypeScript/JavaScript SDK for the Nuwa Protocol. It allows developers to easily build applications and AI agents that interact with Nuwa.

## Features

*   Identity Management (NIP-1, NIP-2, NIP-3)
*   State Synchronization (NIP-6, NIP-8)
*   Capability Handling (NIP-7)
*   Payment Channel Interaction (NIP-4, NIP-5, NIP-11)
*   Service Gateway Communication (NIP-9, NIP-10)
*   Core utilities and type definitions.

## Structure (Monorepo - pnpm)

This SDK is structured as a monorepo using pnpm workspaces. Key packages include:

*   `packages/core`: Core types, utilities, and foundational logic.
*   `packages/identity`: Identity creation, authentication, and management.
*   `packages/state`: Agent state model and synchronization.
*   `packages/payments`: Payment channel and fiat proxy interactions.
*   `packages/capabilities`: Capability discovery and usage.
*   `packages/agent`: High-level SDK for building Nuwa agents.
*   *(More packages will be added as features are developed)*

## Installation

(Instructions for installing packages, e.g., using pnpm)

```bash
# Example for a specific package (once published)
pnpm add @nuwa/core @nuwa/identity
```

## Usage

(Basic usage examples will be provided here)

```typescript
// Example:
// import { NuwaAgent } from '''@nuwa/agent''';
// const agent = new NuwaAgent(...);
```

## Development

(Instructions for setting up the development environment, building, and testing)

### Prerequisites
*   Node.js (e.g., v18+)
*   pnpm

### Setup
```bash
git clone <repository-url>
cd nuwa-kit/typescript
pnpm install
pnpm run build
```

### Running Tests
```bash
pnpm test
```

## Examples

See the `examples/` directory within this SDK for more detailed usage scenarios.
