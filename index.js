const MP4Box = require('mp4box')
const streamToBuffer = require('./streamToBuffer')
const urlToFileMedia = require('./urlToFileMedia')
const toArrayBuffer = require('./toArrayBuffer')

const defaults = {
  url: 'https://berlin-ak.ftp.media.ccc.de/congress/2019/h264-hd/36c3-11235-eng-deu-fra-36C3_Infrastructure_Review_hd.mp4',
  chunkSize: 1 * 1024 * 1024,
  bytesLimit: 20 * 1024 * 1024,
}

async function init(opts = {}) {
  const url = opts.url || defaults.url
  const chunkSize = opts.chunkSize || defaults.chunkSize
  let bytesLimit = opts.bytesLimit || defaults.bytesLimit

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

  async function findMoov(startFrom) {
    let hOffset = startFrom || 0
    for (let k = 0; k < 5; k++) {
      if (stopped)
        return { error: true }

      let hEnd = Math.min(hOffset + chunkSize, fileMedia.length)

      if (hEnd > bytesLimit)
        return { error: true }

      const fileStream = await fileMedia.createReadStream({ start: hOffset, end: hEnd })
      const buffer = await streamToBuffer(fileStream)
      const arrayBuffer = toArrayBuffer(buffer, offset)

      start = offset = mp4boxFile.appendBuffer(arrayBuffer)

      if (hEnd === fileMedia.length)
        return { error: true }

      let result =  buffer.indexOf('moov')
      if (result > 0) {
        return {
          offset: hOffset + result - 4,
          size: buffer.readUInt32BE(result - 4),
        }
      } else if (!startFrom && start > 5 * chunkSize) {
        // moov is at end of file
        bytesLimit = start + bytesLimit - hEnd
        return findMoov(start)
      }

      hOffset += chunkSize
    }
    return { error: true }
  }

  const moov = await findMoov()

  end = !moov.error ? moov.offset + moov.size : start + chunkSize

  async function loopStream() {
    if (stopped) return

    if (end > bytesLimit) {
      console.log('Reached bytes limit')
      return
    }

    const stream = await fileMedia.createReadStream({ start, end })
    const buffer = await streamToBuffer(stream)
    const arrayBuffer = toArrayBuffer(buffer, offset)

    start = offset = mp4boxFile.appendBuffer(arrayBuffer)

    if (end !== fileMedia.length) {
      end = Math.min(offset + chunkSize, fileMedia.length)
    } else {
      console.log('Reached end of file')
      return
    }

    loopStream()
  }

  if (start < fileMedia.length)
    loopStream()
}

if (require.main === module) {
  init()
} else {
  module.exports = init
}
