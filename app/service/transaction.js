const {Service} = require('egg')

class TransactionService extends Service {
  async getTransaction(id) {
    const {
      Header, Address, Block,
      Transaction, Witness, TransactionOutput, GasRefund, Receipt, ReceiptLog, ContractSpend,
      Contract, Qrc20: QRC20, Qrc721: QRC721,
      where, col
    } = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op

    let transaction = await Transaction.findOne({
      where: {id},
      include: [
        {
          model: Block,
          as: 'block',
          required: false,
          attributes: ['hash'],
          include: [{
            model: Header,
            as: 'header',
            required: true,
            attributes: ['timestamp']
          }]
        },
        {
          model: ContractSpend,
          as: 'contractSpendSource',
          required: false,
          attributes: ['destTxId']
        }
      ]
    })
    if (!transaction) {
      return null
    }
    let witnesses = await Witness.findAll({
      where: {transactionId: id},
      attributes: ['inputIndex', 'script'],
      order: [['inputIndex', 'ASC'], ['witnessIndex', 'ASC']]
    })

    let inputs = await TransactionOutput.findAll({
      where: {inputTxId: id},
      include: [{
        model: Address,
        as: 'address',
        required: false,
        attributes: ['string']
      }],
      order: [['inputIndex', 'ASC']]
    })
    let outputs = await TransactionOutput.findAll({
      where: {outputTxId: id},
      include: [
        {
          model: Address,
          as: 'address',
          required: false,
          attributes: ['string']
        },
        {
          model: GasRefund,
          as: 'refund',
          on: {
            transactionId: where(col('refund.transaction_id'), '=', col('transaction_output.output_transaction_id')),
            outputIndex: where(col('refund.output_index'), '=', col('transaction_output.output_index'))
          },
          required: false,
          attributes: ['refundTxId', 'refundIndex'],
          include: [{
            model: TransactionOutput,
            as: 'refundTo',
            on: {
              transactionId: where(col('refund->refundTo.output_transaction_id'), '=', col('refund.refund_transaction_id')),
              outputIndex: where(col('refund->refundTo.output_index'), '=', col('refund.refund_index'))
            },
            required: true,
            attributes: ['value']
          }]
        },
        {
          model: GasRefund,
          as: 'refundTo',
          on: {
            transactionId: where(col('refundTo.refund_transaction_id'), '=', col('transaction_output.output_transaction_id')),
            outputIndex: where(col('refundTo.refund_index'), '=', col('transaction_output.output_index'))
          },
          required: false,
          attributes: ['transactionId', 'outputIndex']
        },
        {
          model: Receipt,
          as: 'receipt',
          on: {
            transactionId: where(col('receipt.transaction_id'), '=', col('transaction_output.output_transaction_id')),
            outputIndex: where(col('receipt.output_index'), '=', col('transaction_output.output_index'))
          },
          required: false,
          include: [{
            model: Contract,
            as: 'contract',
            required: true,
            attributes: ['addressString']
          }]
        }
      ],
      order: [['outputIndex', 'ASC']]
    })

    let eventLogs = []
    let contractSpends = []

    if (outputs.some(output => output.receipt)) {
      eventLogs = await ReceiptLog.findAll({
        where: {receiptId: {[$in]: outputs.filter(output => output.receipt).map(output => output.receipt._id)}},
        include: [
          {
            model: Contract,
            as: 'contract',
            required: true,
            attributes: ['addressString']
          },
          {
            model: QRC20,
            as: 'qrc20',
            required: false,
            attributes: ['name', 'symbol', 'decimals']
          },
          {
            model: QRC721,
            as: 'qrc721',
            required: false,
            attributes: ['name', 'symbol']
          }
        ],
        order: [['_id', 'ASC']]
      })
      let contractSpendIds = (await Transaction.findAll({
        attributes: ['id'],
        include: [{
          model: ContractSpend,
          as: 'contractSpendSource',
          required: true,
          attributes: [],
          where: {destTxId: id}
        }],
        order: [['blockHeight', 'ASC'], ['indexInBlock', 'ASC']]
      })).map(item => item.id)
      if (contractSpendIds.length) {
        let inputs = await TransactionOutput.findAll({
          where: {inputTxId: {[$in]: contractSpendIds}},
          attributes: ['inputTxId', 'value'],
          include: [{
            model: Address,
            as: 'address',
            required: false,
            attributes: ['string']
          }],
          order: [['inputIndex', 'ASC']]
        })
        let outputs = await TransactionOutput.findAll({
          where: {outputTxId: {[$in]: contractSpendIds}},
          attributes: ['outputTxId', 'value'],
          include: [{
            model: Address,
            as: 'address',
            required: false,
            attributes: ['string']
          }],
          order: [['outputIndex', 'ASC']]
        })
        for (let id of contractSpendIds) {
          contractSpends.push({
            inputs: inputs.filter(input => Buffer.compare(input.inputTxId, id) === 0).map(input => ({
              address: input.address.string,
              value: input.value
            })),
            outputs: outputs.filter(output => Buffer.compare(output.outputTxId, id) === 0).map(output => ({
              address: output.address.string,
              value: output.value
            }))
          })
        }
      }
    }

    return {
      id: transaction.id,
      hash: transaction.hash,
      version: transaction.version,
      flag: transaction.flag,
      inputs: inputs.map(input => ({
        prevTxId: input.outputTxId || Buffer.alloc(32),
        outputIndex: input.outputIndex == null ? 0xfffffff : input.outputIndex,
        scriptSig: input.scriptSig,
        sequence: input.sequence,
        address: input.address && input.address.string,
        value: input.value
      })),
      outputs: outputs.map(output => {
        let outputObject = {
          scriptPubKey: output.scriptPubKey,
          address: output.address && output.address.string,
          value: output.value,
        }
        if (output.inputTxId) {
          outputObject.spentTxId = output.inputTxId
          outputObject.spentIndex = output.inputIndex
        }
        if (output.refund) {
          outputObject.refundTxId = output.refund.refundTxId
          outputObject.refundIndex = output.refund.refundIndex
          outputObject.refundValue = output.refund.refundTo.value
        }
        outputObject.isRefund = Boolean(output.refundTo)
        if (output.receipt) {
          outputObject.receipt = {
            gasUsed: output.receipt.gasUsed,
            contractAddress: output.receipt.contract.addressString,
            contractAddressHex: output.receipt.contractAddress,
            excepted: output.receipt.excepted,
            logs: eventLogs.filter(log => log.receiptId === output.receipt._id).map(log => ({
              address: log.contract.addressString,
              addressHex: log.address,
              topics: this.transformTopics(log),
              data: log.data,
              ...log.qrc20 ? {
                qrc20: {
                  name: log.qrc20.name,
                  symbol: log.qrc20.symbol,
                  decimals: log.qrc20.decimals
                }
              } : {},
              ...log.qrc721 ? {
                qrc721: {
                  name: log.qrc721.name,
                  symbol: log.qrc721.symbol
                }
              } : {}
            }))
          }
        }
        return outputObject
      }),
      witnesses: this.transformWitnesses(witnesses),
      lockTime: transaction.lockTime,
      ...transaction.block ? {
        block: {
          hash: transaction.block.hash,
          height: transaction.blockHeight,
          timestamp: transaction.block.header.timestamp,
        }
      } : {},
      ...transaction.contractSpendSource ? {contractSpendSource: transaction.contractSpendSource.destTxId} : {},
      contractSpends,
      size: transaction.size,
      weight: transaction.weight
    }
  }

