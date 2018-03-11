const entries = {};
const plugin = {
    init: async function() {
        return;
    },
    getData: async function({ key }) {
        return entries[key];
    },
    setData: async function({ entry, key }) {
        entries[key] = entry;
    }
}

export default plugin;
