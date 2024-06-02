var request = require('request')
var getContentLength = require('./getContentLength')

var totalData = 0

var urlToFileMedia = function(url, contentLength, debug) {
	return new Promise(function(resolve, reject) {
		getContentLength(url, contentLength).then(function(contentLength) {
			var file = {
				length: parseInt(contentLength),
				createReadStream: function(range) {
					var opts = { url, followRedirect: true, maxRedirects: 5, strictSSL: false }
					if (Object.values(range).length) {
						if (debug) console.log(range)
						totalData += range.end - range.start
						if (debug) console.log('total data', totalData)
						range.start = range.start || 0
						range.end = range.end || 0
						if (range.end > contentLength -1 || range.end === 0)
							range.end = ''
						opts.headers = { range: `bytes=${range.start}-${range.end}` }
			  		}
			  		return request(opts)
			  	},
			  }
			resolve(file)
		})
    })
}

module.exports = urlToFileMedia
