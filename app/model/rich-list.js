module.exports = app => {
  const {BIGINT} = app.Sequelize

  let RichList = app.model.define('rich_list', {
    addressId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
    },
    balance: {
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

  RichList.associate = () => {
    const {Address} = app.model
    Address.hasOne(RichList, {as: 'balance', foreignKey: 'addressId'})
    RichList.belongsTo(Address, {as: 'address', foreignKey: 'addressId'})
  }

  return RichList
}
