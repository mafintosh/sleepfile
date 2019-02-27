const tape = require('tape')
const ram = require('random-access-memory')
const Sleep = require('./')

tape('basic', function (assert) {
  const file = new Sleep(ram())

  file.put(42, Buffer.alloc(42), function (err) {
    assert.error(err, 'no error')
    file.get(42, function (err, buf) {
      assert.error(err, 'no error')
      assert.same(buf, Buffer.alloc(42))
      assert.end()
    })
  })
})

tape('basic overwrite', function (assert) {
  const file = new Sleep(ram())

  file.put(42, Buffer.alloc(42), function (err) {
    assert.error(err, 'no error')
    const expected = Buffer.concat([ Buffer.from('hi'), Buffer.alloc(40) ])
    file.put(42, expected, function (err) {
      assert.error(err, 'no error')
      file.get(42, function (err, buf) {
        assert.error(err, 'no error')
        assert.same(buf, expected)
        assert.end()
      })
    })
  })
})

tape('batch', function (assert) {
  const file = new Sleep(ram())
  const expected = Buffer.concat([ Buffer.from('hi'), Buffer.alloc(40) ])

  const batch = [
    expected,
    expected,
    expected,
    expected,
    expected
  ]

  file.putBatch(42, batch, function (err) {
    assert.error(err, 'no error')
    file.getBatch(42, batch.length, function (err, b) {
      assert.error(err, 'no error')
      assert.same(b, batch)
      assert.end()
    })
  })
})

tape('set metadata', function (assert) {
  const file = new Sleep(ram(), {
    name: 'a name',
    valueSize: 42,
    magicBytes: 0x12345678
  })

  file.put(0, Buffer.alloc(42), function () {
    file.stat(function (err, st) {
      assert.error(err, 'no error')
      assert.same(st, {
        length: 1,
        density: 1,
        magicBytes: 0x12345678,
        valueSize: 42,
        name: 'a name',
        version: 0
      })
      assert.end()
    })
  })
})
