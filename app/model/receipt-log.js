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

  ReceiptLog.associate = () => {
    const {Receipt} = app.model
    Receipt.hasMany(ReceiptLog, {as: 'logs', foreignKey: 'receiptId'})
    ReceiptLog.belongsTo(Receipt, {as: 'receipt', foreignKey: 'receiptId'})
  }

  return ReceiptLog
}
