var request = require('request')

var getContentLength = function(url, contentLength) {
	if (contentLength)
		return Promise.resolve(contentLength)
	return new Promise(function(resolve, reject) {
		var req = request({ url, followRedirect: true, maxRedirects: 5, strictSSL: false })
		req.on('response', function(d) {
			req.abort()
			if (!d.headers['content-length'])
				reject('Could not retrieve content-length from ranged request')
			else
				resolve(d.headers['content-length'])
		}).on('error', reject)
	})
}

module.exports = getContentLength
