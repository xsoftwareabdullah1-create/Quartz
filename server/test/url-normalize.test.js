import test from 'node:test';import assert from 'node:assert/strict';import {normalizeUrl} from '../src/url-normalize.js';
test('normalizes host and removes fragment',()=>assert.equal(normalizeUrl('https://EXAMPLE.org/path#x'),'https://example.org/path'));
