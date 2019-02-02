module.exports = app => {
  const {INTEGER, BIGINT, BOOLEAN, STRING, BLOB} = app.Sequelize

  let TransactionOutput = app.model.define('transaction_output', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true
    },
    outputTxId: {
      type: STRING(32).BINARY,
      field: 'output_transaction_id',
      primaryKey: true
    },
    outputIndex: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    scriptPubKey: {
      type: BLOB('medium'),
      field: 'scriptpubkey',
      allowNull: true
    },
    outputHeight: {
      type: INTEGER.UNSIGNED,
      allowNull: true
    },
    inputTxId: {
      type: STRING(32).BINARY,
      field: 'input_transaction_id',
      allowNull: true
    },
    inputIndex: {
      type: INTEGER.UNSIGNED,
      allowNull: true
    },
    scriptSig: {
      type: BLOB('medium'),
      field: 'scriptsig',
      allowNull: true
    },
    sequence: {
      type: INTEGER.UNSIGNED,
      allowNull: true
    },
    inputHeight: {
      type: INTEGER.UNSIGNED,
      allowNull: true
    },
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
    isStake: BOOLEAN
  }, {freezeTableName: true, underscored: true, timestamps: false})

  TransactionOutput.associate = () => {
    const {Address, Transaction} = app.model
    Transaction.hasMany(TransactionOutput, {as: 'outputs', foreignKey: 'outputTxId', sourceKey: 'id'})
    TransactionOutput.belongsTo(Transaction, {as: 'outputTransaction', foreignKey: 'outputTxId', targetKey: 'id'})
    Transaction.hasMany(TransactionOutput, {as: 'inputs', foreignKey: 'inputTxId', sourceKey: 'id'})
    TransactionOutput.belongsTo(Transaction, {as: 'inputTransaction', foreignKey: 'inputTxId', targetKey: 'id'})
    Address.hasMany(TransactionOutput, {as: 'txos', foreignKey: 'addressId'})
    TransactionOutput.belongsTo(Address, {as: 'address', foreignKey: 'addressId'})
  }

  return TransactionOutput
}
