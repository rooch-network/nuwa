---
nip: 7
title: Agent Capability Protocol — Capability Package Specification
status: Draft
type: Standards Track
category: Core
created: 2025-05-13
version: 0.1
---

# NIP-7: Agent Capability Protocol — Capability Package Specification

## 0  Summary

*Agent Capability Protocol* (ACP) defines how an **Agent Capability Package** (file suffix **`.acp.yaml`**) bundles:

* a **JSON Schema** that formalises the state objects this capability owns;
* a **canonical prompt** (system/assistant template) that instructs an LLM how to use the capability;
* a **tool manifest** (OpenAI Tools format) that maps user intent to runtime functions;
* descriptive **metadata** (ID, triggers, permissions, signature).

A single ACP file can be published to a decentralised **Capability Registry**, discovered by any Nuwa-compatible Router, installed at runtime, and cleanly removed or upgraded.
State persistence is performed via the standard `state.*` tool family provided by the Nuwa runtime.

---

## 1  Motivation

Current agents are monolithic: a huge prompt plus ad-hoc tools. Scaling to dozens of tasks explodes context size and tangles memory. ACP makes each task a plug-in that can be:

* **installed / uninstalled on demand**,
* **hot-swapped** inside one chat session via a Router stack,
* **independently versioned & governed**,
* **securely sandboxed** with least-privilege storage calls.

---

## 2  Terminology

| Term               | Meaning                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| **ACP file**       | The single YAML document that ships one capability.                          |
| **Capability URI** | `did:nuwa:cap:<name>@<semver>` — globally unique ID for the package. The `<name>` component MUST be unique within the `did:nuwa:cap` namespace to ensure the URI's global uniqueness. |
| **Schema URI**     | `$id` of the JSON Schema, usually `did:nuwa:state:<name>#<ver>`.             |
| **Router**         | Top-level agent component that routes messages to sub-agents (capabilities). |
| **Registry**       | Decentralised index (chain + IPFS) that stores ACP metadata & file CIDs.     |

---

## 3  File format (`.acp.yaml`)

### 3.1  Top-level sections

```yaml
metadata:       | required | ACP & trigger info, including optional LLM requirements
schema:         | required | JSON-Schema 2020-12 (string block)
prompt:         | optional | Markdown or plain-text template (string block)
tools:          | optional | Tool list (YAML array, OpenAI format) - Interface for LLM
tool_bindings:  | optional | Defines execution for non-built-in tools - Implementation for Runtime
```

### 3.2  Minimal example

