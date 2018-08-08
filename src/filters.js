var Utils = require('./utils.js')
var exports = module.exports = { //F stands for filters
    d: function (str) {
        return str
    },
    e: function (str) {
        //To deal with XSS. Based on Escape implementations of Mustache.JS and Marko, then customized.
        function replaceChar(s) {
            return Utils.escMap[s]
        }
        var newStr = String(str)
        var result = /[&<>"'`=\/]/.test(newStr) ? newStr.replace(/[&<>"'`=\/]/g, replaceChar) : newStr
        return result
    }
    //Don't need a filter for unescape because that's just a flag telling Squirrelly not to escape
}
exports.escape = exports.e