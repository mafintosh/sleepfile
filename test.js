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

tape('head', function (assert) {
  const file = new Sleep(ram())

  file.head(function (err, head) {
    assert.error(err, 'no error')
    assert.same(head, null)
    file.put(42, Buffer.alloc(42), function (err) {
      assert.error(err, 'no error')
      file.head(function (err, head) {
        assert.error(err, 'no error')
        assert.same(head, Buffer.alloc(42))
        assert.end()
      })
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

tape('overwrite file', function (assert) {
  const data = ram()
  const file = new Sleep(data)

  file.put(0, Buffer.from('block'), function (err) {
    assert.error(err, 'no error')
    const newFile = new Sleep(data, { overwrite: true })
    newFile.get(0, function (_, data) {
      assert.notOk(data, 'data is gone')
      assert.end()
    })
  })
})

tape('clear', function (assert) {
  const file = new Sleep(ram(), { name: 'name' })

  file.put(42, Buffer.alloc(42).fill(1), function (err) {
    assert.error(err, 'no error')
    file.clear(function () {
      file.stat(function (err, st) {
        assert.error(err, 'no error')
        assert.same(st.name, 'name')
        assert.same(st.length, 0)
        assert.end()
      })
    })
  })
})
