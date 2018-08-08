var defaultFilters = require('./utils.js').defaultFilters
var exports = module.exports = function (initialString, filterString) {
    var filtersArray;
    if (typeof filterString !== 'undefined' && filterString !== null) {
        filtersArray = filterString.split('|')
        for (var i = 0; i < filtersArray.length; i++) {
            filtersArray[i] = filtersArray[i].trim()
            if (filtersArray[i] === "") continue
            if (filtersArray[i] === "unescape" || filtersArray[i] === "u") continue
            if (defaultFilters.e && (filtersArray[i] === "e" || filtersArray[i] === "escape")) continue
            initialString = 'Sqrl.F.' + filtersArray[i] + '(' + initialString + ')'
        }
    }
    for (key in defaultFilters) {
        if (defaultFilters[key] === true) {
            //There's gotta be a more efficient way to do this
            if (typeof filtersArray !== 'undefined' && (filtersArray.includes("u") || filtersArray.includes("unescape")) && (key === "e" || key === "escape")) continue;
            initialString = 'Sqrl.F.' + key + '(' + initialString + ')'
        }
    }
    return initialString
}