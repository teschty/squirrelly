var exports = module.exports = {
    defaultFilters: { // All strings are automatically passed through the "d" filter (stands for default, but is shortened to save space)
        //, and then each of the default filters the user
        // Has set to true. This opens up a realm of possibilities like autoEscape, etc.
        // List of shortened letters: d: default, e: escape, u: unescape. Escape and Unescape are also valid filter names
        e: false // Escape is turned off by default for performance
    },

    autoEscape: function (bool) {
        if (bool) {
            exports.defaultFilters.e = true
        } else {
            exports.defaultFilters.e = false
        }
    },
    escMap: {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;"
    },
}