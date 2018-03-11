const entries = {};

function initializeUtil(name, pluginName) {
    function loadPlugin(pluginName) {
        if (!pluginName)
            return null;
        try {
            
            const module = require(`../plugins/${name}/${pluginName}`);
            console.log(`loaded ../plugins/${name}/${pluginName}`);
            return module.default;
        }
        catch (e) {
            return null;
        }
    }

    function getUtil() {
        const upName = name.toUpperCase();
        return process.env[`ENABLE_${upName}`] ?
            loadPlugin(pluginName || process.env[`${upName}_PLUGIN`]) || loadPlugin('default') || loadPlugin('disabled') || { init: () => {} }:
            loadPlugin('disabled') || { init: () => {} };
    }
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
