/* eslint-disable camelcase */
const addressTypes = {
  pubkeyhash: 1,
  scripthash: 2,
  witness_v0_keyhash: 3,
  witness_v0_scripthash: 4,
  contract: 0x80,
  evm_contract: 0x81,
  x86_contract: 0x82
}
/* eslint-enable camelcase*/
const addressTypeMap = {
  1: 'pubkeyhash',
  2: 'scripthash',
  3: 'witness_v0_keyhash',
  4: 'witness_v0_scripthash',
  0x80: 'contract',
  0x81: 'evm_contract',
  0x82: 'x86_contract'
}

module.exports = app => {
  const {INTEGER, BIGINT, CHAR, STRING, TEXT} = app.Sequelize

  let EVMReceipt = app.model.define('evm_receipt', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true,
      autoIncrement: true
    },
    transactionId: {
      type: BIGINT.UNSIGNED,
      unique: 'transaction'
    },
    outputIndex: {
      type: INTEGER.UNSIGNED,
      unique: 'transaction'
    },
    blockHeight: INTEGER.UNSIGNED,
    indexInBlock: INTEGER.UNSIGNED,
    senderType: {
      type: INTEGER(3).UNSIGNED,
      get() {
        let senderType = this.getDataValue('senderType')
        return addressTypeMap[senderType] || null
      },
      set(senderType) {
        if (senderType != null) {
          this.setDataValue('senderType', addressTypes[senderType] || 0)
        }
      }
    },
    senderData: STRING(32).BINARY,
    gasUsed: INTEGER.UNSIGNED,
    contractAddress: CHAR(20).BINARY,
    excepted: STRING(32),
    exceptedMessage: TEXT
  }, {freezeTableName: true, underscored: true, timestamps: false})

  EVMReceipt.associate = () => {
    const {Header, Transaction, TransactionOutput} = app.model
    EVMReceipt.belongsTo(Header, {as: 'header', foreignKey: 'blockHeight'})
    Transaction.hasMany(EVMReceipt, {as: 'evmReceipts', foreignKey: 'transactionId'})
    EVMReceipt.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId'})
    TransactionOutput.hasOne(EVMReceipt, {as: 'evmReceipt', foreignKey: 'transactionId'})
    EVMReceipt.belongsTo(TransactionOutput, {as: 'output', foreignKey: 'transactionId'})
  }

  return EVMReceipt
}
