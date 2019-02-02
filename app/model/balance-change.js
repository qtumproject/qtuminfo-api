module.exports = app => {
  const {INTEGER, BIGINT} = app.Sequelize

  let BalanceChange = app.model.define('balance_change', {
    transactionId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
    },
    blockHeight: INTEGER.UNSIGNED,
    indexInBlock: INTEGER.UNSIGNED,
    addressId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
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
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  BalanceChange.associate = () => {
    const {Header, Address, Transaction} = app.model
    Transaction.hasMany(BalanceChange, {as: 'balanceChanges', foreignKey: 'transactionId'})
    BalanceChange.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId'})
    Address.hasOne(BalanceChange, {as: 'balanceChanges', foreignKey: 'addressId'})
    BalanceChange.belongsTo(Address, {as: 'address', foreignKey: 'addressId'})
    BalanceChange.belongsTo(Header, {as: 'header', foreignKey: 'blockHeight'})
  }

  return BalanceChange
}
