# NIP-5: Agent LLM Gateway Protocol

## Summary

This proposal defines a unified, decentralized protocol for AI Agents to access large language model (LLM) services through verifiable, identity-bound, and programmable gateways. The goal is to enable agents to dynamically invoke different LLMs without hardcoding keys, while ensuring response authenticity, DID-based access control, and programmable per-call payments.

---

## Motivation

* Users should not be required to manage or rotate LLM API keys manually.
* Agent-to-LLM communication should support verifiability and identity binding.
* Agents should be able to access multiple LLM services (e.g., OpenAI, Claude, Mistral, Local LLMs) via a unified gateway.
* The response must be optionally verifiable (signed or provable).
* Payments for API usage should be programmable and interoperable with NIP-3.

---

## Components

### 1. Request Format

The gateway expects an HTTP request where the **body** is compatible with the OpenAI Chat Completions API format. NIP-5 specific parameters are passed in a single HTTP header, `X-Nuwa-Meta`, containing a base64 encoded JSON object.

**HTTP Header:**

*   `X-Nuwa-Meta`: (Required) A base64 encoded JSON string. The JSON object contains the following fields:
    *   `agent_did`: (Required) The DID of the calling agent (per NIP-1/NIP-2).
    *   `timestamp`: (Required) A Unix timestamp indicating when the request was made. Used to prevent replay attacks.
    *   `signature`: (Optional) A signature of the request (details to be defined, likely over a canonical representation of the request body and the `agent_did` and `timestamp` fields from this JSON object).
    *   `payment_proof`: (Optional) Payment proof, such as an invoice ID or an x402 header, if required by the gateway (per NIP-3).

**Example `X-Nuwa-Meta` JSON (before base64 encoding):**
```json
{
  "agent_did": "did:nuwa:agent123",
  "timestamp": 1715520000,
  "signature": "ed25519:...",
  "payment_proof": "inv_xxxxxxxxxxxx"
}
```

**Request Body (Example - OpenAI Compatible):**

```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "user",
      "content": "Explain Bitcoin like I\\'m five."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 512
}
```

*   The `model` field in the body specifies the logical name of the model (e.g., gpt-4, claude-3, llama2-7b-local).
*   Other parameters in the body (e.g., `messages`, `temperature`, `max_tokens`) follow the OpenAI Chat Completions API specification.

### 2. Response Format

The gateway returns an HTTP response where the **body** is compatible with the OpenAI Chat Completions API format. NIP-5 specific parameters are returned in a single HTTP header, `X-Nuwa-Response-Meta`, containing a base64 encoded JSON object.

**HTTP Header:**

*   `X-Nuwa-Response-Meta`: (Required) A base64 encoded JSON string. The JSON object contains the following fields:
    *   `provider_did`: (Required) The DID of the Nuwa LLM Gateway that processed the request.
    *   `verification_details`: (Optional) An object detailing how the response's authenticity and origin can be verified. This object MAY contain:
        *   `method`: (Required if `verification_details` is present) A string indicating the verification method. Examples: `"gateway_signature"`, `"zkTLS_proof_of_origin"`.
        *   `signature`: (Conditional, if `method` is `"gateway_signature"`) The gateway's signature over a canonical representation of the response body and relevant metadata (e.g., `provider_did`, `timestamp`).
        *   `origin_proof`: (Conditional, if `method` is `"zkTLS_proof_of_origin"`) The zkTLS proof data or a reference to it. The exact structure of this proof would need further specification (potentially in a dedicated NIP or by referencing an external standard). This proof attests that the response body was faithfully relayed from a specific upstream LLM provider.
        *   `upstream_source_identifier`: (Conditional, if `method` is `"zkTLS_proof_of_origin"`) An identifier for the claimed upstream source, e.g., the domain name like `"api.openai.com"`.
    *   `gateway_signature`: (Deprecated, use `verification_details` with method `"gateway_signature"` instead) An optional signature from the provider over the response.

**Example `X-Nuwa-Response-Meta` JSON (before base64 encoding):**
```json
{
  "provider_did": "did:nuwa:llm:gateway123",
  "verification_details": {
    "method": "zkTLS_proof_of_origin",
    "origin_proof": { "proof_type": "tlsnotary_v1", "data": "...base64_encoded_proof..." },
    "upstream_source_identifier": "api.openai.com"
  }
  // Alternatively, for gateway signature:
  // "verification_details": {
  //   "method": "gateway_signature",
  //   "signature": "ed25519:..."
  // }
}
```

**Response Body (Example - OpenAI Compatible):**

