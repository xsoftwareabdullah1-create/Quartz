# Quartz Search Engine

Quartz is an experimental, self-hosted search engine project built with C, C++, CMake, C#, JavaScript, and Java for Android.

## Status

This repository is the starting point for an independently indexed search engine. It is not yet a full-web-scale crawler or a competitor to the largest search engines. The initial milestone focuses on a working local index, query API, ranking, native components, Android client, tests, and repeatable CI.

## Components

- `native/`: C tokenizer and C++ search core, built with CMake.
- `server/`: Node.js HTTP API and persistent document index.
- `auth/`: Google OAuth sign-in, PostgreSQL-backed Quartz identities and sessions; see [auth setup](auth/README.md).
- `web/`: responsive search interface.
- `android/`: Android WebView client.
- `tools/Quartz.Indexer/`: .NET CLI for submitting documents.
- `.github/workflows/`: build and test workflows.

## Quick start

```sh
cd server
npm install
npm test
npm start
```

Serve `web/` over HTTP and configure `web/config.js` for your search and auth service URLs. For Google Sign-In and `@quartz.com` account IDs, follow [auth/README.md](auth/README.md). Keep credentials server-side.

## Native build

```sh
cmake -S native -B build/native -DCMAKE_BUILD_TYPE=Release
cmake --build build/native --parallel
ctest --test-dir build/native --output-on-failure
```

## Roadmap

1. Ship a deterministic local search API and unit tests.
2. Connect the native C++ ranker to the API result path.
3. Add polite crawling, robots.txt handling, canonicalization, deduplication, and incremental indexing.
4. Add durable inverted-index storage and safe concurrent updates.
5. Build and verify Android APKs on CI across supported Android ABIs.

## Responsible crawling

Respect robots.txt, site terms, rate limits, copyright, and personal-data protections. Never crawl private or authenticated content without permission.

## License

MIT; see `LICENSE`.