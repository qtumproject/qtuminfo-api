module.exports = app => {
  const {CHAR} = app.Sequelize

  let ContractSpend = app.model.define('contract_spend', {
    sourceTxId: {
      type: CHAR(32).BINARY,
      field: 'source_id',
      primaryKey: true
    },
    destTxId: {type: CHAR(32).BINARY, field: 'dest_id'}
  }, {freezeTableName: true, underscored: true, timestamps: false})

  ContractSpend.associate = () => {
    const {Transaction} = app.model
    Transaction.hasOne(ContractSpend, {as: 'contractSpendSource', foreignKey: 'sourceTxId', sourceKey: 'id'})
    ContractSpend.belongsTo(Transaction, {as: 'sourceTransaction', foreignKey: 'sourceTxId', targetKey: 'id'})
    Transaction.hasMany(ContractSpend, {as: 'contractSpendDests', foreignKey: 'destTxId', sourceKey: 'id'})
    ContractSpend.belongsTo(Transaction, {as: 'destTransaction', foreignKey: 'destTxId', targetKey: 'id'})
  }

  return ContractSpend
}
