const {Service} = require('egg')

class BlockService extends Service {
  async getBlock(arg) {
    const {Header, Address, Block, Transaction} = this.ctx.model
    let filter
    if (Number.isInteger(arg)) {
      filter = {height: arg}
    } else if (Buffer.isBuffer(arg)) {
      filter = {hash: arg}
    } else {
      return null
    }
    let result = await Header.findOne({
      where: filter,
      include: [{
        model: Block,
        as: 'block',
        required: true,
        attributes: ['size', 'weight'],
        include: [{
          model: Address,
          as: 'miner',
          attributes: ['string']
        }]
      }],
      transaction: this.ctx.state.transaction
    })
    if (!result) {
      return null
    }
    let [prevHeader, nextHeader, transactions, [reward]] = await Promise.all([
      Header.findOne({
        where: {height: result.height - 1},
        attributes: ['timestamp'],
        transaction: this.ctx.state.transaction
      }),
      Header.findOne({
        where: {height: result.height + 1},
        attributes: ['hash'],
        transaction: this.ctx.state.transaction
      }),
      Transaction.findAll({
        where: {blockHeight: result.height},
        attributes: ['id'],
        order: [['indexInBlock', 'ASC']],
        transaction: this.ctx.state.transaction
      }),
      this.getBlockRewards(result.height)
    ])
    return {
      hash: result.hash,
      height: result.height,
      version: result.version,
      prevHash: result.prevHash,
      nextHash: nextHeader && nextHeader.hash,
      merkleRoot: result.merkleRoot,
      timestamp: result.timestamp,
      bits: result.bits,
      nonce: result.nonce,
      hashStateRoot: result.hashStateRoot,
      hashUTXORoot: result.hashUTXORoot,
      stakePrevTxId: result.stakePrevTxId,
      stakeOutputIndex: result.stakeOutputIndex,
      signature: result.signature,
      chainwork: result.chainwork,
      proofOfStake: result.isProofOfStake(),
      interval: result.height > 0 ? result.timestamp - prevHeader.timestamp : null,
      size: result.block.size,
      weight: result.block.weight,
      transactions: transactions.map(tx => tx.id),
      miner: result.block.miner.string,
      difficulty: result.difficulty,
      reward,
      confirmations: this.app.blockchainInfo.tip.height - result.height + 1
    }
  }

  async getRawBlock(arg) {
    const {Header, Transaction} = this.ctx.model
    const {Header: RawHeader, Block: RawBlock} = this.app.qtuminfo.lib
    let filter
    if (Number.isInteger(arg)) {
      filter = {height: arg}
    } else if (Buffer.isBuffer(arg)) {
      filter = {hash: arg}
    } else {
      return null
    }
    let block = await Header.findOne({where: filter, transaction: this.ctx.state.transaction})
    if (!block) {
      return null
    }
    let transactionIds = (await Transaction.findAll({
      where: {blockHeight: block.height},
      attributes: ['id'],
      order: [['indexInBlock', 'ASC']],
      transaction: this.ctx.state.transaction
    })).map(tx => tx.id)
    let transactions = await Promise.all(transactionIds.map(id => this.ctx.service.transaction.getRawTransaction(id)))
    return new RawBlock({
      header: new RawHeader({
        version: block.version,
        prevHash: block.prevHash,
        merkleRoot: block.merkleRoot,
        timestamp: block.timestamp,
        bits: block.bits,
        nonce: block.nonce,
        hashStateRoot: block.hashStateRoot,
        hashUTXORoot: block.hashUTXORoot,
        stakePrevTxId: block.stakePrevTxId,
        stakeOutputIndex: block.stakeOutputIndex,
        signature: block.signature
      }),
      transactions
    })
  }

  async listBlocks(min, max) {
    const {Header, Address, Block} = this.ctx.model
    const {between: $between} = this.app.Sequelize.Op
    let blocks = await Header.findAll({
      where: {timestamp: {[$between]: [min, max - 1]}},
      attributes: ['hash', 'height', 'timestamp'],
      include: [{
        model: Block,
        as: 'block',
        required: true,
        attributes: ['size', 'transactionsCount'],
        include: [{
          model: Address,
          as: 'miner',
          attributes: ['string']
        }]
      }],
      order: [['height', 'ASC']],
      transaction: this.ctx.state.transaction
    })
    if (blocks.length === 0) {
      return []
    }
    return await this.getBlockSummary(blocks)
  }

  async getRecentBlocks(count) {
    const {Header, Address, Block} = this.ctx.model
    let blocks = await Header.findAll({
      attributes: ['hash', 'height', 'timestamp'],
      include: [{
        model: Block,
        as: 'block',
        required: true,
        attributes: ['size', 'transactionsCount'],
        include: [{
          model: Address,
          as: 'miner',
          attributes: ['string']
        }]
      }],
      order: [['height', 'DESC']],
      limit: count,
      transaction: this.ctx.state.transaction
    })
    if (blocks.length === 0) {
      return []
    }
    blocks.reverse()
    return await this.getBlockSummary(blocks)
  }

  async getBlockRewards(startHeight, endHeight = startHeight + 1) {
    let rewards = await this.ctx.model.query(`
      SELECT SUM(value) AS value FROM (
        SELECT tx.block_height AS height, utxo.value AS value FROM transaction tx, transaction_output utxo
        WHERE
          tx.block_height BETWEEN ${startHeight} AND ${endHeight - 1}
          AND ((tx.block_height <= 5000 AND tx.index_in_block = 0) OR (tx.block_height > 5000 AND tx.index_in_block = 1))
          AND tx.id = utxo.output_transaction_id
          AND NOT EXISTS(
            SELECT refund_transaction_id FROM gas_refund
            WHERE refund_transaction_id = utxo.output_transaction_id AND refund_index = utxo.output_index
          )
        UNION ALL
        SELECT tx.block_height AS height, -txo.value AS value FROM transaction tx, transaction_output txo
        WHERE
          tx.block_height BETWEEN ${startHeight} AND ${endHeight - 1}
          AND ((tx.block_height <= 5000 AND tx.index_in_block = 0) OR (tx.block_height > 5000 AND tx.index_in_block = 1))
          AND tx.id = txo.input_transaction_id
      ) AS block_reward
      GROUP BY height
      ORDER BY height ASC
    `, {type: this.ctx.model.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let result = rewards.map(reward => BigInt(reward.value))
    if (startHeight[0] === 0) {
      result[0] = 0n
    }
    return result
  }

  async getBlockSummary(blocks) {
    const {Header} = this.ctx.model
    let [prevHeader, rewards] = await Promise.all([
      Header.findOne({
        where: {height: blocks[0].height - 1},
        attributes: ['timestamp'],
        transaction: this.ctx.state.transaction
      }),
      this.getBlockRewards(blocks[0].height, blocks[blocks.length - 1].height + 1)
    ])
    let result = []
    for (let i = blocks.length; --i >= 0;) {
      let block = blocks[i]
      let reward = rewards[i]
      let interval
      if (i === 0) {
        interval = prevHeader ? block.timestamp - prevHeader.timestamp : null
      } else {
        interval = block.timestamp - blocks[i - 1].timestamp
      }
      result.push({
        hash: block.hash,
        height: block.height,
        timestamp: block.timestamp,
        transactionCount: block.block.transactionCount,
        interval,
        size: block.block.size,
        miner: block.block.miner.string,
        reward
      })
    }
    return blocks
  }
}

module.exports = BlockService
