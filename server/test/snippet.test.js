import test from 'node:test';import assert from 'node:assert/strict';import {makeSnippet} from '../src/snippet.js';
test('snippet normalizes whitespace',()=>assert.equal(makeSnippet(' a   b '),'a b'));
test('snippet respects max length',()=>assert.ok(makeSnippet('x'.repeat(300),20).length<=20));
