---
nip: 8
title: Agent State Model (ASM): A Unified State Management Framework
author: <your‑name or org>
status: Draft
type: Standards Track — Data Layer
requires: NIP‑1, NIP‑2, NIP‑4, NIP‑7
created: 2025‑05‑15
license: CC‑BY‑SA‑4.0
---

# NIP-8: Agent State Model (ASM)

## 0 Summary

**Agent State Model (ASM)** defines a unified framework for describing, merging, querying, and managing the lifecycle of persistent states in Nuwa-compatible agents.  
It extends **JSON‑Schema 2020‑12** with a minimal set of `x‑asm` annotations:

| Area | Annotation | Purpose |
|------|------------|---------|
| **Container kind** | `container` | `object`, `map`, `list`, `log` |
| **CRDT policy** | `crdt` or per‑field `x‑crdt` | `lww_register`, `rga_text`, `or_map`, ... |
| **Lifecycle** | `x‑ttl`, `x‑retention`, `x‑compression` | automated ageing, summarisation, compression |
| **Visibility** | `x‑visibility` | `private`, `shared`, `public` |

Together with a small JSON‑AST query language (ASM‑QL) and the standard `state.*` tool family, ASM allows routers and runtimes to treat **conversation history, long‑term memory, settings, and arbitrary application data** in a unified, verifiable way.

---

## 1 Motivation

| Need | Current pain | ASM solution |
|------|--------------|--------------|
| Multiple data shapes | Only record‑like objects in NIP‑7 | Adds `map`, `list`, `log` containers |
| Conflict‑free merging | Each plugin hand‑picks a CRDT | Policy is declared in schema → runtime acts uniformly |
| Unified querying | Ad‑hoc filters per capability | ASM‑QL: portable, verifiable query AST |
| Memory & chat history | Not standardised | Built‑in **ConversationLog** & **MemoryStore** models |
| Data isolation | Name clashes across ACPs | **Namespace** rules under DID hierarchy |

---

## 2 Terminology

| Term | Meaning |
|------|---------|
| **Container** | Top‑level state shape (`object`, `map`, `list`, `log`). |
| **CRDT policy** | Conflict‑resolution algorithm bound to container / field. |
| **Memory Scope** | Named partition (e.g. `sc:note`, `sc:chat`) governed by ASM rules. |
| **ASM‑QL** | JSON serialisable query language evaluated by runtime and optionally verified on‑chain. |

---

## 3 Built‑in Core Models

Nuwa runtimes **MUST** create exactly one instance of each core model for every user on first run.

### 3.1 ConversationLog `did:nuwa:core:ConversationLog#v1`
```json
{
  "$id": "did:nuwa:core:ConversationLog#v1",
  "type": "object",
  "x-asm": {
    "container": "log",
    "crdt": "append_only",
    "x-ttl": "P14D",
    "x-compression": "br",
    "x-visibility": "private"
  },
  "properties": {
    "entries": {
      "type": "array",
      "x-crdt": "log_rga",
      "items": {
        "type": "object",
        "properties": {
          "id":        {"type":"string","format":"uuid"},
          "role":      {"type":"string","enum":["user","assistant"]},
          "content":   {"type":"string"},
          "timestamp": {"type":"string","format":"date-time"}
        },
        "required":["id","role","content","timestamp"]
      }
    }
  },
  "required": ["entries"]
}
```

**Note**:
- `"container": "log"`: Specifies that this is an append-only event stream.
- `"crdt": "append_only"`: Conflict-free replicated data type for appending entries.
- `"x-ttl": "P14D"`: Entries older than 14 days may be deleted. This value can be configured.
- `"x-compression": "br"`: Data may be stored using Brotli compression, chosen for its balance of compression ratio and speed.
- `"x-visibility": "private"`: Access is restricted to the owner.

### 3.2 MemoryStore `did:nuwa:core:MemoryStore#v1`
```json
{
  "$id": "did:nuwa:core:MemoryStore#v1",
  "type": "object",
  "x-asm": {
    "container": "map",
    "keyType": "string",
    "valueRef": "#/definitions/MemoryItem",
    "x-retention": {
      "window": "P90D",
      "strategy": "evict_low_importance"
    },
    "x-visibility": "private"
  },
  "properties": {
    "items": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/MemoryItem" }
    }
  },
  "definitions": {
    "MemoryItem": {
      "type": "object",
      "properties": {
        "value":     {"type":"string"},
        "importance":{"type":"number"},
        "createdAt": {"type":"string","format":"date-time"}
      },
      "required":["value","importance","createdAt"]
    }
  }
}
```

**Note**:
- `"container": "map"`: Specifies that this is a key-value map.
- `"x-retention": {"window": "P90D", "strategy": "evict_low_importance"}`: Retains data for 90 days and evicts low-importance items. "Low importance" is determined by the `importance` field.
- `"x-visibility": "private"`: Access is restricted to the owner.

