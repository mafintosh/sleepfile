const sleepfile = require('./')
const raf = require('random-access-file')

const valueEncoding = {
  encodingLength () {
    return 40
  },

  encode (node, buf, offset) {
    if (!buf) buf = Buffer.alloc(40)
    if (!offset) offset = 0
    buf.writeUInt32BE(node.size, offset)
    node.hash.copy(buf, offset + 8)
    return buf
  },

  decode (buf, offset) {
    console.log(buf, offset)
    return {
      size: buf.readUInt32BE(offset),
      hash: buf.slice(offset + 8, offset + 40)
    }
  }
}

const sf = sleepfile(raf('./tree'), {
  valueEncoding
})

const batch = new Array(10000)

for (let i = 0; i < batch.length; i++) {
  const { randomBytes } = require('crypto')
  batch[i] = { hash: randomBytes(32), size: 10 + i }
}

if (process.argv[2] === 'loop') runLoop()
else runBatch()

function runLoop () {
  console.time('put loop')

  let missing = batch.length

  for (let i = 0; i < batch.length; i++) {
    sf.put(i, batch[i], done)
  }

  function done () {
    if (--missing) return
    console.timeEnd('put loop')
  }
}

function runBatch () {
  console.time('put batch')
  sf.putBatch(0, batch, function () {
    console.timeEnd('put batch')
  })
}
