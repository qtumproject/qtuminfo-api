const {Service} = require('egg')

class AddressService extends Service {
  async getAddressParams(string) {
    const {app, ctx} = this
    if (!string) {
      ctx.throw(400)
    }
    const {Address: RawAddress} = app.qtuminfo.lib
    const chain = app.chain
    const {Address} = ctx.model
    const {in: $in} = app.Sequelize.Op

    let addresses = string.split(',')
    let hexAddresses = []
    for (let address of addresses) {
      try {
        let rawAddress = RawAddress.fromString(address, chain)
        if (rawAddress.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH) {
          hexAddresses.push(rawAddress.data)
        }
      } catch (err) {
        ctx.throw(400)
      }
    }
    let result = await Address.findAll({
      where: {string: {[$in]: addresses}},
      attributes: ['_id', 'type', 'data']
    })
    return {
      addressIds: result.map(address => address._id),
      p2pkhAddressIds: result.filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH).map(address => address._id),
      hexAddresses
    }
  }

  async getAddressSummary(addressIds, p2pkhAddressIds, hexAddresses) {
    const {Block} = this.ctx.model
    const {balance: balanceService, contract: contractService} = this.ctx.service
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let [
      {totalReceived, totalSent},
      unconfirmed,
      staking,
      mature,
      qrc20TokenBalances,
      blocksMined,
      transactionCount
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      balanceService.getStakingBalance(addressIds),
      balanceService.getMatureBalance(p2pkhAddressIds),
      contractService.getAllQRC20TokenBalances(hexAddresses),
      Block.count({where: {minerId: {[$in]: p2pkhAddressIds}, height: {[$gt]: 0}}}),
      this.getTransactionCount(addressIds, hexAddresses),
    ])
    return {
      balance: totalReceived - totalSent,
      totalReceived,
      totalSent,
      unconfirmed,
      staking,
      mature,
      qrc20TokenBalances,
      transactionCount,
      blocksMined
    }
  }

  async getTransactionCount(addressIds, hexAddresses) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let addressQuery = addressIds.join(', ') || 'NULL'
    let topicQuery = hexAddresses.map(address => `0x${'0'.repeat(24) + address.toString('hex')}`).join(', ') || 'NULL'
    let [{count}] = await db.query(`
      SELECT COUNT(DISTINCT(id)) AS count FROM (
        SELECT transaction_id AS id FROM balance_change WHERE address_id IN (${addressQuery})
        UNION ALL
        SELECT receipt.transaction_id AS id FROM receipt, receipt_log
        WHERE receipt._id = receipt_log.receipt_id
          AND receipt_log.topic1 = 0x${TransferABI.id.toString('hex')}
          AND (receipt_log.topic2 IN (${topicQuery}) OR receipt_log.topic3 IN (${topicQuery}))
      ) AS list
    `, {type: db.QueryTypes.SELECT})
    return count
  }

  async getUTXO(ids) {
    const {Address, TransactionOutput} = this.ctx.model
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    const blockHeight = this.app.blockchainInfo.tip.height
    let utxos = await TransactionOutput.findAll({
      where: {
        addressId: {[$in]: ids},
        outputHeight: {[$gt]: 0},
        inputHeight: null
      },
      attributes: ['outputTxId', 'outputIndex', 'outputHeight', 'scriptPubKey', 'value', 'isStake'],
      include: [{
        model: Address,
        as: 'address',
        required: true,
        attributes: ['string']
      }]
    })
    return utxos.map(utxo => ({
      transactionId: utxo.outputTxId,
      outputIndex: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey,
      address: utxo.address.string,
      value: utxo.value,
      isStake: utxo.isStake,
      blockHeight: utxo.outputHeight,
      confirmations: utxo.outputHeight === 0xffffffff ? 0 : blockHeight - utxo.outputHeight + 1
    }))
  }
}

module.exports = AddressService
