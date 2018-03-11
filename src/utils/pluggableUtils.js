const entries = {};

function initializeUtil(name, pluginName) {
    function loadPlugin(pluginName) {
        if (!pluginName)
            return null;
        try {
            const module = require(`../plugins/${name}/${pluginName}`);
            return module.default;
        }
        catch (e) {
            return null;
        }
    }

    function getUtil() {
        const disabledPlugin = loadPlugin('disabled') || { init: {} };
        return process.env[`ENABLE_${name.toUpperCase()}`] ?
            loadPlugin(pluginName || process.env[`${name}_PLUGIN`]) || loadPlugin('default') || disabledPlugin :
            disabledPlugin;
    }
    const plugin = getUtil();
    console.log(plugin);
    plugin.init();
    return plugin;
}

export default {
    Cache: initializeUtil('cache'),
    Blob: initializeUtil('blob'),
    Logger: initializeUtil('logger'),
    initializeUtil
};
