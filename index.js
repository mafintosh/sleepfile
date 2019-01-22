const Nanoresource = require('nanoresource')

module.exports = (storage, opts) => new SleepFile(storage, opts)

class SleepFile extends Nanoresource {
  constructor (storage, opts) {
    if (!opts) opts = {}

    super()

    this.storage = storage
    this.valueEncoding = opts.valueEncoding
    this.valueSize = opts.valueSize || 0
    this.magicBytes = opts.magicBytes || 0x00000000
    this.name = opts.name || ''
    this.writable = false
    this.readable = false
  }

  _open (cb) {
    const self = this

    this.storage.open(function (err) {
      if (err && err.code === 'ENOENT') return done(null)
      if (err) return done(err)
      self.storage.read(0, 32, onheader)
    })

    function onheader (_, buf) {
      if (!buf) return done(null)
      self.writable = true

      const magicBytes = buf.readUInt32BE(0)
      if (self.magicBytes && self.magicBytes !== magicBytes) return cb(new Error('Magic bytes mismatch'))
      self.magicBytes = magicBytes

      if (buf[4] !== 0) return cb(new Error('Only version 0 is supported. Please upgrade the sleepfile module'))

      const valueSize = buf.readUInt16BE(5)
      if (self.valueSize && self.valueSize !== valueSize) return cb(new Error('Value size mismatch'))
      self.valueSize = valueSize

      const nameLen = buf[7]
      const name = buf.toString('ascii', 8, 8 + nameLen)
      if (self.name && name !== self.name) return cb(new Error('Name mismatch'))
      self.name = name

      done(null)
    }

    function done (err) {
      if (err) return cb(err)
      self.readable = true
      cb(null)
    }
  }

  stat (cb) {
    const self = this

    this.open(function (err) {
      if (err) return cb(err)

      self.storage.stat(function (err, st) {
        if (err) return cb(err)

        cb(null, {
          magicBytes: self.magicBytes,
          version: 0,
          valueSize: self.valueSize,
          name: self.name,
          length: Math.floor((st.size - 32) / self.valueSize),
          density: st.blocks ? (st.blocks / 8) / Math.ceil(st.size / 4096) : 1
        })
      })
    })
  }

  get (index, cb) {
    if (!this.readable) return openAndGet(this, index, cb)
    if (!this.active(cb)) return

    this.storage.read(32 + index * this.valueSize, this.valueSize, this._decode.bind(this, cb))
  }

  _decode (cb, err, buf) {
    if (err) return cb(err)

    const value = this.valueEncoding ? this.valueEncoding.decode(buf, 0) : buf

    this.inactive(cb, null, value)
  }

  getBatch (offset, len, cb) {
    if (!this.readable) return openAndGetBatch(this, offset, len, cb)
    if (!this.active(cb)) return

    this.storage.read(32 + offset * this.valueSize, len * this.valueSize, this._decodeBatch.bind(this, cb))
  }

  _decodeBatch (cb, err, buf) {
    if (err) return cb(err)

    const arr = new Array(buf.length / this.valueSize)

    for (let i = 0; i < arr.length; i++) {
      const offset = i * this.valueSize
      const end = i * this.valueSize + this.valueSize
      arr[i] = this.valueEncoding ? this.valueEncodig.decode(buf, offset, end) : buf.slice(offset, end)
    }

    this.inactive(cb, null, arr)
  }

  put (index, value, cb) {
    if (!cb) cb = noop
    if (!this.writable) return openAndPut(this, index, value, cb)
    if (!this.active(cb)) return

    const buf = this.valueEncoding ? this.valueEncoding.encode(value) : value

    this.storage.write(32 + index * this.valueSize, buf, this.inactive.bind(this, cb))
  }

  putBatch (offset, arr, cb) {
    if (!cb) cb = noop
    if (!this.writable) return openAndPutBatch(this, offset, arr, cb)
    if (!this.active(cb)) return

    const buf = Buffer.alloc(arr.length * this.valueSize)

    for (let i = 0; i < arr.length; i++) {
      if (!arr[i]) continue
      const offset = i * this.valueSize
      if (this.valueEncoding) this.valueEncoding.encode(arr[i], buf, offset)
      else arr[i].copy(buf, offset)
    }

    this.storage.write(32 + offset * this.valueSize, buf, this.inactive.bind(this, cb))
  }

  destroy (cb) {
    this.storage.destroy(cb)
  }
}

function noop () {}

function writeHeader (self, cb) {
  if (!self.active(cb)) return

  const header = Buffer.alloc(32)

  header.writeUInt32BE(self.magicBytes, 0)
  header[4] = 0 // version
  header.writeUInt16BE(self.valueSize, 5)

  if (self.name) {
    header[7] = self.name.length
    header.write(self.name, 8)
  }

  self.storage.write(0, header, function (err) {
    if (err) return self.inactive(cb, err)
    self.writable = true
    self.inactive(cb, err)
  })
}

function inferValueSize (self, value) {
  return self.valueEncoding ? self.valueEncoding.encodingLength(value) : value.length
}

function openAndPut (self, index, value, cb) {
  self.open(function (err) {
    if (err) return cb(err)
    if (self.writable) return self.put(index, value, cb)
    if (!self.valueSize) self.valueSize = inferValueSize(self, value)
    writeHeader(self, function (err) {
      if (err) return cb(err)
      self.put(index, value, cb)
    })
  })
}

function inferValueSizeBatch (self, batch) {
  for (let i = 0; i < batch.length; i++) {
    if (batch[i]) return inferValueSize(self, batch[i])
  }
  return 0
}

function openAndPutBatch (self, index, batch, cb) {
  self.open(function (err) {
    if (err) return cb(err)
    if (self.writable) return self.putBatch(index, batch, cb)
    if (!self.valueSize) self.valueSize = inferValueSizeBatch(self, batch)
    if (!self.valueSize) return cb(null, null) // empty batch
    writeHeader(self, function (err) {
      if (err) return cb(err)
      self.putBatch(index, batch, cb)
    })
  })
}

function openAndGet (self, index, cb) {
  self.open(function (err) {
    if (err) return cb(err)
    self.get(index, cb)
  })
}

function openAndGetBatch (self, index, len, cb) {
  self.open(function (err) {
    if (err) return cb(err)
    self.getBatch(index, len, cb)
  })
}
