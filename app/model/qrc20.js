module.exports = app => {
  const {INTEGER, CHAR, BLOB} = app.Sequelize

  let QRC20 = app.model.define('qrc20', {
    contractAddress: {
      type: CHAR(20).BINARY,
      primaryKey: true
    },
    name: BLOB,
    symbol: BLOB,
    decimals: INTEGER(3).UNSIGNED,
    totalSupply: {
      type: CHAR(32).BINARY,
      get() {
        return BigInt(`0x${this.getDataValue('totalSupply').toString('hex')}`)
      },
      set(value) {
        return this.setDataValue(
          'totalSupply',
          Buffer.from(value.toString(16).padStart(64, '0'), 'hex')
        )
      }
    },
    version: {
      type: BLOB,
      allowNull: true
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  QRC20.associate = () => {
    const {Contract} = app.model
    Contract.hasOne(QRC20, {as: 'qrc20', foreignKey: 'contractAddress'})
    QRC20.belongsTo(Contract, {as: 'contract', foreignKey: 'contractAddress'})
  }

  return QRC20
}