```yaml
# ========= Agent Capability Package =========
metadata:
  id: did:nuwa:cap:note@1.0.0
  name: "Note"
  description: "Create & manage personal notes, optionally fetching content from web pages or describing images."
  triggers:
    - {type: regex, value: "记(.*)笔记|note|add note about"}
  memory_scope: sc:note
  permissions:
    require: ["state.create", "state.update", "state.query"]
  llm_requirements: # Optional: Specify LLM dependencies
    model_family: ["gpt-4", "claude-3"] # Suggests compatibility with these model families
    min_context_window: 16000 # Example: requires at least 16k context window
    # Other potential fields: specific_model_uri, required_features: ["tool_use_json_mode"]
  signature: zDIDSig1xyz…          # sha256 over whole file, signed by author DID key

schema: |
  { "$schema":"https://json-schema.org/draft/2020-12/schema",
    "$id":"did:nuwa:state:note#v1",
    "type":"object",
    "properties":{
      "id":{"type":"string","format":"uuid"},
      "title":{"type":"string","x-crdt":"lww_register"},
      "body":{"type":"string","x-crdt":"rga_text"},
      "source_url":{"type":"string","format":"uri", "description":"Optional URL of the source webpage or image."},
      "tags":{"type":"array","items":{"type":"string"},"x-crdt":"grow_only_set"},
      "createdAt":{"type":"string","format":"date-time"},
      "updatedAt":{"type":"string","format":"date-time"}
    },
    "required":["id","title","body","createdAt","updatedAt"]
  }

prompt: |
  You are Note Assistant.
  Your primary goal is to create a well-structured note object.
  If the user provides a URL, consider using the `fetch_web_content` tool to get its content to include in the note body.
  If the user provides an image URL, consider using the `recognize_image_content` tool to get a description to include in the note body.
  After gathering all necessary information, transform it into a Note object that conforms to the schema.
  Then call `state.create` with:
    schema_uri = "did:nuwa:state:note#v1"
    object     = <the JSON object for the note>
  If you use a tool like `fetch_web_content` or `recognize_image_content`, use its output to enrich the note's body.
  Always set the `source_url` field in the note object if the note is about a specific webpage or image.
  Reply only with the final `state.create` tool call, or an intermediate tool call if you need more information.

tools:
  - type: function
    function:
      name: state.create        # built-in tool
      description: Persist a new state object (a note).
      parameters:
        type: object
        properties:
          schema_uri: {type: string, enum: ["did:nuwa:state:note#v1"]}
          object:     {$ref: "#/schema"}
        required: [schema_uri, object]
  - type: function
    function:
      name: fetch_web_content
      description: "Fetches the main textual content from a given web page URL. Useful for summarizing or taking notes about online articles."
      parameters:
        type: object
        properties:
          url: {type: string, format: uri, description: "The URL of the web page to fetch content from."}
        required: [url]
  - type: function
    function:
      name: recognize_image_content
      description: "Analyzes an image from a given URL and returns a textual description of its content. Useful for adding context about an image to a note."
      parameters:
        type: object
        properties:
          image_url: {type: string, format: uri, description: "The URL of the image to analyze."}
        required: [image_url]

tool_bindings:
  "fetch_web_content":
    type: "mcp_service"
    service_uri: "did:nuwa:mcp:webscraper:version1" # Example MCP service URI
    mcp_action: "extract_text_content"
    # Arguments from LLM tool call (e.g., {url: "..."}) are passed as payload to MCP action.
  "recognize_image_content":
    type: "mcp_service"
    service_uri: "did:nuwa:mcp:visiondescribers:stable" # Example MCP service URI
    mcp_action: "describe_image_from_url"
    # Arguments from LLM tool call (e.g., {image_url: "..."}) are passed as payload.
# ========= End of ACP =========
```

### 3.3  Field rules

| Field         | Rule                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| `metadata.id` | MUST be a `Capability URI` (semantic-versioned DID). The `<name>` part of this URI, in conjunction with the `did:nuwa:cap` prefix, ensures global uniqueness for the capability's identity, managed by the registry contract. |
| `schema.$id`  | MUST be a `Schema URI`; `state.*` calls use it as `schema_uri`.                   |
| `triggers`    | Array of regex / keyword / embedding hashes; Router uses them for intent routing. |
| `metadata.llm_requirements` | Optional. An object specifying dependencies on LLM models or features. Fields can include `model_family` (array of strings, e.g., "gpt-4", "claude-2"), `specific_model_uri` (string, e.g., a DID or URL pointing to a specific model), `min_context_window` (integer), `required_features` (array of strings, e.g., "function_calling_json_mode"). The Router SHOULD attempt to satisfy these requirements if specified. |
| `signature`   | Author signs `sha256(file)` with a key in their DID Document.                     |

---

### 3.4 Tool Bindings (`tool_bindings`)

The optional `tool_bindings` section provides the Nuwa runtime with instructions on how to execute tools declared in the `tools` section that are not built-in (e.g., `state.*` family). If a tool declared in `tools` is not a built-in and does not have a corresponding entry in `tool_bindings`, the runtime may not be able to execute it.

This section is a YAML map where:
*   Each key is a `function.name` exactly as it appears in the `tools` section.
*   Each value is an object specifying the `type` of the binding and type-specific parameters.

Supported `type` values include (but are not limited to):
*   `http_get`: For making HTTP GET requests.
    *   `url`: The target URL. Arguments from the LLM tool call are typically appended as query parameters.
*   `http_post`: For making HTTP POST requests.
    *   `url`: The target URL. Arguments from the LLM tool call are typically sent as a JSON body.
