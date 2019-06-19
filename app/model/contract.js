module.exports = app => {
  const {CHAR, TEXT, ENUM} = app.Sequelize

  let Contract = app.model.define('contract', {
    address: {
      type: CHAR(20).BINARY,
      primaryKey: true
    },
    addressString: CHAR(34),
    vm: {
      type: ENUM,
      values: ['evm', 'x86']
    },
    type: {
      type: ENUM,
      values: ['dgp', 'qrc20', 'qrc721'],
      allowNull: true
    },
    description: {
      type: TEXT,
      defaultValue: ''
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  Contract.associate = () => {
    const {Address, EvmReceipt: EVMReceipt, EvmReceiptLog: EVMReceiptLog} = app.model
    Contract.hasOne(Address, {as: 'originalAddress', foreignKey: 'data'})
    Address.belongsTo(Contract, {as: 'contract', foreignKey: 'data'})
    EVMReceipt.belongsTo(Contract, {as: 'contract', foreignKey: 'contractAddress'})
    Contract.hasMany(EVMReceipt, {as: 'evmReceipts', foreignKey: 'contractAddress'})
    EVMReceiptLog.belongsTo(Contract, {as: 'contract', foreignKey: 'address'})
    Contract.hasMany(EVMReceiptLog, {as: 'evmLogs', foreignKey: 'address'})
  }

  return Contract
}
