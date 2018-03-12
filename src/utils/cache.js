const { initializeUtil } = require('./pluggableUtils').default
const cache = initializeUtil('cache');
const murmur128 = require('murmur-128');
export default {
    getOrInvoke: async({ key, fn }) => {
        key = JSON.stringify(key);
        key = murmur128(key).toString('base64');
        let res = await cache.getData({ key })
        if (res) {
            return res;
        }
        res = await fn();
        if (res) {
            cache.setData({ entry: res, key });
        }
        return res;
    }
}
