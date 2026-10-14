import test from 'node:test';import assert from 'node:assert/strict';import {validDocument} from '../src/validate.js';
test('only HTTP URLs accepted',()=>{assert.equal(validDocument({url:'https://example.org'}),true);assert.equal(validDocument({url:'file:///etc/passwd'}),false);});