*   `nuwa_a2a`: For making an Agent-to-Agent call using Nuwa's A2A protocols (e.g., NIP-2, NIP-3).
    *   `target_did`: The DID of the target Nuwa agent.
    *   `service_method`: The name of the service or method to invoke on the target agent. Arguments are passed as the payload.
*   `mcp_service`: For interacting with a service using the Model Context Protocol (MCP).
    *   `service_uri`: The URI of the MCP service.
    *   `mcp_action`: The specific action to perform on the MCP service. Arguments are passed as the payload.

**Example `tool_bindings`:**

```yaml
# ========= Agent Capability Package (ACP) Example with Tool Bindings =========
metadata:
  id: did:nuwa:cap:weatherreporter@1.0.0
  name: "Weather Reporter"
  description: "Provides weather forecasts and can message contacts."
  triggers:
    - {type: regex, value: "weather|forecast"}
  memory_scope: sc:weather
  permissions:
    require: [] # This capability might not use state.* tools directly

schema: |
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "did:nuwa:state:weatherreporter#v1",
    "type": "object",
    "properties": {
      "lastForecastLocation": {"type": "string"}
    }
  }

prompt: |
  You are a helpful weather assistant.
  Use the available tools to fetch weather information or send messages.

tools:
  - type: function
    function:
      name: "get_current_weather"
      description: "Get the current weather in a given location"
      parameters:
        type: object
        properties:
          location: {type: string, description: "The city and state, e.g., San Francisco, CA"}
          unit: {type: string, enum: [celsius, fahrenheit], default: "celsius"}
        required: [location]
  - type: function
    function:
      name: "send_notification"
      description: "Sends a notification message to a contact."
      parameters:
        type: object
        properties:
          contact_did: {type: string, description: "The DID of the Nuwa agent to notify."}
          message: {type: string, description: "The message content."}
        required: [contact_did, message]

tool_bindings:
  "get_current_weather":
    type: "http_get"
    url: "https://api.open-meteo.com/v1/forecast" # Example public API
    # The runtime would map 'location' (needs geocoding first, or API supports city name)
    # and 'unit' to appropriate query parameters for this specific API.
    # For simplicity, this example assumes direct mapping or runtime intelligence.
    # A more advanced spec might include parameter mapping rules here.

  "send_notification":
    type: "nuwa_a2a"
    target_did: "{contact_did}" # Placeholder, resolved from LLM arguments at runtime
    service_method: "receiveSimpleMessage"
# ========= End of ACP =========
```

---

## 4  Runtime behaviour

1.  **Install**

   * Router downloads the `.acp.yaml` via CID, verifies `signature`, caches file.
2.  **Route**

   * For each user message, Router:

     * checks explicit `/back`, `/switch`;
     * else tests top-of-stack capability;
     * else classifies message with `triggers` of installed capabilities.
3.  **Execute**

    *   Router passes message + section `prompt` + `tools` (the interface definitions) to LLM.
    *   LLM emits a tool call (e.g., `state.*` or a custom tool name from the `tools` manifest).
    *   **Tool Resolution & Execution**:
        *   If the tool name is a built-in (e.g., `state.create`), the runtime executes it directly. The object is validated against the capability's `schema` if applicable (e.g., for `state.create`).
        *   Else, the runtime looks up the tool name in the `tool_bindings` section of the ACP.
            *   If a binding is found, the runtime uses the specified `type` (e.g., `http_get`, `nuwa_a2a`, `mcp_service`) and associated parameters (e.g., `url`, `target_did`) to execute the tool call, passing the arguments provided by the LLM.
            *   If no binding is found and the tool is not built-in, the tool call cannot be fulfilled (this should be treated as an error or a specific response to the LLM).
    *   For `state.*` tools, runtime persists via CR-SQLite / RocksDB + CRDT log; anchors Merkle root per NIP-6.
4.  **Done / pop**

   * If tool response contains `{"done":true}` *or* Router times out / re-classifies, stack pops.

---

## 5  Built-in storage tools (`state.*`)

| Tool           | Purpose            | Notes                                |
| -------------- | ------------------ | ------------------------------------ |
| `state.create` | Insert full object | Generates CRDT “create” op.          |
| `state.update` | JSON-Patch diff    | Fields merged per `x-crdt` strategy. |
| `state.query`  | Mongo-like filter  | Returns stream / pageable cursor.    |
| `state.delete` | Soft/Hard delete   | Mode governed by permission scope.   |

