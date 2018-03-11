const entries = {};

function initializeUtil(name, pluginName) {
    function loadPlugin(pluginName) {
        if (!pluginName)
            return null;
        try {
            console.log("loading", name, pluginName);
            const module = require(`../plugins/${name}/${pluginName}`);
            console.log("loaded", name, pluginName, module);
            return module.default;
        }
        catch (e) {
            return null;
        }
    }

    function getUtil() {
        const upName = name.toUpperCase();
        const disabledPlugin = loadPlugin('disabled') || { init: () => {} };
        return process.env[`ENABLE_${upName}`] ?
            loadPlugin(pluginName || process.env[`${upName}_PLUGIN`]) || loadPlugin('default') || disabledPlugin :
            disabledPlugin;
    }
    console.log(pluginName, plugin);
    const plugin = getUtil();
    plugin.init();
    return plugin;
}

export default {
    Cache: initializeUtil('cache'),
    Blob: initializeUtil('blob'),
    Logger: initializeUtil('logger'),
    initializeUtil
};
