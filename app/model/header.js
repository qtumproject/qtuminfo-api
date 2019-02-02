module.exports = app => {
  const {INTEGER, CHAR, BLOB} = app.Sequelize

  let Header = app.model.define('header', {
    hash: {
      type: CHAR(32).BINARY,
      unique: true
    },
    height: {
      type: INTEGER.UNSIGNED,
      primaryKey: true
    },
    version: INTEGER,
    prevHash: {
      type: CHAR(32).BINARY,
      defaultValue: Buffer.alloc(32)
    },
    merkleRoot: CHAR(32).BINARY,
    timestamp: INTEGER.UNSIGNED,
    bits: INTEGER.UNSIGNED,
    nonce: INTEGER.UNSIGNED,
    hashStateRoot: CHAR(32).BINARY,
    hashUTXORoot: {type: CHAR(32).BINARY, field: 'hash_utxo_root'},
    stakePrevTxId: {type: CHAR(32).BINARY, field: 'stake_prev_transaction_id'},
    stakeOutputIndex: INTEGER.UNSIGNED,
    signature: BLOB,
    chainwork: {
      type: CHAR(32).BINARY,
      get() {
        let chainwork = this.getDataValue('chainwork')
        return chainwork == null ? null : BigInt(`0x${chainwork.toString('hex')}`)
      },
      set(chainwork) {
        this.setDataValue(
          'chainwork',
          Buffer.from(chainwork.toString(16).padStart(64, '0'), 'hex')
        )
      }
    }
  }, {
    freezeTableName: true, underscored: true, timestamps: false,
    getterMethods: {
      difficulty() {
        function getTargetDifficulty(bits) {
          return (bits & 0xffffff) * 2 ** ((bits >>> 24) - 3 << 3)
        }
        return getTargetDifficulty(0x1d00ffff) / getTargetDifficulty(this.bits)
      }
    }
  })

  Header.prototype.isProofOfStake = function isProofOfStake() {
    return Buffer.compare(this.stakePrevTxId, Buffer.alloc(32)) !== 0 && this.stakeOutputIndex !== 0xffffffff
  }

  Header.associate = () => {
    Header.hasOne(Header, {as: 'prevHeader', foreignKey: 'height'})
    Header.hasOne(Header, {as: 'nextHeader', foreignKey: 'height'})
  }

  return Header
}
