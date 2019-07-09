module.exports = app => {
  const {INTEGER, BIGINT, CHAR, STRING, BLOB} = app.Sequelize

  let EVMReceiptLog = app.model.define('evm_receipt_log', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true,
      autoIncrement: true
    },
    receiptId: BIGINT.UNSIGNED,
    logIndex: INTEGER.UNSIGNED,
    blockHeight: INTEGER.UNSIGNED,
    address: CHAR(20).BINARY,
    topic1: {
      type: STRING(32).BINARY,
      allowNull: true
    },
    topic2: {
      type: STRING(32).BINARY,
      allowNull: true
    },
    topic3: {
      type: STRING(32).BINARY,
      allowNull: true
    },
    topic4: {
      type: STRING(32).BINARY,
      allowNull: true
    },
    data: BLOB
  }, {freezeTableName: true, underscored: true, timestamps: false})

  EVMReceiptLog.associate = () => {
    const {EvmReceipt: EVMReceipt} = app.model
    EVMReceipt.hasMany(EVMReceiptLog, {as: 'logs', foreignKey: 'receiptId'})
    EVMReceiptLog.belongsTo(EVMReceipt, {as: 'receipt', foreignKey: 'receiptId'})
  }

  return EVMReceiptLog
}
