---
nip: <NIP number>
title: <NIP title>
author: <list of authors' real names and optionally, email addrs or GitHub usernames>
discussions-to: <URL of the discussion thread, e.g., a GitHub issue or forum post>
status: <Draft | Active | Stagnant | Withdrawn | Living | Final>
type: <Standards Track | Informational | Meta>
category: <Core | Networking | Interface | Agent | App | Wallet>
created: <date created on, in ISO 8601 (yyyy-mm-dd) format>
updated: <date of last significant update, in ISO 8601 (yyyy-mm-dd) format> // Optional, but recommended
requires: <NIP number(s) | URI(s) to other specifications>
replaces: <NIP number(s)>
superseded-by: <NIP number(s)>
---

## Abstract

A concise (~200 words) description of the NIP's purpose and the technical issue it addresses.

## Motivation

This section is critical. It should clearly explain:
*   The problem or opportunity the NIP addresses.
*   Why the existing protocol/system is inadequate.
*   The benefits of adopting this NIP.
NIP submissions without sufficient motivation may be rejected.

## Specification

The technical specification should describe the syntax, semantics, and behavior of any new feature or change. It must be detailed enough to allow for independent, interoperable implementations.
This section may include:
*   Definitions of new terms.
*   Data structures and formats.
*   Algorithm descriptions.
*   API specifications.
*   State machine diagrams, if applicable.

## Rationale

This section explains the "why" behind the design choices in the "Specification" section. It should:
*   Describe alternative designs that were considered and why they were not chosen.
*   Discuss related work or prior art.
*   Provide evidence of community consensus or address significant objections raised during discussions.

## Backwards Compatibility

All NIPs that introduce changes must address backwards compatibility.
*   If the NIP is fully backwards compatible, explain how.
*   If there are incompatibilities, describe them, their severity, and how the author proposes to manage them (e.g., migration paths, versioning).
NIPs with insufficient backwards compatibility considerations may be rejected.

## Test Cases

Test cases are highly recommended for all NIPs, and mandatory for NIPs proposing changes to consensus-critical or core protocol components.
*   Provide concrete examples and expected outcomes.
*   Link to test suites if available.

## Reference Implementation

A reference implementation is highly recommended, and mandatory for NIPs proposing changes to consensus-critical or core protocol components.
*   Link to the reference implementation (e.g., a GitHub repository or branch).

## Security Considerations

All NIPs must include a section discussing security implications. This should cover:
*   Potential vulnerabilities introduced by the NIP.
*   How the NIP mitigates these vulnerabilities.
*   Any new attack surfaces.
*   Security-relevant design decisions.
NIPs without adequate security considerations will be rejected and cannot reach "Final" status.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).