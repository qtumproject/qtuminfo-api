const path = require('path')
const Redis = require('ioredis')

exports.keys = 'qtuminfo-api-mainnet'

exports.security = {
  csrf: {enable: false}
}

exports.middleware = ['cors', 'ratelimit']

exports.cors = {
  origins: ['*']
}

exports.ratelimit = {
  db: new Redis({
    host: 'localhost',
    port: 6379,
    db: 0
  }),
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total',
  },
  disableHeader: false,
  idPrefix: 'qtuminfo-api-mainnet-',
  errorMessage: 'Rate Limit Exceeded',
  duration: 10 * 60 * 1000,
  max: 10 * 60
}

exports.io = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  namespace: {
    '/': {connectionMiddleware: ['connection']}
  }
}

exports.sequelize = {
  Sequelize: require('sequelize'),
  dialect: 'mysql',
  database: 'qtum_mainnet',
  host: 'localhost',
  port: 3306,
  username: 'qtum',
  password: ''
}

exports.qtum = {
  chain: 'mainnet'
}

exports.qtuminfo = {
  path: path.resolve('..', 'qtuminfo'),
  port: 3001,
  rpc: {
    protocol: 'http',
    host: 'localhost',
    port: 3889,
    user: 'user',
    password: 'password'
  }
}
