#!/usr/bin/env node
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname, relative, sep } from 'node:path';

import opsh from 'opsh';
import { JSDOM } from 'jsdom';
import { load, dump } from 'js-yaml';
import { serialize, unserialize } from 'php-serialize';

import { serialize as serialize_item } from './src/kirby-txt.js';
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

const [command, ...files ] = operands;

if (command !== 'generate' && command !== 'download') {
	console.error(`Supported commands: generate, download; ${command} provided. Exiting.`);
	process.exit(1);
}

if (files.length !== 1) {
	console.error(`Exactly one file is supported, ${files.length} provided. Exiting.`);
	process.exit(1);
}

const parsers = {
	'postmeta_wp_attachment_metadata': 'php'
};
const serializers = {
	'postmeta_wp_attachment_metadata': 'json'
};

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

const fields_to_include = new Set(commasep(options['include-fields']));
const fields_to_exclude = new Set(options['include-fields'] ? [] : commasep(options['exclude-fields']));

const types_to_include = new Set(commasep(options['include-types']));
const types_to_exclude = new Set(options['include-types'] ? [] : commasep(options['exclude-types']));

function process_item(item) {
	let entries = Object.entries(item);
	if (fields_to_include.size) {
		entries = entries.filter(entry => fields_to_include.has(entry[0]));
	} else if (fields_to_exclude.size) {
		entries = entries.filter(entry => !fields_to_exclude.has(entry[0]));
	}
	return Object.fromEntries(
		entries.map(entry => [
			entry[0],
			serialize_value(entry[0], entry[1])
		])
	);
}

function parse_value(key, value) {
	if (!value) {
		return value;
	}
	switch(parsers[key]) {
		case 'php':
			try {
				return unserialize(value);
			} catch(err) {
				console.error(`Warn: Can’t serialize PHP value, skipping: ${value}`);
				return value;
			}
		case 'yaml':
			try {
				return load(value);
			} catch (err) {
				console.error(`Warn: Can’t serialize YAML value, skipping: ${value}`);
				return value;
			}
		case 'json':
			try {
				return JSON.parse(value);
			} catch(err) {
				console.error(`Warn: Can’t serialize JSON value, skipping: ${value}`);
				return value;
			}
		case 'html':
			try {
				return new JSDOM(
					`<!doctype html><html><head></head><body>${value}</body></html>`
				).window.document;
			} catch(err) {
				console.error(`Warn: Can’t serialize JSON value, skipping: ${value}`);
				return value;
			}
		default:
			return value;
	}
}

function serialize_value(key, value) {
	if (!value) {
		return value;
	}
	switch(serializers[key]) {
		case 'php':
			try {
				return serialize(value);
			} catch(err) {
				console.error(`Warn: Can’t stringify PHP value, skipping: ${value}`);
				return value;
			}
		case 'yaml':
			try {
				return dump(value);
			} catch (err) {
				console.error(`Warn: Can’t stringify YAML value, skipping: ${value}`);
				return value;
			}
		case 'json':
			try {
				return JSON.stringify(value);
			} catch(err) {
				console.error(`Warn: Can’t stringify JSON value, skipping: ${value}`);
				return value;
			}
		case 'html':
			try {
				return value.body.innerHTML;
			} catch(err) {
				console.error(`Warn: Can’t stringify HTML value, skipping: ${value}`);
				return value;
			}
		default:
			return value;
	}
}

const document = new JSDOM(
	await readFile(files[0], 'utf8'),
	{
		contentType: 'application/xml'
	}
).window.document;

const items = Array.from(document.querySelectorAll('item'))
	.map(extract)
	.filter(item => {
		if (types_to_include.size) {
			return types_to_include.has(item.post_type);
		} else if (types_to_exclude.size) {
			return !types_to_exclude.has(item.post_type);
		}
		return true;
	});

