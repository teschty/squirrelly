const ClosureCompiler = require('google-closure-compiler-js').webpack;
var path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'squirrelly.js',
        library: 'Sqrl',
        libraryTarget: 'umd'
    },
    mode: 'none',
    plugins: [
        new ClosureCompiler({
            options: {
                languageIn: 'ECMASCRIPT6',
                languageOut: 'ECMASCRIPT5',
                compilationLevel: 'SIMPLE'
            },
        })
    ]
}