### 3.3 AgentSettings `did:nuwa:core:AgentSettings#v1`
```json
{
  "$id": "did:nuwa:core:AgentSettings#v1",
  "type": "object",
  "x-asm": {
    "container": "object",
    "x-visibility": "private"
  },
  "properties": {
    "language": {"type":"string","enum":["zh","en","ja","es"]},
    "tone":     {"type":"string","enum":["casual","formal","kids"]},
    "theme":    {"type":"string","enum":["light","dark"]},
    "notifOpt": {"type":"boolean"}
  },
  "required": ["language"]
}
```

**Note**:
- `"container": "object"`: Specifies that this is a structured object.
- `"x-visibility": "private"`: Access is restricted to the owner.
- `"required": ["language"]`: Language is mandatory to ensure proper localization.

---

## 4 Container Kinds & CRDT Policies

| Kind | Typical usage | Default CRDT |
|------|---------------|--------------|
| `object` | Fixed structured record | per‑field mix |
| `map` | Arbitrary key → value | **OR‑Map** |
| `list` | Ordered sequence | **RGA / Y‑list** |
| `log` | Append‑only event stream | Monotonic vector |

The canonical `x-crdt` keywords are:

```
lww_register • mv_register • rga_text • grow_only_set • or_map • counter • flag • log_rga
```

---

## 5 Lifecycle & Visibility

| Annotation | Format | Semantics |
|------------|--------|-----------|
| `x-ttl` | ISO‑8601 duration | Hard expiry; entries beyond TTL MAY be deleted. |
| `x-retention` | `{window,strategy}` | Sliding window & summarisation rules. |
| `x-compression` | `"br"` / `"zstd"` / `"gzip"` | Runtime MAY store snapshots compressed. |
| `x-visibility` | `private` / `shared` / `public` | Router MUST enforce access control. |

---

## 6 ASM‑QL — Query Language

Example AST:

```json
{
  "select": ["id","title"],
  "from":   "did:nuwa:state:note#v1",
  "where":  {"tags":{"$contains":"meeting"}},
  "order":  [{"field":"updatedAt","direction":"desc"}],
  "limit":  20,
  "cursor": "opaque-base64"
}
```

Runtimes MAY translate to SQL, RocksDB iterators, or CR‑SQLite views.  
Provers MAY embed the same AST in a Merkle proof for verifiable reads.

---

## 7 `state.*` Tool Semantics

| Tool | Required params | Behaviour |
|------|-----------------|-----------|
| `state.create`  | `schema_uri`, `object` | Validate via ASM, emit **create‑op** |
| `state.update`  | `schema_uri`, `id`, `patch` | JSON‑Patch / `$inc`, `$push` diff |
| `state.query`   | `query` (ASM‑QL) | Stream results or single shot |
| `state.delete`  | `schema_uri`, `id`, `mode` | Tombstone or hard delete |

All ops are persisted into the NIP‑4 CRDT Event Log; snapshots anchored on‑chain by NIP‑13.

---

## 8 Namespace Rules

| Namespace | Pattern | Purpose |
|-----------|---------|---------|
| **core** | `did:nuwa:core:<Model>#<ver>` | Platform‑built‑in |
| **cap**  | `did:nuwa:cap:<cap_id>:state:<Name>#<ver>` | Each ACP’s private data |
| **app**  | `did:nuwa:app:<app_name>:state:<Name>#<ver>` | Multi‑capability application |
| **user** | `did:nuwa:user:<did_suffix>:state:<Name>#<ver>` | Experimental / ad‑hoc |

* Storage **MUST** be table‑isolated per namespace.  
* Registry **MUST NOT** allow duplicate DID + state path except for version bump.

---

## 9 Runtime Rules

1. **Schema resolution** — `$id` MUST resolve via local cache → Registry → DID resolver.  
2. **Container isolation** — Distinct `memory_scope` ↔ distinct CRDT log.  
3. **TTL enforcement** — Background task removes or summarises expired log ranges.  
4. **Compression** — If `x-compression` set, runtime MAY store chunks compressed and anchor CAR hash.  

---

## 10 Security Considerations

* **Signature validation**: runtime MUST reject unsigned or tampered schemas.  
* **Size limit**: objects >32 MiB require `storage.large` permission.  
* **Query cost**: ASM‑QL execution SHOULD be metered and may tie into NIP‑3 payment flow.  
* **Privacy**: `x-visibility` enforced via capability tokens (ZCAP‑LD).

## 11 References

1. [**JSON‑Schema 2020‑12**](https://json-schema.org/specification-links.html#2020-12)  
2. [**DIDComm v2**, Decentralized Identity Foundation](https://identity.foundation/didcomm-messaging/spec/)  
3. [**ZCAP‑LD**, W3C CCG](https://w3c-ccg.github.io/zcap-ld/)  
4. [**Automerge Binary File Format**](https://github.com/automerge/automerge)  
5. [**Conflict‑Free Replicated Data Types** (Shapiro et al.)](https://hal.inria.fr/inria-00555588/document)
