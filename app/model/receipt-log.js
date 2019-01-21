module.exports = app => {
  const {INTEGER, BIGINT, CHAR, STRING, BLOB} = app.Sequelize

  let ReceiptLog = app.model.define('receipt_log', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true,
      autoIncrement: true
    },
    receiptId: BIGINT.UNSIGNED,
    logIndex: INTEGER.UNSIGNED,
    address: CHAR(20).BINARY,
    topic1: STRING(32).BINARY,
    topic2: STRING(32).BINARY,
    topic3: STRING(32).BINARY,
    topic4: STRING(32).BINARY,
    data: BLOB
  }, {freezeTableName: true, underscored: true, timestamps: false})

  ReceiptLog.associate = () => {
    const {Receipt} = app.model
    Receipt.hasMany(ReceiptLog, {as: 'logs', foreignKey: 'receiptId'})
    ReceiptLog.belongsTo(Receipt, {as: 'receipt', foreignKey: 'receiptId'})
  }

  return ReceiptLog
}
