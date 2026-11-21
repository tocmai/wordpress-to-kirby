import test from 'node:test';
import assert from 'node:assert';

import { parse, serialize } from '../src/kirby-txt.js';

test('parse()', () => {
	assert.deepEqual(parse('Hello: world'), {
		hello: 'world'
	});
	assert.deepEqual(parse('Pubdate: Fri, 13 May 2022 09:45:31 +0000'), {
		pubdate: 'Fri, 13 May 2022 09:45:31 +0000'
	});

	assert.deepEqual(parse(`Content:

<!-- wp:paragraph -->
<p></p>
<!-- /wp:paragraph -->`), {
		content: `<!-- wp:paragraph -->
<p></p>
<!-- /wp:paragraph -->`
	});

	assert.deepEqual(parse(`Content: 🙈`), {
		content: '🙈'
	});
});

test('serialize()', () => {
	assert.deepEqual(serialize({
		hello: 'worldwide\nweb'
	}), 'Hello:\n\nworldwide\nweb');
});