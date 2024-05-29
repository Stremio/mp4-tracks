module.exports = function streamToBuffer(readableStream) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    readableStream.on('data', function(data) {
      if (typeof data === 'string') {
        // Convert string to Buffer assuming UTF-8 encoding
        chunks.push(Buffer.from(data, 'utf-8'));
      } else if (data instanceof Buffer) {
        chunks.push(data);
      } else {
        // Convert other data types to JSON and then to a Buffer
        var jsonData = JSON.stringify(data);
        chunks.push(Buffer.from(jsonData, 'utf-8'));
      }
    });
    readableStream.on('end', function() {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}
