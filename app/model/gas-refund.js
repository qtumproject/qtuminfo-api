module.exports = app => {
  const {INTEGER, BIGINT} = app.Sequelize

  let GasRefund = app.model.define('gas_refund', {
    transactionId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
    },
    outputIndex: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    refundId: {
      type: BIGINT.UNSIGNED,
      unique: 'refund'
    },
    refundIndex: {
      type: INTEGER.UNSIGNED,
      unique: 'refund'
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  GasRefund.associate = () => {
    const {Transaction, TransactionOutput} = app.model
    Transaction.hasMany(GasRefund, {as: 'refunds', foreignKey: 'transactionId'})
    GasRefund.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId'})
    TransactionOutput.hasOne(GasRefund, {as: 'refund', foreignKey: 'transactionId'})
    GasRefund.belongsTo(TransactionOutput, {as: 'refund', foreignKey: 'transactionId'})
    Transaction.hasOne(GasRefund, {as: 'refundToTransaction', foreignKey: 'refundId'})
    GasRefund.belongsTo(Transaction, {as: 'refundToTransaction', foreignKey: 'refundId'})
    TransactionOutput.hasOne(GasRefund, {as: 'refundTo', foreignKey: 'refundId'})
    GasRefund.belongsTo(TransactionOutput, {as: 'refundTo', foreignKey: 'refundId'})
  }

  return GasRefund
}
