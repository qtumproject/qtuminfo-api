function transformSQLArg(arg) {
  if (typeof arg === 'string') {
    return `'${arg}'`
  } else if (['number', 'bigint'].includes(typeof arg)) {
    return arg.toString()
  } else if (Buffer.isBuffer(arg)) {
    return `0x${arg.toString('hex')}`
  } else if (Array.isArray(arg)) {
    if (arg.length === 0) {
      return '(NULL)'
    } else if (typeof arg[0] === 'string') {
      return `(${arg.map(x => `'${x}'`).join(', ')})`
    } else if (['number', 'bigint'].includes(typeof arg[0])) {
      return `(${arg.map(x => x.toString()).join(', ')})`
    } else if (Buffer.isBuffer(arg[0])) {
      return `(${arg.map(x => `0x${x.toString('hex')}`).join(', ')})`
    }
    return `(${arg.join(', ')})`
  } else if (arg && 'raw' in arg) {
    return arg.raw
  }
  return arg.toString()
}

exports.sql = function(strings, ...args) {
  let buffer = []
  for (let i = 0; i < args.length; ++i) {
    buffer.push(strings[i].replace(/\s+/g, ' '), transformSQLArg(args[i]))
  }
  buffer.push(strings[args.length].replace(/\s+/g, ' '))
  return buffer.join('')
}

exports.sqlRaw = function(strings, ...args) {
  let buffer = []
  for (let i = 0; i < args.length; ++i) {
    buffer.push(strings[i].replace(/\s+/g, ' '), args[i].toString())
  }
  buffer.push(strings[args.length].replace(/\s+/g, ' '))
  return buffer.join('')
}
