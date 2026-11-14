/* generate random UUIDs */
import { randomBytes } from 'node:crypto';

export function uuid(len = 16) {
	let res = '';
	while (res.length < len) {
		res += randomBytes(len)
			.toString('base64')
			.replace(/[^a-z0-9]/gi, '');
	}
	return res.slice(0, len);
}