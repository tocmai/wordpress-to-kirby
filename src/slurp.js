export default async function slurp(stream) {
	// Switch to text mode, default is binary
	stream.setEncoding('utf8');
	return (await Array.fromAsync(stream)).join('');
}