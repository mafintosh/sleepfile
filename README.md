# sleepfile

[Sleep files](https://github.com/datprotocol/DEPs/blob/master/proposals/0009-sleep-headers.md) for Node.js

```
npm install sleepfile
```

## Usage

``` js
const Sleepfile = require('sleepfile')
const ram = require('random-access-memory')

const file = new Sleepfile(ram())

file.put(42, Buffer.alloc(42), function (err) {
  console.log('Inserted an entry at index 42')
  file.get(42, function (err, buf) {
    console.log('Read it out again')
  })
})
```

## API

#### `file = new Sleepfile(storage, [options])`

Create a new sleep file. Storage should be a [random-access-storage](https://github.com/random-access-storage/random-access-storage) instance.

Options include

```js
{
  magicBytes: 0x00000000, // set a magic bytes header of the file
  valueSize: 42, // explicitly set the valueSize (infered on first put otherwise)
  valueEncoding: encoding, // optionally set an abstract-encoding for the values
  name: 'algo', // optionally set the algorithm name in the header
  overwrite: false // reset the file content
}
```

#### `file.put(index, value, [callback])`

Insert a value at an index.

#### `file.putBatch(offset, values, [callback])`

Insert an array of values starting at offset.

#### `file.get(index, callback)`

Get the value at index.

#### `file.getBatch(offset, length, [callback])`

Get an array of values starting at offset.

#### `file.stat(callback)`

Get metadata about the sleepfile itself. Returned object looks like this:

```js
{
  magicBytes: 0x00000000, // the magic bytes stored
  version: 0, // sleep version
  valueSize: 42,
  name: 'algo name',
  length: 42, // how many values are there maximum
  density: 0.60 // how much of the underlying storage are actually in use
}
```

#### `file.head(callback)`

Get the value out with the highest index, i.e. `stat.length - 1`.
If the file is empty `null` is returned.

## License

MIT
