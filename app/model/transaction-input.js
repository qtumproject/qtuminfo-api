module.exports = app => {
  const {INTEGER, BIGINT, BLOB} = app.Sequelize

  let TransactionInput = app.model.define('transaction_input', {
    transactionId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
    },
    inputIndex: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    scriptSig: {
      type: BLOB('medium'),
      field: 'scriptsig'
    },
    sequence: INTEGER.UNSIGNED,
    blockHeight: INTEGER.UNSIGNED,
    value: {
      type: BIGINT,
      get() {
        let value = this.getDataValue('value')
        return value == null ? null : BigInt(value)
      },
      set(value) {
        this.setDataValue('value', value.toString())
      }
    },
    addressId: BIGINT.UNSIGNED,
    outputId: BIGINT.UNSIGNED,
    outputIndex: INTEGER.UNSIGNED
  }, {freezeTableName: true, underscored: true, timestamps: false})

  TransactionInput.associate = () => {
    const {Address, Transaction, TransactionOutput} = app.model
    Transaction.hasMany(TransactionInput, {as: 'inputs', foreignKey: 'transactionId'})
    TransactionInput.belongsTo(Transaction, {as: 'inputTransaction', foreignKey: 'transactionId'})
    TransactionInput.belongsTo(Transaction, {as: 'outputTransaction', foreignKey: 'outputId'})
    TransactionInput.belongsTo(TransactionOutput, {as: 'output', foreignKey: 'outputId'})
    Address.hasMany(TransactionInput, {as: 'inputTxos', foreignKey: 'addressId'})
    TransactionInput.belongsTo(Address, {as: 'address', foreignKey: 'addressId'})
  }

  return TransactionInput
}
