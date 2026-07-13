# Security Policy

## Reporting a Vulnerability

This is a static front-end site (Vite + React, deployed to Cloudflare Pages).
There is no server-side state or user input processing.

If you discover a security issue (e.g. a deployed asset leaking data, a
supply-chain concern in `package.json`, or a misconfigured `_headers`/
Content-Security-Policy), please report it privately:

- Open a [GitHub Security Advisory](https://github.com/gandli/phoenix-crown/security/advisories/new)
  on this repository, **or**
- Email the maintainer via a GitHub issue marked as confidential.

Please do **not** post exploitable details in public issues.

## Scope

- In scope: `src/`, `public/`, `vite.config.ts`, `.github/`, `package.json`, deployment config.
- Out of scope: the upstream fork [`aigc17/Chinese-PhoenixCrown`](https://github.com/aigc17/Chinese-PhoenixCrown)
  (report there instead).