function extract(item) {
	const select = (sel, ns, all = false, el) => {
		if (ns) {
			const candidates = Array.from((el ?? item).querySelectorAll(sel) ?? [])
				.filter(it => it.nodeName === `${ns}:${sel}`);
			return all ? candidates : candidates[0];
		}
		return (el ?? item).querySelector(sel);
	}

	const post_type = parse_value('post_type', select('post_type', 'wp').textContent);

	return {
		title: parse_value('title', select('title').textContent),
		link: parse_value('link', select('link').textContent),
		pubDate: parse_value('pubDate', select('pubDate').textContent),
		creator: parse_value('creator', select('creator', 'dc').textContent),
		guid: parse_value('guid', select('guid').textContent),
		guid_isPermaLink: parse_value('guid_isPermaLink', select('guid').getAttribute('isPermaLink')),
		description: parse_value('description', select('description').textContent),
		content: parse_value('content', select('encoded', 'content').textContent),
		excerpt: parse_value('excerpt', select('encoded', 'excerpt').textContent),
		post_id: parse_value('post_id', select('post_id', 'wp').textContent),
		post_date: parse_value('post_date', select('post_date', 'wp').textContent),
		post_date_gmt: parse_value('post_date_gmt', select('post_date_gmt', 'wp').textContent),
		post_modified: parse_value('post_modified', select('post_modified', 'wp').textContent),
		post_modified_gmt: parse_value('post_modified_gmt', select('post_modified_gmt', 'wp').textContent),
		comment_status: parse_value('comment_status', select('comment_status', 'wp').textContent),
		ping_status: parse_value('ping_status', select('ping_status', 'wp').textContent),
		post_name: parse_value('post_name', select('post_name', 'wp').textContent),
		status: parse_value('status', select('status', 'wp').textContent),
		post_parent: parse_value('post_parent', select('post_parent', 'wp').textContent),
		menu_order: parse_value('menu_order', select('menu_order', 'wp').textContent),
		post_type,
		post_password: parse_value('post_password', select('post_password', 'wp').textContent),
		attachment_url: parse_value('attachment_url', select('attachment_url', 'wp')?.textContent),
		is_sticky: parse_value('is_sticky', select('is_sticky', 'wp').textContent),
		...select('postmeta', 'wp', true).reduce((acc, it) => {
			const key = select('meta_key', 'wp', false, it).textContent;
			const value = select('meta_value', 'wp', false, it).textContent;
			acc['postmeta' + key] = parse_value('postmeta' + key, value);
			return acc;
		}, {}),
		uuid: uuid(),
		template: post_type === 'attachment' ? 'attachment' : undefined
	}
}

const outdir = options.o || options.outdir || 'wordpress-to-kirby';

function outpath(item) {
	let parts = (new URL(item.link)).pathname.split('/').filter(Boolean);
	if (item.post_type === 'attachment') {
		const filename = parts.pop() + (extname(item.attachment_url ?? '') ?? '') + '.txt';
		return join(outdir, 'content', ...parts.filter(p => p !== 'attachment'), filename);
	}
	if (!parts.length) {
		parts = ['_unlinked', item.post_type, item.post_id, ...parts];
	}
	return join(outdir, 'content', ...parts, item.post_type + '.txt');
}

if (command === 'generate') {
	for await (let item of items) {
		const destination = outpath(item);
		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, serialize_item(process_item(item)));
	};

	const metadata = {
		output: [],
		types: {}
	};

	items.forEach(item => {
		metadata.output.push({
			post_id: +item.post_id,
			post_type: item.post_type,
			url: item.attachment_url ?? item.link,
			uuid: item.uuid,
			path: relative(outdir, outpath(item))
		});
		metadata.types[item.post_type] = (metadata.types[item.post_type] || [])
			.concat(Object.keys(item));
	});

	const blueprints_path = join(outdir, 'site', 'blueprints');
	await mkdir(join(blueprints_path, 'pages'), { recursive: true });
	await mkdir(join(blueprints_path, 'files'), { recursive: true });

	Object.keys(metadata.types).forEach(key => {
		metadata.types[key] = Array.from(new Set(metadata.types[key])).sort();
		// Make blueprints
		const blueprint_content = metadata.types[key].reduce((acc, curr) => {
			acc[curr] = {
				type: 'text'
			};
			return acc;
		}, {});

		if (key === 'attachment') {
			const blueprint_dest = join(
				blueprints_path, 
				'files', 
				key + '.yml'
			);

			writeFile(blueprint_dest, dump({
				fields: blueprint_content
			}));

		} else {
			const blueprint_dest = join(
				blueprints_path, 
				'pages', 
				key + '.yml'
			);

			writeFile(blueprint_dest, dump({
				tabs: {
					fields: {
						label: 'Fields',
						sections: {
							fields: {
								type: 'fields',
								fields: blueprint_content
							}		
						}
					},
					pages: {
						label: 'Pages',
						sections: {
							pages: {
								type: 'pages'
							}
						}
					},
					files: {
						label: 'Files',
						sections: {
							files: {
								type: 'files'
							}
						}
					}
				}
			}));
		}
	});


	const default_blueprint = {
		tabs: {
			pages: {
				label: 'Pages',
				sections: {
					pages: {
						type: 'pages'
					}
				}
			},
			files: {
				label: 'Files',
				sections: {
					files: {
						type: 'files'
					}
				}
			}
		}
	};
	await writeFile(join(blueprints_path, 'pages', 'default.yml'), dump(default_blueprint));
	await writeFile(join(blueprints_path, 'site.yml'), dump(default_blueprint));

	await writeFile(join(outdir, 'metadata.json'), JSON.stringify(metadata, null, '\t'));
}

