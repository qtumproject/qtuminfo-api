module.exports = app => {
  const {INTEGER, BIGINT, CHAR} = app.Sequelize

  let Transaction = app.model.define('transaction', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true,
      autoIncrement: true
    },
    id: {
      type: CHAR(32).BINARY,
      unique: true
    },
    hash: CHAR(32).BINARY,
    version: INTEGER,
    flag: INTEGER(3).UNSIGNED,
    lockTime: INTEGER.UNSIGNED,
    blockHeight: INTEGER.UNSIGNED,
    indexInBlock: INTEGER.UNSIGNED,
    size: INTEGER.UNSIGNED,
    weight: INTEGER.UNSIGNED
  }, {freezeTableName: true, underscored: true, timestamps: false})

  Transaction.associate = () => {
    const {Header, Block} = app.model
    Header.hasMany(Transaction, {as: 'transactions', foreignKey: 'blockHeight'})
    Transaction.belongsTo(Header, {as: 'header', foreignKey: 'blockHeight'})
    Block.hasMany(Transaction, {as: 'transactions', foreignKey: 'blockHeight'})
    Transaction.belongsTo(Block, {as: 'block', foreignKey: 'blockHeight'})
  }

  return Transaction
}
