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
      type: CHAR(32).BINARY,
      unique: 'transaction'
    },
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
    const {Transaction} = app.model
    Transaction.hasMany(Receipt, {as: 'receipts', foreignKey: 'transactionId', sourceKey: 'id'})
    Receipt.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId', targetKey: 'id'})
  }

  return Receipt
}
