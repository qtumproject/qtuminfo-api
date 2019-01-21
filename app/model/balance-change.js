module.exports = app => {
  const {BIGINT} = app.Sequelize

  let BalanceChange = app.model.define('balance_change', {
    transactionId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
    },
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
        return this.setDataValue('value', value.toString())
      }
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  BalanceChange.associate = () => {
    const {Address, Transaction} = app.model
    Transaction.hasMany(BalanceChange, {as: 'balanceChanges', foreignKey: 'transactionId'})
    BalanceChange.belongsTo(Transaction, {as: 'transaction', foreignKey: 'transactionId'})
    Address.hasOne(BalanceChange, {as: 'balanceChanges', foreignKey: 'addressId'})
    BalanceChange.belongsTo(Address, {as: 'address', foreignKey: 'addressId'})
  }

  return BalanceChange
}
