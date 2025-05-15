---
nip: 6
title: MCP Identity Authentication and Payment Extension Protocol
status: Draft
type: Standards Track
category: Core
created: 2025-05-13
version: 0.1
---

# NIP-6: MCP Identity Authentication and Payment Extension Protocol (Draft)

## 1. Motivation

*   The current Model Context Protocol (MCP) primarily focuses on the interaction between models and tools, lacking standard mechanisms for identity authentication and payment.
*   To enable MCP services to be commercialized securely and to protect resources, it is necessary to introduce these capabilities at the protocol level.
*   By directly extending MCP, rather than relying entirely on A2A encapsulation, existing MCP clients and servers can more easily integrate these features, thus better fitting into the MCP ecosystem.

## 2. Dependencies

*   **NIP-1: Nuwa Agent Single DID Multi-Device Key Model**: Used to define the identity identifiers for MCP clients and servers.
*   **(Conceptual Dependency) NIP-2: DID-Based A2A Authentication**: The authentication principles from NIP-2 (e.g., using DID signatures to verify request origin and integrity) will be adopted and applied to MCP messages.
*   **(Conceptual Dependency) NIP-3: A2A Agent Service Payment Protocol**: The payment flows and message types from NIP-3 will be adapted for payment interactions within MCP.

## 3. MCP Identity Authentication Extension

*   **3.1. Identity Identifiers**:
    *   Both MCP clients and MCP servers should possess a DID compliant with NIP-1 specifications.
    *   Servers should declare their DID in their service descriptions or discovery mechanisms.
*   **3.2. Request Signing**:
    *   MCP clients, when initiating tool call requests, must sign critical parts of the request (e.g., request parameters, timestamp, nonce).
    *   Signature information (including client DID, `key_id` used, and signature value) can be transmitted via MCP request metadata (e.g., HTTP Headers if MCP is HTTP-based) or as part of the request body.
    *   For example, an `X-MCP-Signature` HTTP Header could be defined, similar in structure to the `X-DID-Signature` in NIP-2.
*   **3.3. Server-side Verification**:
    *   Upon receiving a request, the MCP server parses the signature information to obtain the client's DID.
    *   It resolves the client's DID to retrieve its DID document and the corresponding public key.
    *   It verifies the signature's validity, ensuring the request is untampered and originates from a legitimate client.
    *   (Optional) Access control can be enforced based on the client's DID.

## 4. MCP Payment Extension

*   **4.1. Service Pricing and Quotation**:
    *   MCP servers should be able to declare whether their tools (or specific operations) require payment and their pricing strategy. This can be achieved by extending MCP's tool descriptions.
    *   **MCP Message Extension - `ToolQuotationRequest`**: Client requests a quotation for a specific tool call from the server.
        *   Includes: `tool_id`, `tool_input` (for precise server-side quotation).
    *   **MCP Message Extension - `ToolQuotationResponse`**: Server replies with the quotation.
        *   Includes: `quotation_id`, `price` (amount, currency unit), `payment_instructions` (payment method, address, etc., referencing NIP-3).
*   **4.2. Payment Confirmation and Service Execution (Pre-payment Model)**:
    *   The client completes the payment according to the `payment_instructions` in the `ToolQuotationResponse`.
    *   **MCP Message Extension - `PaymentConfirmation`**: Client sends payment confirmation to the server.
        *   Includes: `quotation_id`, `payment_proof` (transaction hash, etc., referencing NIP-3).
    *   The server verifies the payment proof.
    *   Upon successful verification, the server executes the actual MCP tool call and returns the result.
*   **4.3. State Channel Payment Model (Optional, for frequent/streaming interactions)**:
    *   Leveraging the state channel concept from NIP-3, define MCP messages for channel establishment, funding, state updates, and closure.
    *   Examples: `MCPChannelOpenRequest`, `MCPChannelOpenResponse`, `MCPChannelFundNotification`, `MCPChannelStateUpdatePropose`, `MCPChannelStateUpdateConfirm`, `MCPChannelCloseRequest`.
    *   Once a channel is established, subsequent MCP tool calls can indicate billing via the specific payment channel in their requests.

## 5. MCP Protocol Modifications and Message Definitions

*   Detail the structure of the newly introduced MCP message types (e.g., `ToolQuotationRequest`, `PaymentConfirmation`).
*   Specify how existing MCP messages (like tool call requests) need to be extended to carry authentication information or payment intent.
*   Consider how MCP services can discover if a client supports and expects to use these extensions.

## 6. Impact on MCP Ecosystem and Integration

*   Existing MCP clients and servers will need to be upgraded to support these new authentication and payment fields/messages.
*   Tool providers can gradually add paid options to their MCP services.
*   Maintain backward compatibility, allowing clients that do not support these extensions to continue interacting with servers offering only free tools.
