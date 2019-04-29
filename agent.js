const SocketClient = require('socket.io-client')

module.exports = function(agent) {
  let tip = null
  let stakeWeight = null
  let feeRate = null
  let dgpInfo = null
  let dailyTransactions = []
  let blockInterval = []
  let addressGrowth = []

  agent.messenger.on('egg-ready', () => {
    let io = SocketClient(`http://localhost:${agent.config.qtuminfo.port}`)
    io.on('tip', newTip => {
      tip = newTip
      agent.messenger.sendToApp('block-tip', tip)
      agent.messenger.sendRandom('socket/block-tip', tip)
    })
    io.on('block', block => {
      tip = block
      agent.messenger.sendToApp('new-block', block)
      agent.messenger.sendRandom('update-stakeweight')
      agent.messenger.sendRandom('update-dgpinfo')
      agent.messenger.sendRandom('socket/block-tip', block)
    })
    io.on('reorg', block => {
      tip = block
      agent.messenger.sendToApp('reorg-to-block', block)
      agent.messenger.sendRandom('socket/reorg/block-tip', block)
    })
    io.on('mempool-transaction', id => {
      if (id) {
        agent.messenger.sendRandom('socket/mempool-transaction', id)
      }
    })
  })

  async function fetchFeeRate() {
    agent.messenger.sendToApp('update-feerate')
  }

  let lastTipHash = Buffer.alloc(0)
  function updateStatistics() {
    if (tip && Buffer.compare(lastTipHash, tip.hash) !== 0) {
      agent.messenger.sendRandom('update-richlist')
      agent.messenger.sendRandom('update-daily-transactions')
      agent.messenger.sendRandom('update-block-interval')
      agent.messenger.sendRandom('update-address-growth')
      lastTipHash = tip.hash
    }
  }

  setInterval(fetchFeeRate, 60 * 1000).unref()
  setInterval(updateStatistics, 2 * 60 * 1000).unref()

  agent.messenger.on('blockchain-info', () => {
    agent.messenger.sendToApp('blockchain-info', {tip, stakeWeight, feeRate, dgpInfo})
  })
  agent.messenger.on('stakeweight', result => {
    stakeWeight = result
    agent.messenger.sendToApp('stakeweight', stakeWeight)
    agent.messenger.sendRandom('socket/stakeweight', stakeWeight)
  })
  agent.messenger.on('feerate', result => {
    if (result) {
      feeRate = result
    } else if (feeRate == null) {
      feeRate = 0.004
    }
    agent.messenger.sendToApp('feerate', feeRate)
    agent.messenger.sendRandom('socket/feerate', feeRate)
  })
  agent.messenger.on('dgpinfo', result => {
    dgpInfo = result
    agent.messenger.sendToApp('dgpinfo', dgpInfo)
    agent.messenger.sendRandom('socket/dgpinfo', dgpInfo)
  })
  agent.messenger.on('daily-transactions', result => {
    dailyTransactions = result
  })
  agent.messenger.on('block-interval', result => {
    blockInterval = result
  })
  agent.messenger.on('address-growth', result => {
    addressGrowth = result
  })

  agent.messenger.on('egg-ready', () => {
    let interval = setInterval(() => {
      if (tip && stakeWeight && feeRate && dgpInfo) {
        agent.messenger.sendToApp('blockchain-info', {tip, stakeWeight, feeRate, dgpInfo})
        clearInterval(interval)
        updateStatistics()
      }
    }, 0)
    agent.messenger.sendRandom('update-stakeweight')
    fetchFeeRate()
    agent.messenger.sendRandom('update-dgpinfo')
  })

  agent.messenger.on('fetch-daily-transactions', nonce => {
    agent.messenger.sendToApp(`daily-transactions-${nonce}`, dailyTransactions)
  })
  agent.messenger.on('fetch-block-interval', nonce => {
    agent.messenger.sendToApp(`block-interval-${nonce}`, blockInterval)
  })
  agent.messenger.on('fetch-address-growth', nonce => {
    agent.messenger.sendToApp(`address-growth-${nonce}`, addressGrowth)
  })
}
