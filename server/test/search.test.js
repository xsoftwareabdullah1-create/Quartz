import test from 'node:test';import assert from 'node:assert/strict';import {tokenize} from '../src/tokenize.js';import {scoreDocument} from '../src/ranker.js';
test('tokenizer splits punctuation',()=>assert.deepEqual(tokenize('Quartz, Search! 2026'),['quartz','search','2026']));
test('title matches rank higher',()=>assert.ok(scoreDocument('quartz search',{title:'Quartz Search',content:''})>scoreDocument('quartz search',{title:'Guide',content:'quartz search'})));
test('empty query has zero score',()=>assert.equal(scoreDocument('',{title:'Quartz'}),0));