  async getRawTransaction(id) {
    const {Transaction, Witness, TransactionOutput} = this.ctx.model
    const {Transaction: RawTransaction, Input, Output, Script} = this.app.qtuminfo.lib

    let transaction = await Transaction.findOne({
      where: {id},
      attributes: ['version', 'flag', 'lockTime']
    })
    if (!transaction) {
      return null
    }
    let witnesses = await Witness.findAll({
      where: {transactionId: id},
      attributes: ['inputIndex', 'script'],
      order: [['inputIndex', 'ASC'], ['witnessIndex', 'ASC']]
    })

    let inputs = await TransactionOutput.findAll({
      where: {inputTxId: id},
      attributes: ['outputTxId', 'outputIndex', 'scriptSig', 'sequence'],
      order: [['inputIndex', 'ASC']]
    })
    let outputs = await TransactionOutput.findAll({
      where: {outputTxId: id},
      attributes: ['value', 'scriptPubKey'],
      order: [['outputIndex', 'ASC']]
    })

    return new RawTransaction({
      version: transaction.version,
      flag: transaction.flag,
      inputs: inputs.map(input => new Input({
        prevTxId: input.outputTxId || Buffer.alloc(32),
        outputIndex: input.outputIndex == null ? 0xfffffff : input.outputIndex,
        scriptSig: Script.fromBuffer(input.scriptSig, {isCoinbase: this.outputIndex == null, isInput: true}),
        sequence: input.sequence
      })),
      outputs: outputs.map(output => new Output({
        value: output.value,
        scriptPubKey: Script.fromBuffer(output.scriptPubKey, {isOutput: true})
      })),
      witnesses: this.transformWitnesses(witnesses),
      lockTime: transaction.lockTime
    })
  }

