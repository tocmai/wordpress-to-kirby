import assert from 'node:assert';
import test from 'node:test';

import { uuid } from '../src/uuid.js';

test('uuid()', () => {
	assert.ok(uuid().match(/^[a-z0-9]{16}$/i));
});