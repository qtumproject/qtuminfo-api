const {Service} = require('egg')

class AddressService extends Service {
  async getAddressParams(string) {
    if (!string) {
      return null
    }
    const {Address: RawAddress} = this.app.qtuminfo.lib
    const chain = this.app.chain
    const {Address} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op

    let addresses = string.split(',')
    let hexAddresses = []
    for (let address of addresses) {
      try {
        let rawAddress = RawAddress.fromString(address, chain)
        if (rawAddress.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH) {
          hexAddresses.push(rawAddress.data)
        }
      } catch (err) {
        return null
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
    const {balance: balanceService} = this.ctx.service
    const {in: $in} = this.app.Sequelize.Op
    let [
      {totalReceived, totalSent},
      unconfirmed,
      staking,
      mature,
      transactionCount,
      blocksMined
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      balanceService.getStakingBalance(addressIds),
      balanceService.getMatureBalance(p2pkhAddressIds),
      this.getTransactionCount(addressIds, hexAddresses),
      Block.count({where: {minerId: {[$in]: p2pkhAddressIds}}})
    ])
    return {
      balance: totalReceived - totalSent,
      totalReceived,
      totalSent,
      unconfirmed,
      staking,
      mature,
      transactionCount,
      blocksMined
    }
  }

  async getTransactionCount(addressIds, hexAddresses) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let addressQuery = addressIds.join(', ') || 'NULL'
    let topicQuery = hexAddresses.map(address => `0x${address.toString('hex')}`).join(', ') || 'NULL'
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
}

module.exports = AddressService