  async getRecentTransactions(count = 10) {
    const {Transaction} = this.ctx.model
    const {or: $or, gt: $gt, lte: $lte} = this.app.Sequelize.Op

    return (await Transaction.findAll({
      where: {
        indexInBlock: {[$gt]: 0},
        [$or]: [
          {blockHeight: {[$lte]: 5000}},
          {indexInBlock: {[$gt]: 1}}
        ]
      },
      attributes: ['id'],
      order: [['blockHeight', 'ASC'], ['indexInBlock', 'ASC'], ['_id', 'ASC']],
      limit: count
    })).map(tx => tx.id)
  }

  async transformTransaction(transaction, {brief = false} = {}) {
    let confirmations = transaction.block ? this.app.blockchainInfo.tip.height - transaction.block.height + 1 : 0
    let inputValue = transaction.inputs.map(input => input.value).reduce((x, y) => x + y)
    let outputValue = transaction.outputs.map(output => output.value).reduce((x, y) => x + y)
    let refundValue = transaction.outputs
      .map(output => output.refundValue)
      .filter(Boolean)
      .reduce((x, y) => x + y, 0n)
    let refundToValue = transaction.outputs
      .filter(output => output.isRefund)
      .map(output => output.value)
      .reduce((x, y) => x + y, 0n)
    let inputs = this.isCoinbase(transaction.inputs[0])
      ? [{
        coinbase: transaction.inputs[0].scriptSig.toString('hex'),
        ...brief ? {} : {
          sequence: transaction.inputs[0].sequence,
          index: 0
        }
      }]
      : transaction.inputs.map((input, index) => this.transformInput(input, index, {brief}))
    let outputs = transaction.outputs.map((output, index) => this.transformOutput(output, index, {transaction, brief}))

    let qrc20TokenTransfers = await this.transformQRC20Transfers(transaction.outputs)
    let qrc721TokenTransfers = await this.transformQRC721Transfers(transaction.outputs)

    return {
      id: transaction.id.toString('hex'),
      ...brief ? {} : {
        hash: transaction.hash.toString('hex'),
        version: transaction.version,
        witnesses: transaction.witnesses.map(list => list.map(script => script.toString('hex'))),
        lockTime: transaction.lockTime,
        blockHash: transaction.block && transaction.block.hash.toString('hex')
      },
      inputs,
      outputs,
      isCoinbase: this.isCoinbase(transaction.inputs[0]),
      isCoinstake: this.isCoinstake(transaction),
      blockHeight: transaction.block && transaction.block.height,
      confirmations,
      timestamp: transaction.block && transaction.block.timestamp,
      inputValue: inputValue.toString(),
      outputValue: outputValue.toString(),
      refundValue: refundValue.toString(),
      fees: (inputValue - outputValue - refundValue + refundToValue).toString(),
      ...brief ? {} : {
        size: transaction.size,
        weight: transaction.weight
      },
      contractSpendSource: transaction.contractSpendSource && transaction.contractSpendSource.toString('hex'),
      contractSpends: transaction.contractSpends.map(({inputs, outputs}) => ({
        inputs: inputs.map(input => ({
          address: input.address,
          value: input.value.toString()
        })),
        outputs: outputs.map(output => ({
          address: output.address,
          value: output.value.toString()
        }))
      })),
      qrc20TokenTransfers,
      qrc721TokenTransfers
    }
  }

  transformWitnesses(witnesses) {
    let result = []
    let lastInputIndex = null
    for (let {inputIndex, script} of witnesses) {
      if (inputIndex !== lastInputIndex) {
        result.push([])
      }
      result[result.length - 1].push(script)
    }
    return result
  }

  transformInput(input, index, {brief}) {
    return {
      value: input.value.toString(),
      address: input.address,
      ...brief ? {} : {
        prevTxId: input.prevTxId.toString('hex'),
        outputIndex: input.outputIndex,
        sequence: input.sequence,
        index,
        scriptSig: {
          hex: input.scriptSig.toString('hex'),
          asm: this.app.qtuminfo.lib.Script.fromBuffer(
            input.scriptSig,
            {isCoinbase: this.isCoinbase(input), isInput: true}
          ).toString()
        }
      }
    }
  }

