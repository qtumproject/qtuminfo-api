module.exports = app => {
  const {INTEGER, CHAR} = app.Sequelize

  let QRC20Statistics = app.model.define('qrc20_statistics', {
    contractAddress: {
      type: CHAR(20).BINARY,
      primaryKey: true
    },
    holders: INTEGER.UNSIGNED,
    transactions: INTEGER.UNSIGNED
  }, {freezeTableName: true, underscored: true, timestamps: false})

  QRC20Statistics.associate = () => {
    const {Qrc20: QRC20} = app.model
    QRC20Statistics.belongsTo(QRC20, {as: 'qrc20', foreignKey: 'contractAddress'})
    QRC20.hasOne(QRC20Statistics, {as: 'statistics', foreignKey: 'contractAddress'})
  }

  return QRC20Statistics
}
