module.exports = app => {
  const {BIGINT} = app.Sequelize

  let ContractSpend = app.model.define('contract_spend', {
    sourceId: {
      type: BIGINT.UNSIGNED,
      primaryKey: true
    },
    destId: BIGINT.UNSIGNED
  }, {freezeTableName: true, underscored: true, timestamps: false})

  ContractSpend.associate = () => {
    const {Transaction} = app.model
    Transaction.hasOne(ContractSpend, {as: 'contractSpendSource', foreignKey: 'sourceId'})
    ContractSpend.belongsTo(Transaction, {as: 'sourceTransaction', foreignKey: 'sourceId'})
    Transaction.hasMany(ContractSpend, {as: 'contractSpendDests', foreignKey: 'destId'})
    ContractSpend.belongsTo(Transaction, {as: 'destTransaction', foreignKey: 'destId'})
  }

  return ContractSpend
}
