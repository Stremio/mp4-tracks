const MP4Box = require('mp4box')
const streamToBuffer = require('./streamToBuffer')
const urlToFileMedia = require('./urlToFileMedia')
const toArrayBuffer = require('./toArrayBuffer')

const defaults = {
  url: 'https://berlin-ak.ftp.media.ccc.de/congress/2019/h264-hd/36c3-11235-eng-deu-fra-36C3_Infrastructure_Review_hd.mp4',
  chunkSize: 1 * 1024 * 1024
}

async function init(opts = {}) {
  const url = opts.url || defaults.url
  const chunkSize = opts.chunkSize || defaults.chunkSize

  const mp4boxFile = MP4Box.createFile()

  let stopped = false

  mp4boxFile.onError = function(err) {
    stopped = true
    console.error(err)
  }

  mp4boxFile.onReady = function(videoData) {
    stopped = true
    console.log('onready', videoData)
  }

  let offset = 0
  let start = 0
  let end = chunkSize

  const fileMedia = await urlToFileMedia(url)

  async function findMoov() {
    let hOffset = 0
    for (let k = 0; k < 5; k++) {
      if (stopped)
        return { error: true }

      if (hOffset + chunkSize > fileMedia.length)
        return { error: true }

      const fileStream = await fileMedia.createReadStream({ start: hOffset, end: hOffset + chunkSize })
      const buffer = await streamToBuffer(fileStream)
      const arrayBuffer = toArrayBuffer(buffer, offset)

      start = offset = mp4boxFile.appendBuffer(arrayBuffer)

      let result =  buffer.indexOf('moov')
      if (result > 0) {
        return {
          offset: hOffset + result - 4,
          size: buffer.readUInt32BE(result - 4),
        }
      } else if (start > 5 * chunkSize) {
        // moov is at end of file
        return { error: true }
      }

      hOffset += chunkSize
    }
    return { error: true }
  }

  const moov = await findMoov(fileMedia)

  end = !moov.error ? moov.offset + moov.size : start + chunkSize

  async function loopStream() {
    if (stopped) return

    const stream = await fileMedia.createReadStream({ start, end })
    const buffer = await streamToBuffer(stream)
    const arrayBuffer = toArrayBuffer(buffer, offset)

    start = offset = mp4boxFile.appendBuffer(arrayBuffer)
    end = offset + chunkSize

//    if (end > fileMedia.length) {
//      console.error(Error('Reached end of file'))
//      return
//    }

    loopStream()
  }

  loopStream()
}

if (require.main === module) {
  init()
} else {
  module.exports = init
}
