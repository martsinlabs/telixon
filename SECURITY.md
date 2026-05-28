# Security Policy

This document is the private channel for reporting vulnerabilities in Telixon.

## Reporting a vulnerability

Use the GitHub Security Advisory form:
[github.com/martsinlabs/telixon/security/advisories/new](https://github.com/martsinlabs/telixon/security/advisories/new).
Alternatively, email `support@telixon.dev`. The Advisory form is preferred because it keeps the
report trackable inside GitHub.

Do not file a public issue. Do not post details on social media or blogs before a fix is released.

## Scope

**In scope:**

- Vulnerabilities in `@telixon/core` engine logic (parsing, validation, formatting)
- Vulnerabilities in `@telixon/web-sdk` input handling
- ReDoS or CPU exhaustion via crafted phone-number input
- Prototype pollution via the public API
- Supply-chain attacks on published `@telixon/*` artifacts

**Out of scope:**

- Vulnerabilities in third-party dependencies. Report those to the dependency upstream.
- Issues in downstream applications that use Telixon. Those are the application's responsibility.
- Theoretical attacks without a reproducible proof of concept.
- Denial of service via legitimate but expensive input.

## Supported versions

Pre-1.0. Security fixes target the latest published version only. A formal LTS policy will be defined
at 1.0.

## Response timeline

- Acknowledgment: within **5 business days** of report receipt.
- Initial assessment and triage: within **14 days**.
- Fix and coordinated disclosure: case-by-case, embargo typically 30 to 90 days.

## Disclosure process

1. You submit a private report through the GitHub Security Advisory form.
2. The maintainer acknowledges within 5 business days.
3. We agree on impact assessment and embargo timeline.
4. A patch is prepared and released in a new version.
5. A public advisory is published, with a CVE identifier if appropriate and credit to the reporter.

## Acknowledgment

Reporters who follow this policy in good faith are credited by name in the public advisory, unless
they prefer to remain anonymous.

## Safe harbor

We will not pursue legal action or report researchers who:

- act in good faith,
- limit testing to their own copy or a controlled environment,
- avoid impacting other users of Telixon-based applications,
- privately disclose findings through this channel before any public disclosure,
- allow reasonable time for a fix before disclosing.

This policy follows the principles of [disclose.io](https://disclose.io/).
