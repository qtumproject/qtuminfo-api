module.exports = app => {
  const {INTEGER, BIGINT, CHAR, STRING, TEXT, ENUM} = app.Sequelize

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
    },
    ownerId: {
      type: BIGINT.UNSIGNED,
      defaultValue: '0'
    },
    createTxId: {
      type: STRING(32).BINARY,
      field: 'create_transaction_id',
      allowNull: true
    },
    createHeight: {
      type: INTEGER.UNSIGNED,
      allowNull: true
    }
  }, {freezeTableName: true, underscored: true, timestamps: false})

  Contract.associate = () => {
    const {Address, Receipt, ReceiptLog} = app.model
    Address.hasOne(Contract, {as: 'createdContracts', foreignKey: 'ownerId'})
    Contract.belongsTo(Address, {as: 'owner', foreignKey: 'ownerId'})
    Receipt.belongsTo(Contract, {as: 'contract', foreignKey: 'contractAddress'})
    Contract.hasMany(Receipt, {as: 'receipts', foreignKey: 'contractAddress'})
    ReceiptLog.belongsTo(Contract, {as: 'contract', foreignKey: 'address'})
    Contract.hasMany(ReceiptLog, {as: 'logs', foreignKey: 'address'})
  }

  return Contract
}
