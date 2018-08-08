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