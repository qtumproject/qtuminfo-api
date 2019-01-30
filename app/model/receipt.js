module.exports = app => {
  const {INTEGER, BIGINT, CHAR, ENUM} = app.Sequelize

  let Receipt = app.model.define('receipt', {
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
    blockHeight: INTEGER.UNSIGNED,
    indexInBlock: INTEGER.UNSIGNED,
    outputIndex: {
      type: INTEGER.UNSIGNED,
      unique: 'transaction'
    },
    gasUsed: INTEGER.UNSIGNED,
    contractAddress: CHAR(20).BINARY,
    excepted: {
      type: ENUM,
      values: [
        'None', 'Unknown', 'BadRLP', 'InvalidFormat', 'OutOfGasIntrinsic', 'InvalidSignature', 'InvalidNonce',
        'NotEnoughCash', 'OutOfGasBase', 'BlockGasLimitReached', 'BadInstruction', 'BadJumpDestination',
        'OutOfGas', 'OutOfStack', 'StackUnderflow', 'CreateWithValue', 'NoInformation'
      ]
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  Receipt.associate = () => {
    const {Header, Transaction, TransactionOutput} = app.model
    Receipt.belongsTo(Header, {as: 'header', foreignKey: 'blockHeight'})
    Transaction.hasMany(Receipt, {as: 'receipts', foreignKey: 'transactionId'})
    Receipt.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId'})
    TransactionOutput.hasOne(Receipt, {as: 'receipt', foreignKey: 'transactionId', sourceKey: 'outputTxId'})
    Receipt.belongsTo(TransactionOutput, {as: 'transactionOutput', foreignKey: 'transactionId', targetKey: 'outputTxId'})
  }

  return Receipt
}
