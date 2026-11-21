import { relative, isAbsolute, sep } from 'node:path';
// See: https://github.com/sindresorhus/is-path-inside
export default function inside(dir, file) {
  const rel = relative(dir, file);
  return rel && rel.split(sep).shift() !== '..' && !isAbsolute(rel);
}