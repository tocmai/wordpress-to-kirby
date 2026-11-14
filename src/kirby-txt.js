import { load, dump } from 'js-yaml';

// Based on: https://github.com/getkirby/kirby/blob/main/src/Data/Txt.php

// https://danburzo.ro/snippets/slugify/
function slugify(str = '') {
	return str
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^\-)|(\-$)/g, '');
}

function cap(str = '') {
	return str[0].toUpperCase() + str.slice(1);
}

export function parse(str = '') {
	const data = {};
	str.split(/\n----\s*\n*/).forEach(field => {
		let [_, key, value] = field.match(/\s*([^:]+?)\s*:([^:]*)/) ?? [];
		if (!key) {
			return;
		}
		data[key
			.toLowerCase()
			.replace(/[ -]/g, '_')
		] = value.trim().replace(/(\n|^)\\\\----/, '----');
	});
	return data;
}

export function serialize(data = {}) {
	return Object.entries(data)
		.filter(entry => entry[0] && entry[1])
		.map(entry => {
			const value = (Array.isArray(entry[1]) ? dump(entry[1]) : entry[1] + '')
				.replace(/(?:\n|^)----/g, '\\----')
				.trim();
			const key = cap(slugify(entry[0]));
			return key + (value.indexOf('\n') > -1 ? ':\n\n' : ': ') + value;
		})
		.join("\n\n----\n\n");
}