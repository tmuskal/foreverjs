const entries = {};


function roughSizeOfObject(object, thresh) {
    function literalSize(value) {
        const theType = typeof value;
        if (theType === 'boolean') {
            return 4;
        }
        else if (theType === 'string') {
            return value.length * 2;
        }
        else if (theType === 'number') {
            return 8;
        }
    }
    var objectList = [];
    var stack = [object];
    var bytes = 0;
    while (stack.length) {
        var value = stack.pop();
        if (typeof value === 'object' && objectList.indexOf(value) === -1) {
            objectList.push(value);
            for (var i in value) {
                // key
                bytes = bytes + i.toString().length;
                stack.push(value[i]);
            }
        }
        else {
            bytes += literalSize(value);
        }
        if (bytes >= thresh) {
            return bytes;
        }
    }
    return bytes;
}
let keyNum = 0;
const plugin = {
    init: async function() {
        return;
    },
    getData: async function({ key }) {
        const res = entries[key];
        // console.log("key", key, res);
        return res;
    },
    setData: async function({ entry }) {
        const thresh = process.env.BLOB_MIN_SIZE || 100;
        if (roughSizeOfObject(entry, thresh) >= thresh) {
            const key = 'key' + keyNum++;
            entries[key] = entry;
            return { _blobKey: key };
        }
        else
            return entry;
    }
}

export default plugin;
