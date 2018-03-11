let entries = {};
const plugin = {
    init: async function() {
        return this.clear();
    },
    getData: async function({ key }) {
        return entries[key];
    },
    clear: async function() {
        entries = {};
    },
    setData: async function({ entry, key }) {
        // console.log("journal:",id,entry);
        entries[key] = entry;
    }
}

export default plugin;
