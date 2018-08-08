(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Main = require('./index.js')
var exports = module.exports = function (filePath, options, callback) {
    fs.readFile(filePath, function (err, content) {
        if (err) {
            return callback(err)
        }
        var sqrlString = content.toString()
        var template = Main.Precompile(sqrlString)
        var renderedFile = Main.Render(template, options)
        return callback(null, renderedFile)
    })
}
},{"./index.js":4}],2:[function(require,module,exports){
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
},{"./utils.js":7}],3:[function(require,module,exports){
var exports = module.exports = {
    Date: function (args, content, blocks, options) {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd
        }
        if (mm < 10) {
            mm = '0' + mm
        }
        today = mm + '/' + dd + '/' + yyyy;
        return today
    },
    If: function (args, content, blocks, options) {
        if (args[0]) {
            return content()
        } else {
            if (blocks && blocks.else) {
                return blocks.else()
            }
        }
    }
}
},{}],4:[function(require,module,exports){
var exports = module.exports = {}
exports.Utils = require('./utils.js') // For user-accessible ones
exports.Compiler = {
    parseFiltered: require('./parseFiltered.js')
} // For RegExp's, etc.
exports.Helpers = require('./helpers.js')
exports.H = exports.Helpers
/* These two are technically just helpers, but in Squirrelly they're 1st-class citizens. */
exports.Partials = {} // For partials
exports.P = exports.Partials
exports.Layouts = {} // For layouts
exports.registerLayout = function (name, callback) {

}
exports.registerHelper = function (name, callback) {
    exports.Helpers[name] = callback
    exports.H = exports.Helpers
}

exports.Render = function (template, options) {
    return template(options, exports)
}

exports.F = require('./filters.js')

exports.Filters = exports.F

exports.registerFilter = function (name, callback) {
    exports.F[name] = callback
    exports.Filters = exports.F
}

exports.precompileHelpers = require('./precompileHelpers.js')
exports.Precompile = function (str) {
    var regEx = /{{ *?(?:(?:(?:(?:([a-zA-Z_$]+[\w]*? *?(?:[^\s\w\($]+[^\n]*?)*?))|(?:@(?:([\w$]+:|(?:\.\.\/)+))? *(.+?) *))(?: *?(\| *?[^\n]+ *?)*)*)|(?:([a-zA-Z_$]+[\w]*) *?\(([^\n]*)\) *?([A-Za-z$_]*[\w]*))|(?:\/ *?([a-zA-Z_$]+[\w]*))|(?:# *?([a-zA-Z_$]+[\w]*))|(?:([^]+?))) *?}}/g;
    var paramHRef = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[\\]@(?:[\w$]*:)?[\w$]+|@(?:([\w$]*):)?([\w$]+)/g
    var lastIndex = 0
    var funcStr = ""
    var helperArray = [];
    var helperNumber = -1;
    var helperAutoId = 0;
    var varName = "tmpltRes"
    var helperContainsBlocks = {};
    while ((m = regEx.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regEx.lastIndex) {
            regEx.lastIndex++;
        }
        if (helperNumber < 0) {
            varName = "tmpltRes"
        }
        if (funcStr === "") {
            funcStr += "var tmpltRes=\'" + str.slice(lastIndex, m.index).replace(/'/g, "\\'") + '\';'
        } else {
            if (lastIndex !== m.index) {
                funcStr += varName + '+=\'' + str.slice(lastIndex, m.index).replace(/'/g, "\\'") + '\';'
            }
        }
        lastIndex = m[0].length + m.index
        if (m[1]) {
            //It's a global ref. p4 = filters
            funcStr += varName + '+=' + globalRef(m[1], m[4]) + ';'
        } else if (m[3]) {
            //It's a helper ref. p2 = id (with ':' after it) or path, p4 = filters
            funcStr += varName + '+=' + helperRef(m[3], m[2], m[4]) + ';'
        } else if (m[5]) {
            //It's a helper oTag. p6 parameters, p7 id
            var id = m[7]
            if (id === "" || id === null) {
                id = helperAutoId;
                helperAutoId++;
            }
            helperNumber += 1;
            var helperTag = {
                name: m[5],
                id: id
            }
            var params = m[6] || ""
            if (paramHRef.test(params)) {
                params = '[' + params.replace(paramHRef, function (m, p1, p2) { // p1 scope, p2 string
                    if (typeof p2 === 'undefined') {
                        return m
                    } else {
                        if (typeof p1 === 'undefined') {
                            p1 = ''
                        }
                        return 'helpervals' + p1 + '.' + p2
                    }
                }) + ']'
            } else {
                params = '[' + params + ']'
            }
            helperArray[helperNumber] = helperTag;
            funcStr += varName + '+=Sqrl.H.' + m[5] + '(' + params + ',function(hvals){var hvals' + id + '=hvals;var blockRes="";'
            varName = 'blockRes'
        } else if (m[8]) {
            //It's a helper cTag.
            var mostRecentHelper = helperArray[helperNumber];
            if (mostRecentHelper && mostRecentHelper.name === m[8]) {
                helperNumber -= 1;
                if (helperContainsBlocks[mostRecentHelper.id]) {
                    funcStr += "return blockRes}});"
                } else {
                    funcStr += "return blockRes});"
                }
            }
        } else if (m[9]) {
            //It's a helper block.
            var parentId = helperArray[helperNumber].id
            //console.log("parentId: " + parentId)
            if (!helperContainsBlocks[parentId]) {
                funcStr += "return blockRes}, {" + m[9] + ":function(hvals){var hvals" + parentId + "=hvals;var blockRes=\'\';"
                helperContainsBlocks[parentId] = true
            } else {
                funcStr += "return blockRes}}," + m[9] + ":function(hvals){var hvals" + parentId + "=hvals;var blockRes=\'\';"
            }
        } else if (m[10]) {
            //It's a possible macro.
        } else {
            console.error("Err: Code 000")
        }
        //console.log("funcStr is now: " + funcStr)

        function globalRef(refName, filters) {
            return exports.Compiler.parseFiltered('options.' + refName, filters)
        }

        function helperRef(name, id, filters) {
            var prefix;
            if (typeof id !== 'undefined') {
                if (/(?:\.\.\/)+/g.test(id)) {
                    prefix = helperArray[helperNumber - (id.length / 3)].id
                    //console.log("prefix: " + prefix)
                } else {
                    prefix = id.slice(0, -1)
                    //console.log("prefix: " + prefix)
                }
            }
            return exports.Compiler.parseFiltered("hvals" + prefix + "." + name)
        }

    }
    if (str.length > regEx.lastIndex) {
        funcStr += 'tmpltRes+=\'' + str.slice(lastIndex, str.length).replace(/'/g, "\\'") + '\';'
    }
    funcStr += 'return tmpltRes'
    //console.log("funcString is: " + funcStr)
    //console.log("funcStr is now: " + funcStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r'))
    var func = new Function('options', 'Sqrl', funcStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r'))
    return func
}

exports.__express = require('./express.js')
},{"./express.js":1,"./filters.js":2,"./helpers.js":3,"./parseFiltered.js":5,"./precompileHelpers.js":6,"./utils.js":7}],5:[function(require,module,exports){
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
},{"./utils.js":7}],6:[function(require,module,exports){
var exports = module.exports = {
    if: function (param, blocks, varName, regexps, ofilters, cfilters) { // Opening closing filters, like "Sqrl.F.e(Sqrl.F.d(" and "))"
        var returnFunc = 'if (typeof helpervals === \'undefined\') helpervals = {}; if(' + param + '){' + varName + '+=' + blocks.default+'(helpervals)}'
        if (blocks.hasOwnProperty('else')) {
            returnFunc += 'else { ' + varName + '+=' + blocks.else + '(helpervals)}'
        }
        return returnFunc
    },
    each: function (param, blocks, varName, regexps, ofilters, cfilters) {
        var returnFunc = 'for (var i = 0; i < ' + param + '.length ;i++) {' +
            varName + '+=' + blocks.default+'({this: ' + param + '[i], index: i})}'
        return returnFunc
    },
    foreach: function (param, blocks, varName, regexps, ofilters, cfilters) {
        var returnFunc = 'for (var key in ' + param + ') {if (!' + param + '.hasOwnProperty(key)) continue;' +
            varName + '+=' + blocks.default+'({this: ' + param + '[key], key: key})}'
        return returnFunc
    },
    log: function (param, blocks, varName, regexps, ofilters, cfilters) {
        var returnFunc = 'console.log(' + param + ');'
        return returnFunc
    }
}
},{}],7:[function(require,module,exports){
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
},{}]},{},[4]);
