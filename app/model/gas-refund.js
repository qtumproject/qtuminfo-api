module.exports = app => {
  const {INTEGER, CHAR} = app.Sequelize

  let GasRefund = app.model.define('gas_refund', {
    transactionId: {
      type: CHAR(32).BINARY,
      primaryKey: true
    },
    outputIndex: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    refundTxId: {
      type: CHAR(32).BINARY,
      field: 'refund_transaction_id',
      unique: 'refund'
    },
    refundIndex: {
      type: INTEGER.UNSIGNED,
      unique: 'refund'
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  GasRefund.associate = () => {
    const {Transaction, TransactionOutput} = app.model
    Transaction.hasMany(GasRefund, {as: 'refunds', foreignKey: 'transactionId', sourceKey: 'id'})
    GasRefund.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId', targetKey: 'id'})
    TransactionOutput.hasOne(GasRefund, {as: 'refund', foreignKey: 'transactionId', sourceKey: 'outputTxId'})
    GasRefund.belongsTo(TransactionOutput, {as: 'refund', foreignKey: 'transactionId', targetKey: 'outputTxId'})
    TransactionOutput.hasOne(GasRefund, {as: 'refundTo', foreignKey: 'refundTxId', sourceKey: 'outputTxId'})
    GasRefund.belongsTo(TransactionOutput, {as: 'refundTo', foreignKey: 'refundTxId', targetKey: 'outputTxId'})
  }

  return GasRefund
}
