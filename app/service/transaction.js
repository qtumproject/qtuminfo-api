const {Service} = require('egg')

class TransactionService extends Service {
  async getTransaction(id) {
    const {
      Header, Address,
      Transaction, Witness, TransactionOutput, GasRefund,
      EvmReceipt: EVMReceipt, EvmReceiptLog: EVMReceiptLog, ContractSpend,
      Contract, Qrc20: QRC20, Qrc721: QRC721,
      where, col
    } = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    const {Address: RawAddress} = this.app.qtuminfo.lib

    let transaction = await Transaction.findOne({
      where: {id},
      include: [
        {
          model: Header,
          as: 'header',
          required: false,
          attributes: ['hash', 'timestamp']
        },
        {
          model: ContractSpend,
          as: 'contractSpendSource',
          required: false,
          attributes: ['destTxId']
        }
      ],
      transaction: this.ctx.state.transaction
    })
    if (!transaction) {
      return null
    }
    let witnesses = await Witness.findAll({
      where: {transactionId: id},
      attributes: ['inputIndex', 'script'],
      order: [['inputIndex', 'ASC'], ['witnessIndex', 'ASC']],
      transaction: this.ctx.state.transaction
    })

    let inputs = await TransactionOutput.findAll({
      where: {inputTxId: id},
      include: [{
        model: Address,
        as: 'address',
        required: false,
        attributes: ['type', 'string'],
        include: [{
          model: Contract,
          as: 'contract',
          required: false,
          attributes: ['address', 'addressString']
        }]
      }],
      order: [['inputIndex', 'ASC']],
      transaction: this.ctx.state.transaction
    })
    let outputs = await TransactionOutput.findAll({
      where: {outputTxId: id},
      include: [
        {
          model: Address,
          as: 'address',
          required: false,
          attributes: ['type', 'string'],
          include: [{
            model: Contract,
            as: 'contract',
            required: false,
            attributes: ['address', 'addressString']
          }]
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
          model: EVMReceipt,
          as: 'evmReceipt',
          on: {
            transactionId: where(col('evmReceipt.transaction_id'), '=', transaction._id),
            outputIndex: where(col('evmReceipt.output_index'), '=', col('transaction_output.output_index'))
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
      order: [['outputIndex', 'ASC']],
      transaction: this.ctx.state.transaction
    })

    let eventLogs = []
    let contractSpends = []

    if (outputs.some(output => output.evmReceipt)) {
      eventLogs = await EVMReceiptLog.findAll({
        where: {receiptId: {[$in]: outputs.filter(output => output.evmReceipt).map(output => output.evmReceipt._id)}},
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
        order: [['_id', 'ASC']],
        transaction: this.ctx.state.transaction
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
        order: [['blockHeight', 'ASC'], ['indexInBlock', 'ASC']],
        transaction: this.ctx.state.transaction
      })).map(item => item.id)
      if (contractSpendIds.length) {
        let inputs = await TransactionOutput.findAll({
          where: {inputTxId: {[$in]: contractSpendIds}},
          attributes: ['inputTxId', 'value'],
          include: [{
            model: Address,
            as: 'address',
            required: false,
            attributes: ['type', 'string'],
            include: [{
              model: Contract,
              as: 'contract',
              required: false,
              attributes: ['address', 'addressString']
            }]
          }],
          order: [['inputIndex', 'ASC']],
          transaction: this.ctx.state.transaction
        })
        let outputs = await TransactionOutput.findAll({
          where: {outputTxId: {[$in]: contractSpendIds}},
          attributes: ['outputTxId', 'value'],
          include: [{
            model: Address,
            as: 'address',
            required: false,
            attributes: ['type', 'string'],
            include: [{
              model: Contract,
              as: 'contract',
              required: false,
              attributes: ['address', 'addressString']
            }]
          }],
          order: [['outputIndex', 'ASC']],
          transaction: this.ctx.state.transaction
        })
        for (let id of contractSpendIds) {
          contractSpends.push({
            inputs: inputs.filter(input => Buffer.compare(input.inputTxId, id) === 0).map(input => {
              let result = {}
              if (input.address) {
                result.address = [RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(input.address.type) && input.address.contract
                  ? input.address.contract.addressString
                  : input.address.string
                result.addressHex = [RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(input.address.type) && input.address.contract
                  ? input.address.contract.address
                  : undefined
              }
              result.value = input.value
              return result
            }),
            outputs: outputs.filter(output => Buffer.compare(output.outputTxId, id) === 0).map(output => {
              let result = {}
              if (output.address) {
                result.address = [RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(output.address.type) && output.address.contract
                  ? output.address.contract.addressString
                  : output.address.string
                result.addressHex = [RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(output.address.type) && output.address.contract
                  ? output.address.contract.address
                  : undefined
              }
              result.value = output.value
              return result
            })
          })
        }
      }
    }

    return {
      id: transaction.id,
      hash: transaction.hash,
      version: transaction.version,
      flag: transaction.flag,
      inputs: inputs.map((input, index) => {
        let inputObject = {
          prevTxId: input.outputTxId || Buffer.alloc(32),
          outputIndex: input.outputIndex == null ? 0xffffffff : input.outputIndex,
          scriptSig: input.scriptSig,
          sequence: input.sequence,
          witness: witnesses.filter(({inputIndex}) => inputIndex === index).map(({script}) => script),
          value: input.value,
          scriptPubKey: input.scriptPubKey
        }
        if (input.address) {
          if ([RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(input.address.type)) {
            if (input.address.contract) {
              inputObject.address = input.address.contract.addressString
              inputObject.addressHex = input.address.contract.address
            } else {
              let address = RawAddress.fromString(input.address.string, this.app.chain)
              inputObject.address = input.address.string
              inputObject.addressHex = address.data
              inputObject.isInvalidContract = true
            }
          } else {
            inputObject.address = input.address.string
          }
        }
        return inputObject
      }),
      outputs: outputs.map(output => {
        let outputObject = {
          scriptPubKey: output.scriptPubKey,
          value: output.value
        }
        if (output.address) {
          if ([RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(output.address.type)) {
            if (output.address.contract) {
              outputObject.address = output.address.contract.addressString
              outputObject.addressHex = output.address.contract.address
            } else {
              let address = RawAddress.fromString(output.address.string, this.app.chain)
              outputObject.address = output.address.string
              outputObject.addressHex = address.data
              outputObject.isInvalidContract = true
            }
          } else {
            outputObject.address = output.address.string
          }
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
        if (output.evmReceipt) {
          outputObject.evmReceipt = {
            sender: new RawAddress({
              type: output.evmReceipt.senderType,
              data: output.evmReceipt.senderData,
              chain: this.app.chain
            }).toString(),
            gasUsed: output.evmReceipt.gasUsed,
            contractAddress: output.evmReceipt.contract.addressString,
            contractAddressHex: output.evmReceipt.contractAddress,
            excepted: output.evmReceipt.excepted,
            exceptedMessage: output.evmReceipt.exceptedMessage,
            logs: eventLogs.filter(log => log.receiptId === output.evmReceipt._id).map(log => ({
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
      lockTime: transaction.lockTime,
      ...transaction.header ? {
        block: {
          hash: transaction.header.hash,
          height: transaction.blockHeight,
          timestamp: transaction.header.timestamp,
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
    const {Transaction: RawTransaction, Input, Output, OutputScript} = this.app.qtuminfo.lib

    let transaction = await Transaction.findOne({
      where: {id},
      attributes: ['version', 'flag', 'lockTime'],
      transaction: this.ctx.state.transaction
    })
    if (!transaction) {
      return null
    }
    let witnesses = await Witness.findAll({
      where: {transactionId: id},
      attributes: ['inputIndex', 'script'],
      order: [['inputIndex', 'ASC'], ['witnessIndex', 'ASC']],
      transaction: this.ctx.state.transaction
    })

    let inputs = await TransactionOutput.findAll({
      where: {inputTxId: id},
      attributes: ['outputTxId', 'outputIndex', 'scriptSig', 'sequence'],
      order: [['inputIndex', 'ASC']],
      transaction: this.ctx.state.transaction
    })
    let outputs = await TransactionOutput.findAll({
      where: {outputTxId: id},
      attributes: ['value', 'scriptPubKey'],
      order: [['outputIndex', 'ASC']],
      transaction: this.ctx.state.transaction
    })

    return new RawTransaction({
      version: transaction.version,
      flag: transaction.flag,
      inputs: inputs.map((input, index) => new Input({
        prevTxId: input.outputTxId || Buffer.alloc(32),
        outputIndex: input.outputIndex == null ? 0xffffffff : input.outputIndex,
        scriptSig: input.scriptSig,
        sequence: input.sequence,
        witness: witnesses.filter(({inputIndex}) => inputIndex === index).map(({script}) => script)
      })),
      outputs: outputs.map(output => new Output({
        value: output.value,
        scriptPubKey: OutputScript.fromBuffer(output.scriptPubKey)
      })),
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
      order: [['blockHeight', 'DESC'], ['indexInBlock', 'DESC'], ['_id', 'DESC']],
      limit: count,
      transaction: this.ctx.state.transaction
    })).map(tx => tx.id)
  }

  async getMempoolTransactionAddresses(id) {
    const {Address, Transaction, BalanceChange} = this.ctx.model
    let balanceChanges = await BalanceChange.findAll({
      attributes: [],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          required: true,
          where: {id},
          attributes: []
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
    return balanceChanges.map(item => item.address.string)
  }

  async sendRawTransaction(data) {
    let client = new this.app.qtuminfo.rpc(this.app.config.qtuminfo.rpc)
    let id = await client.sendrawtransaction(data.toString('hex'))
    return Buffer.from(id, 'hex')
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
    let inputs = transaction.inputs.map((input, index) => this.transformInput(input, index, transaction, {brief}))
    let outputs = transaction.outputs.map((output, index) => this.transformOutput(output, index, {brief}))

    let [qrc20TokenTransfers, qrc721TokenTransfers] = await Promise.all([
      this.transformQRC20Transfers(transaction.outputs),
      this.transformQRC721Transfers(transaction.outputs)
    ])

    return {
      id: transaction.id.toString('hex'),
      ...brief ? {} : {
        hash: transaction.hash.toString('hex'),
        version: transaction.version,
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
        weight: transaction.weight,
        contractSpendSource: transaction.contractSpendSource && transaction.contractSpendSource.toString('hex'),
        contractSpends: transaction.contractSpends.length
          ? transaction.contractSpends.map(({inputs, outputs}) => ({
            inputs: inputs.map(input => ({
              address: input.address,
              addressHex: input.addressHex.toString('hex'),
              value: input.value.toString()
            })),
            outputs: outputs.map(output => ({
              address: output.address,
              addressHex: output.addressHex && output.addressHex.toString('hex'),
              value: output.value.toString()
            }))
          }))
          : undefined
      },
      qrc20TokenTransfers,
      qrc721TokenTransfers
    }
  }

  transformInput(input, index, transaction, {brief}) {
    const {InputScript, OutputScript} = this.app.qtuminfo.lib
    let scriptSig = InputScript.fromBuffer(input.scriptSig, {
      scriptPubKey: OutputScript.fromBuffer(input.scriptPubKey || Buffer.alloc(0)),
      witness: input.witness,
      isCoinbase: this.isCoinbase(input)
    })
    let result = {}
    if (scriptSig.type === InputScript.COINBASE) {
      result.coinbase = scriptSig.buffer.toString('hex')
    } else {
      result.prevTxId = input.prevTxId.toString('hex')
      result.outputIndex = input.outputIndex
      result.value = input.value.toString()
      result.address = input.address
      result.addressHex = input.addressHex && input.addressHex.toString('hex')
      result.isInvalidContract = input.isInvalidContract
      result.scriptSig = {type: scriptSig.type}
      if (!brief) {
        result.scriptSig.hex = input.scriptSig.toString('hex')
        result.scriptSig.asm = scriptSig.toString()
      }
    }
    if (!brief) {
      result.sequence = input.sequence
    }
    if (transaction.flag) {
      result.witness = input.witness.map(script => script.toString('hex'))
    }
    return result
  }

  transformOutput(output, index, {brief}) {
    const {OutputScript} = this.app.qtuminfo.lib
    let scriptPubKey = OutputScript.fromBuffer(output.scriptPubKey)
    let type = scriptPubKey.isEmpty() ? 'empty' : scriptPubKey.type
    let result = {
      value: output.value.toString(),
      address: output.address,
      addressHex: output.addressHex && output.addressHex.toString('hex'),
      isInvalidContract: output.isInvalidContract,
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
    if (!brief && output.evmReceipt) {
      result.receipt = {
        sender: output.evmReceipt.sender,
        gasUsed: output.evmReceipt.gasUsed,
        contractAddress: output.evmReceipt.contractAddress,
        contractAddressHex: output.evmReceipt.contractAddressHex.toString('hex'),
        excepted: output.evmReceipt.excepted,
        exceptedMessage: output.evmReceipt.exceptedMessage,
        logs: output.evmReceipt.logs.map(log => ({
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
      if (output.evmReceipt) {
        for (let {address, addressHex, topics, data, qrc20} of output.evmReceipt.logs) {
          if (qrc20 && topics.length === 3 && Buffer.compare(topics[0], TransferABI.id) === 0 && data.length === 32) {
            let [from, to] = await this.ctx.service.contract.transformHexAddresses([topics[1].slice(12), topics[2].slice(12)])
            result.push({
              address,
              addressHex: addressHex.toString('hex'),
              name: qrc20.name,
              symbol: qrc20.symbol,
              decimals: qrc20.decimals,
              ...from && typeof from === 'object' ? {from: from.string, fromHex: from.hex.toString('hex')} : {from},
              ...to && typeof to === 'object' ? {to: to.string, toHex: to.hex.toString('hex')} : {to},
              value: BigInt(`0x${data.toString('hex')}`).toString()
            })
          }
        }
      }
    }
    if (result.length) {
      return result
    }
  }

  async transformQRC721Transfers(outputs) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    let result = []
    for (let output of outputs) {
      if (output.evmReceipt) {
        for (let {address, addressHex, topics, qrc721} of output.evmReceipt.logs) {
          if (qrc721 && topics.length === 4 && Buffer.compare(topics[0], TransferABI.id) === 0) {
            let [from, to] = await this.ctx.service.contract.transformHexAddresses([topics[1].slice(12), topics[2].slice(12)])
            result.push({
              address,
              addressHex: addressHex.toString('hex'),
              name: qrc721.name,
              symbol: qrc721.symbol,
              ...from && typeof from === 'object' ? {from: from.string, fromHex: from.hex.toString('hex')} : {from},
              ...to && typeof to === 'object' ? {to: to.string, toHex: to.hex.toString('hex')} : {to},
              tokenId: topics[3].toString('hex')
            })
          }
        }
      }
    }
    if (result.length) {
      return result
    }
  }

  isCoinbase(input) {
    return Buffer.compare(input.prevTxId, Buffer.alloc(32)) === 0 && input.outputIndex === 0xffffffff
  }

  isCoinstake(transaction) {
    return transaction.inputs.length > 0 && Buffer.compare(transaction.inputs[0].prevTxId, Buffer.alloc(32)) !== 0
      && transaction.outputs.length >= 2 && transaction.outputs[0].value === 0n && transaction.outputs[0].scriptPubKey.length === 0
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
