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