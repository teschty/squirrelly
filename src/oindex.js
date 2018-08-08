var Sqrl = {} // For all of the functions
Sqrl.Utils = {} // For user-accessible ones
Sqrl.Compiler = {} // For RegExp's, etc.
Sqrl.Helpers = require('./helpers.js')
Sqrl.H = Sqrl.Helpers
/* These two are technically just helpers, but in Squirrelly they're 1st-class citizens. */
Sqrl.Partials = {} // For partials
Sqrl.P = Sqrl.Partials
Sqrl.Layouts = {} // For layouts
Sqrl.registerLayout = function (name, callback) {

}
Sqrl.registerHelper = function (name, callback) {
    Sqrl.Helpers[name] = callback
    Sqrl.H = Sqrl.Helpers
}
Sqrl.Str = function (thing) { /* To make it more safe...I'll probably have people opt in for performance though */
    if (typeof thing === 'string') {
        return thing
    } else if (typeof thing === 'object') {
        return JSON.stringify(thing)
    } else {
        return thing.toString()
    }
}

Sqrl.Render = function (template, options) {
    return template(options, Sqrl)
}

Sqrl.defaultFilters = { // All strings are automatically passed through the "d" filter (stands for default, but is shortened to save space)
    //, and then each of the default filters the user
    // Has set to true. This opens up a realm of possibilities like autoEscape, etc.
    // List of shortened letters: d: default, e: escape, u: unescape. Escape and Unescape are also valid filter names
    e: false // Escape is turned off by default for performance
}

Sqrl.autoEscape = function (bool) {
    if (bool) {
        Sqrl.defaultFilters.e = true
    } else {
        Sqrl.defaultFilters.e = false
    }
}
Sqrl.escMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;"
}
Sqrl.F = { //F stands for filters
    d: function (str) {
        return str
    },
    e: function (str) {
        //To deal with XSS. Based on Escape implementations of Mustache.JS and Marko, then customized.
        function replaceChar(s) {
            return Sqrl.escMap[s]
        }
        var newStr = String(str)
        var result = /[&<>"'`=\/]/.test(newStr) ? newStr.replace(/[&<>"'`=\/]/g, replaceChar) : newStr
        return result
    }
    //Don't need a filter for unescape because that's just a flag telling Squirrelly not to escape
}

Sqrl.F.escape = Sqrl.F.e
Sqrl.Filters = Sqrl.F

Sqrl.registerFilter = function (name, callback) {
    Sqrl.F[name] = callback
    Sqrl.Filters = Sqrl.F
}

Sqrl.builtInHelpers = {
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

Sqrl.Precompile = function (str) {
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
            regex.lastIndex++;
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
            return parseFiltered('options.' + refName, filters)
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
            return parseFiltered("hvals" + prefix + "." + name)
        }

        function parseFiltered(initialString, filterString) {
            var filtersArray;
            if (typeof filterString !== 'undefined' && filterString !== null) {
                filtersArray = filterString.split('|')
                for (var i = 0; i < filtersArray.length; i++) {
                    filtersArray[i] = filtersArray[i].trim()
                    if (filtersArray[i] === "") continue
                    if (filtersArray[i] === "unescape" || filtersArray[i] === "u") continue
                    if (Sqrl.defaultFilters.e && (filtersArray[i] === "e" || filtersArray[i] === "escape")) continue
                    initialString = 'Sqrl.F.' + filtersArray[i] + '(' + initialString + ')'
                }
            }
            for (key in Sqrl.defaultFilters) {
                if (Sqrl.defaultFilters[key] === true) {
                    //There's gotta be a more efficient way to do this
                    if (typeof filtersArray !== 'undefined' && (filtersArray.includes("u") || filtersArray.includes("unescape")) && (key === "e" || key === "escape")) continue;
                    initialString = 'Sqrl.F.' + key + '(' + initialString + ')'
                }
            }
            return initialString
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

if (typeof fs !== 'undefined' && fs !== null) {
    Sqrl.__express = function (filePath, options, callback) {
        fs.readFile(filePath, function (err, content) {
            if (err) {
                return callback(err)
            }
            var sqrlString = content.toString()
            var template = Sqrl.Precompile(sqrlString)
            var renderedFile = Sqrl.Render(template, options)
            return callback(null, renderedFile)
        })
    }
}

var exports = module.exports = Sqrl