module.exports = app => {
  const {INTEGER, BIGINT, CHAR} = app.Sequelize

  let Block = app.model.define('block', {
    hash: {
      type: CHAR(32).BINARY,
      unique: true
    },
    height: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    size: INTEGER.UNSIGNED,
    weight: INTEGER.UNSIGNED,
    minerId: BIGINT.UNSIGNED,
    transactionsCount: INTEGER.UNSIGNED,
    contractTransactionsCount: INTEGER.UNSIGNED
  }, {freezeTableName: true, underscored: true, timestamps: false})

  Block.associate = () => {
    const {Header, Address} = app.model
    Header.hasOne(Block, {as: 'block', foreignKey: 'height'})
    Block.belongsTo(Header, {as: 'header', foreignKey: 'height'})
    Address.hasOne(Block, {as: 'minedBlocks', foreignKey: 'minerId'})
    Block.belongsTo(Address, {as: 'miner', foreignKey: 'minerId'})
  }

  return Block
}
