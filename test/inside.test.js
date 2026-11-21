import test from 'node:test';
import { equal } from 'node:assert';

import inside from '../src/inside.js';

test('inside()', () => {
	equal(inside('a', ''), false);
	equal(inside('a', 'a/.'), false);
	equal(inside('a', 'a/b'), true);
	equal(inside('a', 'a/../a/b'), true);
});