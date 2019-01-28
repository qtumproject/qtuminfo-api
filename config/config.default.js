const path = require('path')
const Sequelize = require('sequelize')

exports.keys = 'qtuminfo-api-mainnet'

exports.sequrity = {
  csrf: {enable: false}
}

exports.sequelize = {
  Sequelize: require('sequelize'),
  dialect: 'mysql',
  database: 'qtum_mainnet',
  host: 'localhost',
  port: 3306,
  username: 'qtum',
  password: '',
  isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
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
