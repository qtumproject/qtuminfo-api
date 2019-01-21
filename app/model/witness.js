module.exports = app => {
  const {INTEGER, CHAR, BLOB} = app.Sequelize

  let Witness = app.model.define('witness', {
    transactionId: {
      type: CHAR(32).BINARY,
      primaryKey: true
    },
    inputIndex: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    witnessIndex: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    script: BLOB
  }, {freezeTableName: true, underscored: true, timestamps: false})

  Witness.associate = () => {
    const {Transaction} = app.model
    Transaction.hasMany(Witness, {as: 'witnesses', foreignKey: 'transactionId', sourceKey: 'id'})
    Witness.belongsTo(Transaction, {foreignKey: 'transactionId', targetKey: 'id'})
  }

  return Witness
}
