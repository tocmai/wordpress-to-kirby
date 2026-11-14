#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import opsh from 'opsh';
import { JSDOM } from 'jsdom';
import { load } from 'js-yaml';
import { unserialize } from 'php-serialize';

import { serialize } from './src/kirby-txt.js';
import { uuid } from './src/uuid.js';

async function getPackage() {
	return JSON.parse(
		await readFile(new URL('./package.json', import.meta.url))
	);
}

const { operands, options } = opsh(
	process.argv.slice(2),
	['help', 'h', 'version', 'v']
);

if (options.h || options.help) {
	await printHelp();
	process.exit();
}

if (options.v || options.version) {
	const pkg = await getPackage();
	console.log(pkg.version);
	process.exit();
}

if (operands.length !== 1) {
	console.error(`Exactly one operand is supported, ${operands.length} provided. Exiting.`);
	process.exit(1);
}

const parsers = {};
const serializers = {};

function commasep(val) {
	return (val || '').split(/\s*,\s*/).filter(Boolean);
}

commasep(options.parse).forEach(pair => {
	let [key, val] = pair.split('=');
	key = key.trim();
	val = val.trim();
	if (!key || !val) {
		return;
	}
	parsers[key] = val;
});

commasep(options.serialize).forEach(pair => {
	let [key, val] = pair.split('=');
	key = key.trim();
	val = val.trim();
	if (!key || !val) {
		return;
	}
	serializers[key] = val;
});

const keys_to_include = new Set(commasep(options.include));
const keys_to_exclude = new Set(options.include ? [] : commasep(options.exclude));

function pluck(item) {
	if (keys_to_include.size) {
		return Object.fromEntries(
			Object.entries(item)
				.filter(entry => keys_to_include.has(entry[0]))
		);
	}
	if (keys_to_exclude.size) {
		return Object.fromEntries(
			Object.entries(item)
				.filter(entry => !keys_to_exclude.has(entry[0]))
		);
	}
	return item;
}

function parse(key, value) {
	if (!value) {
		return value;
	}
	switch(parsers[key]) {
		case 'php':
			try {
				return unserialize(value);
			} catch(err) {
				console.error(`Can’t unserialize PHP value, skipping: ${value}`);
				return value;
			}
		case 'yaml':
			try {
				return load(value);
			} catch (err) {
				console.error(`Can’t parse YAML value, skipping: ${value}`);
				return value;
			}
		case 'json':
			try {
				return JSON.parse(value);
			} catch(err) {
				console.error(`Can’t parse JSON value, skipping: ${value}`);
				return value;
			}
		default:
			return value;
	}
}

const document = new JSDOM(
	await readFile(operands[0], 'utf8'),
	{
		contentType: 'application/xml'
	}
).window.document;

const items = Array.from(document.querySelectorAll('item')).map(extract);

function extract(item) {
	const select = (sel, ns, all = false, el) => {
		if (ns) {
			const candidates = Array.from((el ?? item).querySelectorAll(sel) ?? [])
				.filter(it => it.nodeName === `${ns}:${sel}`);
			return all ? candidates : candidates[0];
		}
		return (el ?? item).querySelector(sel);
	}
	return {
		title: select('title').textContent,
		link: select('link').textContent,
		pubDate: select('pubDate').textContent,
		creator: select('creator', 'dc').textContent,
		guid: select('guid').textContent,
		guid_isPermaLink: select('guid').getAttribute('isPermaLink'),
		description: select('description').textContent,
		content: select('encoded', 'content').textContent,
		excerpt: select('encoded', 'excerpt').textContent,
		post_id: select('post_id', 'wp').textContent,
		post_date: select('post_date', 'wp').textContent,
		post_date_gmt: select('post_date_gmt', 'wp').textContent,
		post_modified: select('post_modified', 'wp').textContent,
		post_modified_gmt: select('post_modified_gmt', 'wp').textContent,
		comment_status: select('comment_status', 'wp').textContent,
		ping_status: select('ping_status', 'wp').textContent,
		post_name: select('post_name', 'wp').textContent,
		status: select('status', 'wp').textContent,
		post_parent: select('post_parent', 'wp').textContent,
		menu_order: select('menu_order', 'wp').textContent,
		post_type: select('post_type', 'wp').textContent,
		post_password: select('post_password', 'wp').textContent,
		is_sticky: select('is_sticky', 'wp').textContent,
		...select('postmeta', 'wp', true).reduce((acc, it) => {
			const key = select('meta_key', 'wp', false, it).textContent;
			const value = select('meta_value', 'wp', false, it).textContent;
			if (!key.match(/^_/)) {
				acc['postmeta_' + key] = parse('postmeta_' + key, value);
			}
			return acc;
		}, {}),
		uuid: uuid()
	}
}

const outdir = options.o || options.outdir || 'wordpress-to-kirby';

function outpath(item) {
	let parts = (new URL(item.link)).pathname.split('/').filter(Boolean);
	if (item.post_type === 'attachment') {
		parts = ['attachments', ...parts];
	}
	if (!parts.length) {
		parts = ['_unlinked', item.post_type, item.post_id, ...parts];
	}
	return join(outdir, ...parts, item.post_type + '.txt');
}

for await (let item of items) {
	const destination = outpath(item);
	await mkdir(dirname(destination), { recursive: true });
	await writeFile(destination, serialize(pluck(item)));
};

function printHelp() {
	console.log(`wordpress-to-kirby: 

	transform a WordPress XML export 
	into a directory of Kirby CMS files.

Usage:
	
	wordpress-to-kirby <options> <xml-file>

Options:

	-h, --help
		Print out this help information.

	-v, --version
		Show the program version.

	-o, --outdir
		Root directory to output to, relative to CWD.
		Default: 'wordpress-to-kirby'

	--parse=<rules>
		Instructions to parse some fields, in the form of:
		"<key>=<parser>,<key>=<parser>,…"
		Supported parsers:
			php: deserialize PHP object.
			yaml: parse as YAML.
			json: parse as JSON.
		Prefix post meta fields with "postmeta".

	--serialize=<rules>
		Not implemented yet.

	--exclude=<keys>
		Exclude certain keys from the output. Comma-separated.

	--include=<keys>
		Only include certain keys from the output. Comma-separated.
		When '--include' is specified, any '--exclude' is ignored.

Keys extracted from the XML:

	Top-level:

		title, link, pubDate, creator, guid, guid_isPermaLink,
		description, content, excerpt, post_id, post_date, 
		post_date_gmt, post_modified, post_modified_gmt, 
		comment_status, ping_status,  post_name, status, 
		post_parent, menu_order, post_type, post_password, is_sticky

	Post metadata:

		Fields from <wp:postmeta> not starting with an underscore
		are included in the output with the 'postmeta_*' prefix.

Keys generated from scratch:

		uuid — sixteen random alphanumeric characters.
`);
}