  transformOutput(output, index, {transaction, brief}) {
    const {Address, Script} = this.app.qtuminfo.lib
    let scriptPubKey = Script.fromBuffer(output.scriptPubKey, {isOutput: true})
    let type
    let address = Address.fromScript(scriptPubKey, this.app.chain, transaction.id, index)
    if (address) {
      type = address.type
    } else if (output.scriptPubKey.isDataOut()) {
      type = 'nulldata'
    } else {
      type = 'nonstandard'
    }
    let result = {
      value: output.value.toString(),
      address: output.address,
      scriptPubKey: {type}
    }
    if (!brief) {
      result.scriptPubKey.hex = output.scriptPubKey.toString('hex')
      result.scriptPubKey.asm = scriptPubKey.toString()
    }
    if (output.spentTxId) {
      result.spentTxId = output.spentTxId.toString('hex')
      result.spentIndex = output.spentIndex
    }
    if (output.receipt) {
      result.receipt = {
        gasUsed: output.receipt.gasUsed,
        contractAddress: output.receipt.contractAddress,
        contractAddressHex: output.receipt.contractAddressHex.toString('hex'),
        excepted: output.receipt.excepted,
        logs: output.receipt.logs.map(log => ({
          address: log.address,
          addressHex: log.addressHex.toString('hex'),
          topics: log.topics.map(topic => topic.toString('hex')),
          data: log.data.toString('hex')
        }))
      }
    }
    return result
  }

  async transformQRC20Transfers(outputs) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    let result = []
    for (let output of outputs) {
      if (output.receipt) {
        for (let {address, addressHex, topics, data, qrc20} of output.receipt.logs) {
          if (qrc20 && topics.length === 3 && Buffer.compare(topics[0], TransferABI.id) === 0 && data.length === 32) {
            let from = await this.transformHexAddress(topics[1])
            let to = await this.transformHexAddress(topics[2])
            result.push({
              token: {
                address,
                addressHex: addressHex.toString('hex'),
                name: qrc20.name.toString(),
                symbol: qrc20.symbol.toString(),
                decimals: qrc20.decimals
              },
              ...from && typeof from === 'object' ? {from: from.string, fromHex: from.hex} : {from},
              ...to && typeof to === 'object' ? {to: to.string, toHex: to.hex} : {to},
              value: BigInt(`0x${data.toString('hex')}`).toString()
            })
          }
        }
      }
    }
    return result
  }

  async transformQRC721Transfers(outputs) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    let result = []
    for (let output of outputs) {
      if (output.receipt) {
        for (let {address, addressHex, topics, data, qrc721} of output.receipt.logs) {
          if (
            qrc721 && [3, 4].includes(topics.length) && Buffer.compare(topics[0], TransferABI.id) === 0
            && (topics[3] || data.length === 32)
          ) {
            let from = await this.transformHexAddress(topics[1])
            let to = await this.transformHexAddress(topics[2])
            result.push({
              token: {
                address,
                addressHex: addressHex.toString('hex'),
                name: qrc721.name.toString(),
                symbol: qrc721.symbol.toString()
              },
              ...from && 'string' in from ? {from: from.string, fromHex: from.hex} : {from},
              ...to && 'string' in to ? {to: to.string, toHex: to.hex} : {to},
              tokenId: topics[3] ? topics[3].toString('hex') : data.toString('hex')
            })
          }
        }
      }
    }
    return result
  }

  isCoinbase(input) {
    return Buffer.compare(input.prevTxId, Buffer.alloc(32)) === 0 && input.outputIndex === 0xffffffff
  }

  isCoinstake(transaction) {
    return transaction.inputs.length > 0 && Buffer.compare(transaction.inputs[0].prevTxId, Buffer.alloc(32)) !== 0
      && transaction.outputs.length >= 2 && transaction.outputs[0].value === 0n && transaction.outputs[0].scriptPubKey.length === 0
  }

  async transformHexAddress(buffer) {
    if (Buffer.compare(buffer, Buffer.alloc(32)) === 0) {
      return null
    }
    let address = buffer.slice(12)
    const {Contract} = this.ctx.model
    const {Address} = this.app.qtuminfo.lib
    let contract = await Contract.findOne({where: {address}, attributes: ['addressString']})
    if (contract) {
      return {string: contract.addressString, hex: address.toString('hex')}
    } else {
      return new Address({
        type: Address.PAY_TO_PUBLIC_KEY_HASH,
        data: address,
        chain: this.app.chain
      }).toString()
    }
  }

  transformTopics(log) {
    let result = []
    if (log.topic1) {
      result.push(log.topic1)
    }
    if (log.topic2) {
      result.push(log.topic2)
    }
    if (log.topic3) {
      result.push(log.topic3)
    }
    if (log.topic4) {
      result.push(log.topic4)
    }
    return result
  }
}

module.exports = TransactionService
