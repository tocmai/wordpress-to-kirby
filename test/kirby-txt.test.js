import test from 'node:test';
import assert from 'node:assert';

import { parse, serialize } from '../src/kirby-txt.js';

test('parse()', () => {
	assert.deepEqual(parse('Hello: world'), {
		hello: 'world'
	});
});

test('serialize()', () => {
	assert.deepEqual(serialize({
		hello: 'worldwide\nweb'
	}), 'Hello:\n\nworldwide\nweb');
});