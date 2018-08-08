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