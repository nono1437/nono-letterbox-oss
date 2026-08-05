# Security Policy

Nono Letterbox handles content that may be personal, so privacy failures are treated as security issues.

## Supported versions

The project is currently preparing its first public preview. Security fixes will target the latest public branch and release.

## Reporting a vulnerability

Please do **not** publish any of the following in a public GitHub Issue:

- access tokens, API keys, OAuth credentials, or cookies;
- real email addresses or private message text;
- Android keystores, certificates, signing fingerprints tied to a private build;
- personal backup files or attachments.

For non-sensitive bugs, open a normal Issue with redacted screenshots and logs.

For a sensitive vulnerability, contact the maintainer privately through the GitHub profile. GitHub private vulnerability reporting will be used when it is enabled for this repository.

## Security boundaries

The public edition must follow these rules:

- no secrets or personal data in source control or Git history;
- no silent transmission of letters, replies, attachments, or activity data;
- network integrations require explicit configuration and user consent;
- browser-exposed `VITE_*` variables must never contain secrets;
- Android signing material must remain outside the repository;
- demo data must be fictional and safe to publish.

A report is especially valuable when it includes affected version/commit, reproduction steps, likely impact, and a suggested mitigation without including real private data.
