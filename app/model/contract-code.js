module.exports = app => {
  const {CHAR, BLOB, TEXT} = app.Sequelize

  let ContractCode = app.model.define('contract_code', {
    contractAddress: {
      type: CHAR(20).BINARY,
      primaryKey: true
    },
    code: BLOB,
    source: {
      type: TEXT('long'),
      allowNull: true
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  ContractCode.associate = () => {
    const {Contract} = app.model
    Contract.hasOne(ContractCode, {as: 'code', foreignKey: 'contractAddress'})
    ContractCode.belongsTo(Contract, {as: 'contract', foreignKey: 'contractAddress'})
  }

  return ContractCode
}