A capability MUST declare required CRUD verbs in `metadata.permissions.require`.
The detailed mechanics of state persistence, `memory_scope` isolation, and the issuance of permission tokens (e.g., ZCAP-LD) for these tools may be further elaborated in a dedicated NIP.

---

## 6  Registry Interaction Model

The Capability Registry system facilitates the discovery and resolution of ACPs.
**Publishing** new capabilities or versions is a **client-side action** involving direct interaction with the underlying blockchain. This action results in on-chain events.
**Discovery and Resolution** are handled by Registry Indexing Services, which listen to these on-chain events, fetch ACP files from IPFS, and build a searchable index. These services SHOULD expose their query functionalities via the **Model Context Protocol (MCP)**.

### 6.1 Client-Side Publishing Actions

| Action                | Description                                                                 | Initiator         |
| --------------------- | --------------------------------------------------------------------------- | ----------------- |
| `Publish New Version` | Client-side action: package ACP, sign, upload to IPFS, and submit essential registration data (specifically `cap_uri`, `semver`, `cid` of the ACP file on IPFS, and `sha256` hash of the ACP file) to the blockchain. Requires DID authentication by the author. The full ACP YAML is stored on IPFS, not directly on-chain. | Client (e.g., CLI)|
| `Vote on Capability`  | Client-side action: submit a vote related to a capability's governance to a relevant smart contract. (Optional DAO model). | Client (e.g., CLI)|

On-chain implementations (e.g., the `acp-registry-contract`) MUST store at least the `cap_uri`, `semver`, `cid` (Content Identifier for the ACP file on IPFS), and `sha256` (hash of the ACP file for integrity verification). Upon successful publication of a new capability version, the contract MUST emit an event containing these four pieces of information.

### 6.2 Registry MCP Service Interface (for Discovery & Resolution)

Registry Indexing Services provide an MCP interface for clients to find and retrieve ACP information. Example MCP actions include:

| MCP Service Action      | Description                                                                 | Input Parameters (example) | Output (example)                                  |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------- |
| `resolve_capability`    | Resolves the latest (or specific version) of an ACP, returning its metadata and IPFS CID. | `cap_uri: string`          | `{ acp_metadata: object, ipfs_cid: string }` or error |
| `search_capabilities`   | Performs a full-text or semantic search over indexed ACP metadata.          | `query_string: string`, `filters: map` (optional) | `list_of_results: [{ acp_metadata: object, ipfs_cid: string }, ...]` or error |

Clients would use an SDK to make authenticated (if required by the MCP service, per NIP-6) calls to these MCP actions. The `acp_metadata` in the output would typically be the `metadata` section of the ACP YAML.

---

## 7  Security considerations

* **Signature validation** — Router MUST reject unsigned or invalid packages.
* **Sand-boxing** — Tool invocations run in WASM / container with least privilege.
* **Permission tokens** — Runtime issues ZCAP-LD (Authorization Capabilities for Linked Data, a decentralized authorization standard) tokens scoped to `memory_scope`.
* **Prompt-injection** — Router SHOULD lint `prompt` for forbidden patterns before mounting.

---

## 8  Backwards compatibility

Monolithic agents (pre-ACP) remain functional: Router falls back when no capability is triggered.
Schema version upgrades follow SemVer; incompatible changes require new `Schema URI`.

---

## 9  Reference implementation

* `acp-cli` — pack / sign / publish utility (Rust). Handles client-side interaction with IPFS and the blockchain for publishing.
* `acp-router` — TypeScript runtime with stack switching & OpenAI tool calls. Interacts with Registry MCP services for discovery.
* `acp-registry-contract` — Smart Contract on chain anchoring `(cap_uri, semver, cid, hash)` and emitting events for indexers.
* `acp-registry-indexer` — An MCP service that listens to on-chain events, fetches/caches ACPs from IPFS, indexes their metadata, and provides the MCP interface (e.g., `resolve_capability`, `search_capabilities`) for discovery.