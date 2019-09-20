# Transaction API

- [Transaction API](#transaction-api)
  - [Transaction Information](#transaction-information)
  - [Raw Transaction](#raw-transaction)
  - [Send Raw Transaction](#send-raw-transaction)


## Transaction Information

**Request URL**
```
GET /tx/:id
```

**Request #1**
```
GET /tx/870c6b51d4160b52ce2bd506d0cd7a8438b8aac9afd03c4695f6ab9648bd02dc
```

**Response #1**
```json
{
  "id": "870c6b51d4160b52ce2bd506d0cd7a8438b8aac9afd03c4695f6ab9648bd02dc",
  "hash": "35559de74dd0d90908a25d39fd471829e351bffb3a3874bf54764b8d79f923aa",
  "version": 2,
  "lockTime": 246987,
  "blockHash": "8275eb2950279df37b8fa62076249ec7076cc030c860df004b8f3b03071bd00b",
  "inputs": [
    {
      "prevTxId": "14383d782ff38067d928acffabb31b46196966fc4a31d9de855a0cbf0535922d",
      "outputIndex": 0,
      "value": "910800",
      "address": "qc1ql8v7fp2j2uk7gjqv5rudlecv09e9x4jdwya5vd",
      "scriptSig": {
        "type": "witness_v0_keyhash",
        "hex": "",
        "asm": ""
      },
      "sequence": 4294967294,
      "witness": [
        "3044022030bf256669dd7fc6ca00cd393461c09b25421e59696208e8b5cbdbf71ff5050302200707c5d085d7ed06d1e6af9a3ca1c66b0c2e1a73189b24795afc80c8080236a101",
        "038c9dfdb356979a56d4b94063b8fb214295bd6a310b315564083a63795556ae93"
      ]
    },
    {
      "prevTxId": "14383d782ff38067d928acffabb31b46196966fc4a31d9de855a0cbf0535922d",
      "outputIndex": 1,
      "value": "1484306",
      "address": "QjHokSvA9ZGuVZhNWPsv2e8wmiLHnusurS",
      "scriptSig": {
        "type": "pubkeyhash",
        "hex": "47304402203db3536426e26c17a670ab3127109809f76ce366a55483a5ef9d556ea432cb240220546ae9f85150b21d3692fd89f61b947840d9b96886f830413e444536e97d3ecb0121027d026b7753f3f70ba972c801e9aed0c715dc68b89447bc0c5c18b32f25f3133c",
        "asm": "304402203db3536426e26c17a670ab3127109809f76ce366a55483a5ef9d556ea432cb240220546ae9f85150b21d3692fd89f61b947840d9b96886f830413e444536e97d3ecb[ALL] 027d026b7753f3f70ba972c801e9aed0c715dc68b89447bc0c5c18b32f25f3133c"
      },
      "sequence": 4294967294,
      "witness": []
    },
    {
      "prevTxId": "2e1a1985c50a33e342990a475888d74b79e3b122326fc585342a39c71cb5a76e",
      "outputIndex": 0,
      "value": "1910800",
      "address": "qc1ql8v7fp2j2uk7gjqv5rudlecv09e9x4jdwya5vd",
      "scriptSig": {
        "type": "witness_v0_keyhash",
        "hex": "",
        "asm": ""
      },
      "sequence": 4294967294,
      "witness": [
        "30440220301dafcfe858ca57a1500b64f4dc3331fbf65670169362f4add3204c05b0ccf302207090d1047ee3c509b58d88734fa11afe1c1933ac8026c42ce745c46f30df9f8401",
        "038c9dfdb356979a56d4b94063b8fb214295bd6a310b315564083a63795556ae93"
      ]
    }
  ],
  "outputs": [
    {
      "value": "305906",
      "address": "qc1ql8v7fp2j2uk7gjqv5rudlecv09e9x4jdwya5vd",
      "scriptPubKey": {
        "type": "witness_v0_keyhash",
        "hex": "0014f9d9e48552572de4480ca0f8dfe70c797253564d",
        "asm": "OP_0 f9d9e48552572de4480ca0f8dfe70c797253564d"
      },
      "spentTxId": "adcf52f3b284195fa8a7b2a4664252f3959ae618c321b35e1deffadec717f3dd",
      "spentIndex": 0
    },
    {
      "value": "3857200",
      "address": "qc1ql8v7fp2j2uk7gjqv5rudlecv09e9x4jdwya5vd",
      "scriptPubKey": {
        "type": "witness_v0_keyhash",
        "hex": "0014f9d9e48552572de4480ca0f8dfe70c797253564d",
        "asm": "OP_0 f9d9e48552572de4480ca0f8dfe70c797253564d"
      },
      "spentTxId": "adcf52f3b284195fa8a7b2a4664252f3959ae618c321b35e1deffadec717f3dd",
      "spentIndex": 1
    }
  ],
  "isCoinbase": false,
  "isCoinstake": false,
  "blockHeight": 246989,
  "confirmations": 159098,
  "timestamp": 1539787024,
  "inputValue": "4305906",
  "outputValue": "4163106",
  "refundValue": "0",
  "fees": "142800",
  "size": 518,
  "weight": 1421
}
```

**Request #2**
```
GET /tx/f56ea462337e4732e821eb7ceee5208a5c807fe5f918a342298eb152d75765ee
```

**Response #2**
```json
{
  "id": "f56ea462337e4732e821eb7ceee5208a5c807fe5f918a342298eb152d75765ee",
  "hash": "f56ea462337e4732e821eb7ceee5208a5c807fe5f918a342298eb152d75765ee",
  "version": 2,
  "lockTime": 168583,
  "blockHash": "67833537107b014a9e3a1666c99f02708a788f81a942a6fa500a0e7c5e5446c4",
  "inputs": [
    {
      "prevTxId": "732fe02e70095557854e419d472388cccc3f8fc00db4b9b1820b9a51c0f1b905",
      "outputIndex": 1,
      "value": "500000000000",
      "address": "QccDD4Vk5Tc5Y84ydAcj4hpNkahYcsCsRq",
      "scriptSig": {
        "type": "pubkeyhash",
        "hex": "483045022100cc4208e82c8d6aadbb6e5ed1465ca1675db472f9e72cef528d52973e632bbafc02202d2a894267a2d3cd1e647ef3a3206d83228c71006a4c3544616dcb58d0b9dbf9012103afb25cf82520925420f07f4b13b17efa0d7868606c66adf7979e15fb3f21721e",
        "asm": "3045022100cc4208e82c8d6aadbb6e5ed1465ca1675db472f9e72cef528d52973e632bbafc02202d2a894267a2d3cd1e647ef3a3206d83228c71006a4c3544616dcb58d0b9dbf9[ALL] 03afb25cf82520925420f07f4b13b17efa0d7868606c66adf7979e15fb3f21721e"
      },
      "sequence": 4294967294
    }
  ],
  "outputs": [
    {
      "value": "399989865575",
      "address": "QccDD4Vk5Tc5Y84ydAcj4hpNkahYcsCsRq",
      "scriptPubKey": {
        "type": "pubkeyhash",
        "hex": "76a914af8cf283ef7d1ad9fa824bd4de564f3b1b9fcd7a88ac",
        "asm": "OP_DUP OP_HASH160 af8cf283ef7d1ad9fa824bd4de564f3b1b9fcd7a OP_EQUALVERIFY OP_CHECKSIG"
      },
      "spentTxId": "eae244f9996cf4b50bf3c35d001aa1d8f60fbd9b7da9e0a37ad4ebb336082a6e",
      "spentIndex": 0
    },
    {
      "value": "100000000000",
      "address": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
      "addressHex": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
      "scriptPubKey": {
        "type": "evm_call",
        "hex": "01040390d003012824d0821b0e0000000000000000000000000000000000000000000000000000000000000001140439fcc94493859d9146b6b9a92daa6d6d7b581dc2",
        "asm": "4 250000 40 d0821b0e0000000000000000000000000000000000000000000000000000000000000001 0439fcc94493859d9146b6b9a92daa6d6d7b581d OP_CALL"
      },
      "spentTxId": "4f263d6cfa910e5b763edb1349d34d9a0c97e1ad5a3eb9fd6b2347155da5a246",
      "spentIndex": 1,
      "receipt": {
        "sender": "QccDD4Vk5Tc5Y84ydAcj4hpNkahYcsCsRq",
        "gasUsed": 94008,
        "contractAddress": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
        "contractAddressHex": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
        "excepted": "None",
        "exceptedMessage": "",
        "logs": [
          {
            "address": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
            "addressHex": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
            "topics": [
              "fb425c0bd6840437c799f5176836b0ebc76d79351a6981cc4e5fbb0cdbf3e185",
              "0000000000000000000000000000000000000000000000000000000000000000",
              "0000000000000000000000000439fcc94493859d9146b6b9a92daa6d6d7b581d",
              "000000000000000000000000af8cf283ef7d1ad9fa824bd4de564f3b1b9fcd7a"
            ],
            "data": "0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000174876e8005154554d00000000000000000000000000000000000000000000000000000000"
          }
        ]
      }
    }
  ],
  "isCoinbase": false,
  "isCoinstake": false,
  "blockHeight": 168584,
  "confirmations": 237507,
  "timestamp": 1528460544,
  "inputValue": "500000000000",
  "outputValue": "499989865575",
  "refundValue": "6239680",
  "fees": "3894745",
  "size": 268,
  "weight": 1072,
  "contractSpends": [
    {
      "inputs": [
        {
          "address": "056168620105d8f73a55d8c6542b565aea3665ec",
          "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
          "value": "202560000000"
        },
        {
          "address": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
          "addressHex": "0439fcc94493859d9146b6b9a92daa6d6d7b581d",
          "value": "100000000000"
        }
      ],
      "outputs": [
        {
          "address": "056168620105d8f73a55d8c6542b565aea3665ec",
          "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
          "value": "302560000000"
        }
      ]
    }
  ]
}
```

**Request #3**
```
GET /tx/ebf05fbf8dcf10f03a73331abd1ea934d66c03a72ee4a57addeab0225ad9289f
```

**Response #3**
```json
{
  "id": "ebf05fbf8dcf10f03a73331abd1ea934d66c03a72ee4a57addeab0225ad9289f",
  "hash": "ebf05fbf8dcf10f03a73331abd1ea934d66c03a72ee4a57addeab0225ad9289f",
  "version": 2,
  "lockTime": 406076,
  "blockHash": "7fae36223bbd95b82d9899b767d4289d4fe4cd2b5ee6e248c16694d7352b3b94",
  "inputs": [
    {
      "prevTxId": "6ae7a9cf0763b13185b23f345180607caa71c1cacff9ef6e4a9f9c068bd45c62",
      "outputIndex": 1,
      "value": "97820400",
      "address": "QeZjXLEyqKgUNyoXcTCC2nxVx77cSnmpcy",
      "scriptSig": {
        "type": "pubkeyhash",
        "hex": "47304402206897a7a9502314e3d5f0d62e2fae485746cbbd9524229ab42187f5a766c9ec1d02206701c50e1947dd08c4440db66bf8a534e4a2c95a0779cf1963c229a4ebcc9bda012103d2afef396be37192a1137fe103ace0dd2e861088d0634ffd792d4d43a8bed770",
        "asm": "304402206897a7a9502314e3d5f0d62e2fae485746cbbd9524229ab42187f5a766c9ec1d02206701c50e1947dd08c4440db66bf8a534e4a2c95a0779cf1963c229a4ebcc9bda[ALL] 03d2afef396be37192a1137fe103ace0dd2e861088d0634ffd792d4d43a8bed770"
      },
      "sequence": 4294967294
    }
  ],
  "outputs": [
    {
      "value": "0",
      "address": "EfDYuWmSUbZPaAe2qzeWurcDGobSnhYa6F",
      "addressHex": "f2033ede578e17fa6231047265010445bca8cf1c",
      "scriptPubKey": {
        "type": "evm_call",
        "hex": "0104032cc900012844a9059cbb000000000000000000000000bf4e5cb019865cde870642bf2a2dfb375789c23b00000000000000000000000000000000000000000000000000000002540be40014f2033ede578e17fa6231047265010445bca8cf1cc2",
        "asm": "4 51500 40 a9059cbb000000000000000000000000bf4e5cb019865cde870642bf2a2dfb375789c23b00000000000000000000000000000000000000000000000000000002540be400 f2033ede578e17fa6231047265010445bca8cf1c OP_CALL"
      },
      "receipt": {
        "sender": "QeZjXLEyqKgUNyoXcTCC2nxVx77cSnmpcy",
        "gasUsed": 36359,
        "contractAddress": "f2033ede578e17fa6231047265010445bca8cf1c",
        "contractAddressHex": "f2033ede578e17fa6231047265010445bca8cf1c",
        "excepted": "None",
        "exceptedMessage": "",
        "logs": [
          {
            "address": "f2033ede578e17fa6231047265010445bca8cf1c",
            "addressHex": "f2033ede578e17fa6231047265010445bca8cf1c",
            "topics": [
              "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              "000000000000000000000000c50541b82f4cda2f61cbbc219595c79ffdb4f2fa",
              "000000000000000000000000bf4e5cb019865cde870642bf2a2dfb375789c23b"
            ],
            "data": "00000000000000000000000000000000000000000000000000000002540be400"
          }
        ]
      }
    },
    {
      "value": "95640800",
      "address": "QeZjXLEyqKgUNyoXcTCC2nxVx77cSnmpcy",
      "scriptPubKey": {
        "type": "pubkeyhash",
        "hex": "76a914c50541b82f4cda2f61cbbc219595c79ffdb4f2fa88ac",
        "asm": "OP_DUP OP_HASH160 c50541b82f4cda2f61cbbc219595c79ffdb4f2fa OP_EQUALVERIFY OP_CHECKSIG"
      }
    }
  ],
  "isCoinbase": false,
  "isCoinstake": false,
  "blockHeight": 406077,
  "confirmations": 16,
  "timestamp": 1562675696,
  "inputValue": "97820400",
  "outputValue": "95640800",
  "refundValue": "605640",
  "fees": "1573960",
  "size": 299,
  "weight": 1196,
  "qrc20TokenTransfers": [
    {
      "address": "f2033ede578e17fa6231047265010445bca8cf1c",
      "addressHex": "f2033ede578e17fa6231047265010445bca8cf1c",
      "name": "QCASH",
      "symbol": "QC",
      "decimals": 8,
      "from": "QeZjXLEyqKgUNyoXcTCC2nxVx77cSnmpcy",
      "to": "Qe3X3dVeVocnd6f9rsCVJyTmW1Usc8YhLE",
      "value": "10000000000"
    }
  ]
}
```


## Raw Transaction

**Request URL**
```
GET /raw-tx/:id
```

**Request**
```
GET /tx/ebf05fbf8dcf10f03a73331abd1ea934d66c03a72ee4a57addeab0225ad9289f
```

**Response**
```
0200000001625cd48b069c9f4a6eeff9cfcac171aa7c608051343fb28531b16307cfa9e76a010000006a47304402206897a7a9502314e3d5f0d62e2fae485746cbbd9524229ab42187f5a766c9ec1d02206701c50e1947dd08c4440db66bf8a534e4a2c95a0779cf1963c229a4ebcc9bda012103d2afef396be37192a1137fe103ace0dd2e861088d0634ffd792d4d43a8bed770feffffff020000000000000000630104032cc900012844a9059cbb000000000000000000000000bf4e5cb019865cde870642bf2a2dfb375789c23b00000000000000000000000000000000000000000000000000000002540be40014f2033ede578e17fa6231047265010445bca8cf1cc2e05cb305000000001976a914c50541b82f4cda2f61cbbc219595c79ffdb4f2fa88ac3c320600
```


## Send Raw Transaction

**Request URL**
```
POST /tx/send
```

**Request Parameters**
| Name | Type | Description |
| - | - | - |
| `rawtx` | String | Raw Transaction Hex String |
<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
              <code>rawtx</code>
            </td>
            <td>
              String
            </td>
            <td>Raw Transaction Hex String</td>
        </tr>
    </tbody>
</table>

**Request**
```
POST /tx/send
```

**Request Body**
```
rawtx=02000000014727d9d3560b94b0cf1c10daea43920c24fa8451a75f2d5f69f6f585726fcb15000000006a47304402202ac3b7fd62837722fd4ab1dfdfe7d069dcaad348c7a039ed3cfc473ef435a167022033ae815fbcd8c04b2fb98d611a395dd96da757cae94bca780010bd9db6bda7230121027f2fac6638798fe79696bffba971976b325753541d24fc0a920b617b5f23815bfeffffff02c00064f6070000001976a9140588712645b0c536d59c9d7198f492cf6d2eb3cf88ac263f61e9030000001976a91421b92d11d3b7cbe5e76252eab7db8bd5ac47a0ae88ac781a0600
```

**Response**
```json
{
  "status": 0,
  "id": "56daa4ae91c07b84aad5bcab74bfe0c12e14b228ed755c2aaabc6b027f8698a0"
}
/// or
{
  "status": 1,
  "message": "{error message}"
}
```
