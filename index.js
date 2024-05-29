const MP4Box = require('mp4box');
const streamToBuffer = require('./streamToBuffer')
const urlToFileMedia = require('./urlToFileMedia')

const url = 'https://berlin-ak.ftp.media.ccc.de/congress/2019/h264-hd/36c3-11235-eng-deu-fra-36C3_Infrastructure_Review_hd.mp4'

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

async function init() {
  const mp4boxFile = MP4Box.createFile();

  mp4boxFile.onError = function(err) {
    stopped = true;
    console.error(err);
  }

  var stopped = false;

  //When the data is ready, look for the right track
  mp4boxFile.onReady = function(videoData) {
    console.log('onready', videoData);
    stopped = true
  };

  let chunkSize = 256 * 1024
  let offset = 0
  let start = 0
  let end = chunkSize

  var fileMedia = await urlToFileMedia(url)

  async function Mp4FindMoov() {
    let headerOffset = 0
    const headerChunkSize = 1024 * 1024
    for (let k = 0 ;k < headerChunkSize * 5; k++) {
      if (stopped) {
        return { error: true }
      }
      const fileStream = await fileMedia.createReadStream({ start: headerOffset, end: headerOffset + headerChunkSize })
      const buffer = await streamToBuffer(fileStream)

      const arrayBuffer = toArrayBuffer(buffer)
      arrayBuffer.fileStart = offset

      start = offset = mp4boxFile.appendBuffer(arrayBuffer)

      let result =  buffer.indexOf('moov')
      if (result > 0) {
        return {
          offset: headerOffset + result - 4,
          size: buffer.readUInt32BE(result-4),
        }
      } else {
        return { error: true }
      }

      headerOffset += headerChunkSize
    }
  }

  var moov = await Mp4FindMoov(fileMedia)

  if (!moov.error) {
    end = moov.offset + moov.size
  } else {
    end = start + chunkSize
  }

  async function loopStream() {
    if (stopped) return;

    const stream = await fileMedia.createReadStream({ start, end })

    const chunk = await streamToBuffer(stream)

    const arrayBuffer = toArrayBuffer(chunk)

    arrayBuffer.fileStart = offset;

    start = offset = mp4boxFile.appendBuffer(arrayBuffer);

    end = offset + chunkSize

    loopStream()
  }

  loopStream()
}

init()