if (command === 'download') {

	const contentdir = options.contentdir ? 
		(URL.canParse(options.contentdir) ? 
			new URL(options.contentdir) :
			options.contentdir
		) : null;

	const fetched = new Set();

	for await (let item of items.filter(it => it.post_type === 'attachment')) {
		const attachment = process_item(item);
		const dest = outpath(attachment).replace(/\.txt$/, '');
		if (contentdir) {
			const pathname = new URL(attachment.attachment_url).pathname
				.split('/')
				.filter(p => p && p !== 'wp-content')
				.join(sep);
			if (typeof contentdir === 'string') {
				await copyFile(join(contentdir, pathname), dest);
			} else {
				const url = new URL(pathname, contentdir);
				if (fetched.has(url)) {
					console.log(`Already fetched, skipping: ${url}`);
				} else {
					console.log(`Fetching: ${url}`);
					await mkdir(dirname(dest), { recursive: true });
					await writeFile(
						dest,
						(await fetch(url)).body
					);
					console.log(`Fetched: ${url}`);
					fetched.add(url);
				}
			}
		} else {
			if (fetched.has(attachment.attachment_url)) {
				console.log(`Already fetched, skipping: ${attachment.attachment_url}`);
			} else {
				console.log(`Fetching: ${attachment.attachment_url}`);
				await mkdir(dirname(dest), { recursive: true });
				await writeFile(
					dest,
					(await fetch(attachment.attachment_url)).body
				);
				console.log(`Fetched: ${attachment.attachment_url}`);
				fetched.add(attachment.attachment_url);
			}
		}
		
	}
}

function printHelp() {
	console.log(`wordpress-to-kirby: 

	transform a WordPress XML export into a directory of Kirby CMS files.

Usage:
	
	wordpress-to-kirby generate [options] <wordpress-xml-file>
	wordpress-to-kirby download [options] <wordpress-xml-file>

Commands available:

	generate
		Generate a Kirby CMS file structure from the provided XML file.

	download
		Download attachments.

Options available:

	-h, --help

		Prints out this help information.

	-v, --version

		Shows the program version.

	-o, --outdir

		Root directory to which to write the output, 
		relative to the current working directory.
		
		Default: 'wordpress-to-kirby'

	--contentdir

		For the 'download' command, point to the location 
		of a 'wp-content' directory from which to download attachments. 
		
		The path can be:
		
		* an absolute or relative local path;
		* a fully-qualified URL, including the 'wp-content' segment,
		  e.g. https://mywebsite.local/wp-content/

	--parse=<rules>
		
		Instructions to parse some fields, specified as:
		"<key>=<parser>,<key>=<parser>,…"
		
		Supported parsers:
		* php: deserialize PHP object.
		* yaml: parse as YAML.
		* json: parse as JSON.
		* html: parse as HTML.

	--serialize=<rules>
		
		Instructions to serialize some fields, specified as:
		"<key>=<serializer>,<key>=<serializer>,…"

		Supported serializers:
		* php: serialize as PHP object.
		* yaml: serialize as YAML.
		* json: serialize as JSON.
		* html: serialize as HTML.

	--exclude-fields=<fields>

		Exclude certain fields from the output, specified as a 
		comma-separated list of fields.

	--include-fields=<fields>

		Only include certain fields from the output, specified as a 
		comma-separated list of fields. 

		When '--include-fields' is specified, the '--exclude-fields' 
		option is ignored.

	--exclude-types=<types>

		Exclude certain post types from the output, specified as a 
		comma-separated list of post types.

	--include-types=<types>
		Only include certain post types from the output, specified as a
		comma-separated list of post types.

		When '--include-types' is specified, the '--exclude-types'
		option is ignored.

Keys extracted from the XML:

	Top-level:

		title, link, pubDate, creator, guid, guid_isPermaLink,
		description, content, excerpt, post_id, post_date, 
		post_date_gmt, post_modified, post_modified_gmt, 
		comment_status, ping_status,  post_name, status, 
		post_parent, menu_order, post_type, post_password, is_sticky,
		attachment_url

	Post metadata:

		Fields from '<wp:postmeta>' are included in the output 
		with the 'postmeta*' prefix.

Keys generated from scratch:

	uuid — sixteen random alphanumeric characters.
	template: 'attachment' — added to attachments only.
`);
}