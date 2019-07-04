const {Service} = require('egg')

class AddressService extends Service {
  async getAddressSummary(addressIds, p2pkhAddressIds, rawAddresses) {
    const {Address} = this.ctx.app.qtuminfo.lib
    const {Block} = this.ctx.model
    const {balance: balanceService, qrc20: qrc20Service, qrc721: qrc721Service} = this.ctx.service
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let hexAddresses = rawAddresses.filter(address => address.type === Address.PAY_TO_PUBLIC_KEY_HASH).map(address => address.data)
    let [
      {totalReceived, totalSent},
      unconfirmed,
      staking,
      mature,
      qrc20Balances,
      qrc721Balances,
      ranking,
      blocksMined,
      transactionCount
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      balanceService.getStakingBalance(addressIds),
      balanceService.getMatureBalance(p2pkhAddressIds),
      qrc20Service.getAllQRC20Balances(hexAddresses),
      qrc721Service.getAllQRC721Balances(hexAddresses),
      balanceService.getBalanceRanking(addressIds),
      Block.count({where: {minerId: {[$in]: p2pkhAddressIds}, height: {[$gt]: 0}}}),
      this.getAddressTransactionCount(addressIds, rawAddresses),
    ])
    return {
      balance: totalReceived - totalSent,
      totalReceived,
      totalSent,
      unconfirmed,
      staking,
      mature,
      qrc20Balances,
      qrc721Balances,
      ranking,
      transactionCount,
      blocksMined
    }
  }

  async getAddressTransactionCount(addressIds, rawAddresses) {
    const {Address: RawAddress, Solidity} = this.app.qtuminfo.lib
    const TransferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let topics = rawAddresses
      .filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => Buffer.concat([Buffer.alloc(12), address.data]))
    let [{count}] = await db.query(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change WHERE address_id IN ${addressIds}
        UNION
        SELECT transaction_id FROM evm_receipt
        WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM evm_receipt receipt, evm_receipt_log log, contract
        WHERE receipt._id = log.receipt_id
          AND contract.address = log.address AND contract.type IN ('qrc20', 'qrc721')
          AND log.topic1 = ${TransferABI.id}
          AND (log.topic2 IN ${topics} OR log.topic3 IN ${topics})
          AND (
            (contract.type = 'qrc20' AND log.topic3 IS NOT NULL AND log.topic4 IS NULL)
            OR (contract.type = 'qrc721' AND log.topic4 IS NOT NULL)
          )
      ) list
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
  }

  async getAddressTransactions(addressIds, rawAddresses) {
    const {Address: RawAddress, Solidity} = this.app.qtuminfo.lib
    const TransferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let topics = rawAddresses
      .filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => Buffer.concat([Buffer.alloc(12), address.data]))
    let totalCount = await this.getAddressTransactionCount(addressIds, rawAddresses)
    let transactions = (await db.query(sql`
      SELECT tx.id AS id FROM (
        SELECT _id FROM (
          SELECT block_height, index_in_block, transaction_id AS _id FROM balance_change
          WHERE address_id IN ${addressIds}
          UNION
          SELECT block_height, index_in_block, transaction_id AS _id
          FROM evm_receipt
          WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM evm_receipt receipt, evm_receipt_log log, contract
          WHERE receipt._id = log.receipt_id
            AND contract.address = log.address AND contract.type IN ('qrc20', 'qrc721')
            AND log.topic1 = ${TransferABI.id}
            AND (log.topic2 IN ${topics} OR log.topic3 IN ${topics})
            AND (
              (contract.type = 'qrc20' AND log.topic3 IS NOT NULL AND log.topic4 IS NULL)
              OR (contract.type = 'qrc721' AND log.topic4 IS NOT NULL)
            )
        ) list
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      ) list, transaction tx
      WHERE tx._id = list._id
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({id}) => id)
    return {totalCount, transactions}
  }

  async getAddressBasicTransactionCount(addressIds) {
    const {BalanceChange} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    return await BalanceChange.count({
      where: {addressId: {[$in]: addressIds}},
      distinct: true,
      col: 'transactionId',
      transaction: this.ctx.transaction
    })
  }

  async getAddressBasicTransactions(addressIds) {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let totalCount = await this.getAddressBasicTransactionCount(addressIds)
    let transactionIds = []
    if (addressIds.length === 1) {
      transactionIds = (await db.query(sql`
        SELECT transaction_id AS _id
        FROM balance_change
        WHERE address_id = ${addressIds[0]}
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, transaction_id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({_id}) => _id)
    } else {
      transactionIds = (await db.query(sql`
        SELECT _id FROM (
          SELECT MIN(block_height) AS block_height, MIN(index_in_block) AS index_in_block, transaction_id AS _id
          FROM balance_change
          WHERE address_id IN ${addressIds}
          GROUP BY _id
        ) list
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({_id}) => _id)
    }

    let transactions = await Promise.all(transactionIds.map(async transactionId => {
      let transaction = await this.ctx.service.transaction.getBasicTransaction(transactionId)
      let amount = transaction.outputs.filter(output => addressIds.includes(output.addressId)).map(output => output.value)
        - transaction.inputs.filter(input => addressIds.includes(input.addressId)).map(input => input.value)
      return Object.assign(transaction, {
        confirmations: transaction.blockHeight == null ? 0 : this.app.blockchainInfo.tip.height - transaction.blockHeight + 1,
        amount
      })
    }))
    return {totalCount, transactions}
  }

  async getAddressContractTransactionCount(rawAddresses, contract) {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let contractFilter = ''
    if (contract) {
      contractFilter = sql`AND contract_address = ${contract.contractAddress}`
    }
    let [{count}] = await db.query(sql`
      SELECT COUNT(DISTINCT(_id)) AS count FROM evm_receipt
      WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
        ${{raw: contractFilter}}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
  }

  async getAddressContractTransactions(rawAddresses, contract) {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let contractFilter = ''
    if (contract) {
      contractFilter = sql`AND contract_address = ${contract.contractAddress}`
    }
    let totalCount = await this.getAddressContractTransactionCount(rawAddresses, contract)
    let receiptIds = (await db.query(sql`
      SELECT _id FROM evm_receipt
      WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
        ${{raw: contractFilter}}
      ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, transaction_id ${{raw: order}}, output_index ${{raw: order}}
      LIMIT ${offset}, ${limit}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({_id}) => _id)
    let transactions = await Promise.all(receiptIds.map(async receiptId => {
      let transaction = await this.ctx.service.transaction.getContractTransaction(receiptId)
      return Object.assign(transaction, {
        confirmations: transaction.blockHeight == null ? 0 : this.app.blockchainInfo.tip.height - transaction.blockHeight + 1
      })
    }))
    return {totalCount, transactions}
  }

  async getUTXO(ids) {
    const {Address, Transaction, TransactionOutput} = this.ctx.model
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    const blockHeight = this.app.blockchainInfo.tip.height
    let utxos = await TransactionOutput.findAll({
      where: {
        addressId: {[$in]: ids},
        blockHeight: {[$gt]: 0},
        inputHeight: null
      },
      attributes: ['transactionId', 'outputIndex', 'blockHeight', 'scriptPubKey', 'value', 'isStake'],
      include: [
        {
          model: Transaction,
          as: 'outputTransaction',
          required: true,
          attributes: ['id']
        },
        {
          model: Address,
          as: 'address',
          required: true,
          attributes: ['string']
        }
      ],
      transaction: this.ctx.state.transaction
    })
    return utxos.map(utxo => ({
      transactionId: utxo.outputTransaction.id,
      outputIndex: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey,
      address: utxo.address.string,
      value: utxo.value,
      isStake: utxo.isStake,
      blockHeight: utxo.blockHeight,
      confirmations: utxo.blockHeight === 0xffffffff ? 0 : blockHeight - utxo.blockHeight + 1
    }))
  }
}

module.exports = AddressService
