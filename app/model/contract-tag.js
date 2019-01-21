module.exports = app => {
  const {BIGINT, CHAR, STRING} = app.Sequelize

  let ContractTag = app.model.define('contract_tag', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true
    },
    contractAddress: CHAR(20).BINARY,
    tag: STRING(32)
  }, {freezeTableName: true, underscored: true, timestamps: false})

  ContractTag.associate = () => {
    const {Contract} = app.model
    Contract.hasMany(ContractTag, {as: 'tags', foreignKey: 'contractAddress'})
    ContractTag.belongsTo(Contract, {as: 'contract', foreignKey: 'contractAddress'})
  }

  return ContractTag
}
