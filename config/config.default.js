const path = require('path')

exports.keys = 'qtuminfo-api-mainnet'

exports.sequrity = {csrf: {enable: false}}

exports.qtuminfo = path.resolve('..', 'qtuminfo', 'packages')
