# Architecture

Web client → Node HTTP API → local JSON document store and lexical ranker. C tokenizer and C++ scorer form a CMake library. C# CLI submits documents. Android wraps the web assets. Native ranking is not yet connected to the API path.
