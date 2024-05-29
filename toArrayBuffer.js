module.exports = function toArrayBuffer(buf, offset) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  if (offset !== undefined) {
    ab.fileStart = offset
  }
  return ab;
}
