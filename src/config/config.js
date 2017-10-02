export default {
	get: (key) => {
		const res = process.env[key];
		return res;
	}
}