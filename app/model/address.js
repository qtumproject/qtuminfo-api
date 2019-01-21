module.exports = app => {
  const {INTEGER, BIGINT, STRING, ENUM} = app.Sequelize

  const Address = app.model.define('address', {
    _id: {
      type: BIGINT.UNSIGNED,
      field: '_id',
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: ENUM,
      values: [
        'pubkeyhash', 'scripthash',
        'witness_v0_keyhash', 'witness_v0_scripthash',
        'contract', 'evm_contract', 'x86_contract'
      ],
      unique: 'address'
    },
    data: {
      type: STRING(32).BINARY,
      unique: 'address'
    },
    string: STRING(64),
    createHeight: INTEGER.UNSIGNED
  }, {freezeTableName: true, underscored: true, timestamps: false})

  return Address
}