```json
{
  "id": "chatcmpl-xxxxxxxxxxxxxxxxxxxxxx",
  "object": "chat.completion",
  "created": 1715520000,
  "model": "gpt-4-turbo-2024-04",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Bitcoin is like magic internet money..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 50,
    "total_tokens": 65
  }
  // Potentially other OpenAI standard fields
}
```

*   The response body structure (e.g., `choices`, `message`, `usage`) follows the OpenAI Chat Completions API specification.
*   Optional: The gateway might include additional metadata in the `X-Nuwa-Response-Meta` JSON if needed (e.g., latency, specific model version if different from the logical name).

### 3. Provider Declaration (DID Document Extension)

LLM service providers SHALL extend their DID documents with:

```json
{
  "@context": "https://w3id.org/did/v1",
  "id": "did:nuwa:llm:openrouter123",
  "service": [
    {
      "id": "#llm-gateway",
      "type": "LLMGateway",
      "serviceEndpoint": "https://api.openrouter.ai/llm"
    }
  ],
  "publicKey": [ ... ],
  "verificationMethod": [...],
  "llmCapabilities": {
    "supported_models": ["gpt-4", "claude-3-opus", "mistral-7b"],
    "pricing": {
      "gpt-4": {
        "currency": "USD",
        "unit": "1k_tokens",
        "prompt_price_per_unit": 0.01,
        "completion_price_per_unit": 0.03
      },
      "claude-3-opus": {
        "currency": "USD",
        "unit": "1k_tokens",
        "prompt_price_per_unit": 0.008,
        "completion_price_per_unit": 0.015
      },
      "mistral-7b": {
        "currency": "USD",
        "unit": "1k_tokens",
        "price_per_unit": 0.001 // Example for models with single rate
      }
    },
    "settlement_options": [
      { "type": "x402" },
      { "type": "NIP-3_state_channel", "details": { "channel_setup_endpoint": "https://provider.example/nip3/channels" } }
    ]
  }
}
```

*   **`llmCapabilities.pricing`**: This object provides structured pricing information for each supported model.
    *   `currency`: ISO 4217 currency code (e.g., "USD").
    *   `unit`: A string defining the billing unit (e.g., "1k_tokens", "token", "request").
    *   `prompt_price_per_unit`: (Optional) The price per unit for prompt/input tokens.
    *   `completion_price_per_unit`: (Optional) The price per unit for completion/output tokens.
    *   `price_per_unit`: (Optional) Used if prompt and completion prices are the same, or if pricing is per request rather than per token.
*   **`llmCapabilities.settlement_options`**: An array detailing the NIP-3 compatible settlement mechanisms supported by the gateway. This replaces the singular `settlement` field to allow for multiple options.
    *   `type`: Indicates the settlement mechanism (e.g., "x402", "NIP-3_state_channel", "NIP-3_prepaid_account").
    *   `details`: (Optional) An object containing additional information specific to the settlement type, such as an endpoint for setting up a state channel.

### 4. Payment Integration

*   Compatible with **NIP-3** (Agent Service Payment Protocol). NIP-3 defines the underlying mechanisms for establishing payment relationships (e.g., state channels, pre-paid accounts) and generating payment authorizations.
*   The `payment_proof` field within the `X-Nuwa-Meta` header (e.g., an invoice ID, a redeemable token, or an L402/x402 header value) is the concrete representation of such authorization presented to the LLM Gateway for verification with each request.
*   Gateways may reject unauthenticated or unpaid requests.
*   Request-response pairs can optionally be posted on-chain for audit.

---

## Security Considerations

* Signature scheme should align with NIP-1 key types (Ed25519, Secp256k1, etc.).
* Gateways should verify Agent identity and timestamp validity to prevent replay attacks.
* Optionally integrate with zkML/TEE proof networks for enhanced verification of the LLM computation itself.
* Multi-gateway fallback allowed (agents may rotate across gateways).
* **Proof of Origin for Relayed Content**: To enhance trust in gateways relaying responses from upstream LLM providers (e.g., OpenAI, Anthropic), mechanisms like zkTLS (or similar TLS-based Notary schemes) can be employed. The gateway can generate a proof that the specific response content was part of a TLS session with the claimed upstream provider. This allows the agent to verify the integrity and origin of the relayed content without requiring the upstream provider to be NIP-aware, and serves as a strong alternative or complement to the gateway's own signature on the response. The `verification_details` field in `X-Nuwa-Response-Meta` is designed to carry such proofs.

---

## Future Extensions

* Support streaming token-level responses
* Agent-authenticated function calling (`llm.call_tool`)
* Encrypted response mode using Agent's device key (per NIP-1)
* Model fingerprinting proof (commit hash + zk proof)
