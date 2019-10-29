const {Controller} = require('egg')

class BlockController extends Controller {
  async block() {
    const {ctx} = this
    let arg = ctx.params.block
    ctx.assert(arg, 404)
    if (/^(0|[1-9]\d{0,9})$/.test(arg)) {
      arg = Number.parseInt(arg)
    } else if (/^[0-9a-f]{64}$/i.test(arg)) {
      arg = Buffer.from(arg, 'hex')
    } else {
      ctx.throw(400)
    }
    let block = await ctx.service.block.getBlock(arg)
    ctx.assert(block, 404)
    ctx.body = {
      hash: block.hash.toString('hex'),
      height: block.height,
      version: block.version,
      prevHash: block.prevHash.toString('hex'),
      ...block.nextHash ? {nextHash: block.nextHash.toString('hex')} : {},
      merkleRoot: block.merkleRoot.toString('hex'),
      timestamp: block.timestamp,
      bits: block.bits.toString(16),
      nonce: block.nonce,
      hashStateRoot: block.hashStateRoot.toString('hex'),
      hashUTXORoot: block.hashUTXORoot.toString('hex'),
      prevOutStakeHash: block.stakePrevTxId.toString('hex'),
      prevOutStakeN: block.stakeOutputIndex,
      signature: block.signature.toString('hex'),
      chainwork: block.chainwork.toString(16).padStart(64, '0'),
      flags: block.proofOfStake ? 'proof-of-stake' : 'proof-of-work',
      ...block.height > 0 ? {interval: block.interval} : {},
      size: block.size,
      weight: block.weight,
      transactions: block.transactions.map(id => id.toString('hex')),
      miner: block.miner,
      difficulty: block.difficulty,
      reward: block.reward.toString(),
      confirmations: this.app.blockchainInfo.tip.height - block.height + 1
    }
  }

  async rawBlock() {
    const {ctx} = this
    let arg = ctx.params.block
    ctx.assert(arg, 404)
    if (/^(0|[1-9]\d{0,9})$/.test(arg)) {
      arg = Number.parseInt(arg)
    } else if (/^[0-9a-f]{64}$/i.test(arg)) {
      arg = Buffer.from(arg, 'hex')
    } else {
      ctx.throw(400)
    }
    let block = await ctx.service.block.getRawBlock(arg)
    ctx.assert(block, 404)
    ctx.body = block.toBuffer().toString('hex')
  }

  async list() {
    const {ctx} = this
    let date = ctx.query.date
    if (!date) {
      let d = new Date()
      let yyyy = d.getUTCFullYear().toString()
      let mm = (d.getUTCMonth() + 1).toString()
      let dd = d.getUTCDate().toString()
      date = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
    let min = Math.floor(Date.parse(date) / 1000)
    let max = min + 24 * 60 * 60
    let {blocks} = await ctx.service.block.listBlocks({min, max})
    ctx.body = blocks.map(block => ({
      hash: block.hash.toString('hex'),
      height: block.height,
      timestamp: block.timestamp,
      ...block.height > 0 ? {interval: block.interval} : {},
      size: block.size,
      transactionCount: block.transactionsCount,
      miner: block.miner,
      reward: block.reward.toString()
    }))
  }

  async blockList() {
    const {ctx} = this
    let dateFilter = null
    let date = ctx.query.date
    if (date) {
      let min = Math.floor(Date.parse(date) / 1000)
      let max = min + 24 * 60 * 60
      dateFilter = {min, max}
    }
    let result = await ctx.service.block.listBlocks(dateFilter)
    ctx.body = {
      totalCount: result.totalCount,
      blocks: result.blocks.map(block => ({
        hash: block.hash.toString('hex'),
        height: block.height,
        timestamp: block.timestamp,
        ...block.height > 0 ? {interval: block.interval} : {},
        size: block.size,
        transactionCount: block.transactionsCount,
        miner: block.miner,
        reward: block.reward.toString()
      }))
    }
  }

  async recent() {
    const {ctx} = this
    let count = Number.parseInt(ctx.query.count || 10)
    let blocks = await ctx.service.block.getRecentBlocks(count)
    ctx.body = blocks.map(block => ({
      hash: block.hash.toString('hex'),
      height: block.height,
      timestamp: block.timestamp,
      ...block.height > 0 ? {interval: block.interval} : {},
      size: block.size,
      transactionCount: block.transactionsCount,
      miner: block.miner,
      reward: block.reward.toString()
    }))
  }
}

module.exports = BlockController
