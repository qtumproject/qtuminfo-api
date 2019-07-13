# Contract API

- [Contract API](#Contract-API)
  - [Contract Information](#Contract-Information)
  - [Contract Transactions](#Contract-Transactions)
  - [Contract Basic Transactions](#Contract-Basic-Transactions)
  - [Call Contract](#Call-Contract)
  - [Search Logs](#Search-Logs)


## Contract Information

**Request URL**
```
GET /contract/:contract
```

**Request**
```
GET /contract/6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7
```

**Response**
```json
{
  "address": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
  "addressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
  "vm": "evm",
  "type": "qrc20",
  "qrc20": {
    "name": "Bodhi Token",
    "symbol": "BOT",
    "decimals": 8,
    "totalSupply": "10000000000000000",
    "version": null,
    "holders": 33219,
    "transactions": 49622
  },
  "balance": "0",
  "totalReceived": "1086500002",
  "totalSent": "1086500002",
  "unconfirmed": "0",
  "qrc20Balances": [],
  "qrc721Balances": [],
  "transactionCount": 20572
}
```


## Contract Transactions

**Request URL**
```
GET /contract/:contract/txs
```

**Request Parameters**
| Name | Default | Description |
| - | - | - |
| [Pagination Parameters](#Pagination-Parameters) | | |
| [Block / Timestamp Filter Parameters](#Block--Timestamp-Filter-Parameters) | | |
| `reversed` | `true` | Return records reversed |

**Request**
```
GET /contract/6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7/txs?limit=10&offset=10
```

**Response**
```json
{
  "totalCount": 20572,
  "transactions": [
    "30563670995c63fb99301c32498bf6bd32059d2ed680491ddb87bde60c425b8c",
    "3ea37cf8fa77031a7470001e422a618e5307711693d1c1ed81fa90542ec6d977",
    "60ceddf045a6892fa95084313f551f980b087c115dbfe00f420b34b2929c78c0",
    "1ecd472c91f9786b34e419e46755c0543a044c2d35373fec7a24a23cc2444390",
    "4449fa6a69f7af45cc3e16bb56a0b29437041b80aebf0a1644151c98810232c8",
    "fdebd8f01a5815db6b60a256dfd2b58c51ae6c1ab25de948bed9d10c5cbd12da",
    "561b2c5401972f211384c9eaf5e5ab3002546dd424526295cf7261583ebe88b0",
    "7662edfd2f5514a9276df7d5fa779adbefebcb69ae5d6fc13eb32d212a4d6755",
    "e2b6a4c9fe45e96406b8434d0d0c7cd47ce4daff7044b1202ef35b45020aa6c4",
    "56ba80c4bf87ad00d4e63cbbe6f98799626bd2017dfa369656ba0ba11ed3a181"
  ]
}
```


## Contract Basic Transactions
List of transactions the contract is called.

**Request URL**
```
GET /contract/:contract/basic-txs
```

**Request Parameters**
| Name | Default | Description |
| - | - | - |
| [Pagination Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Pagination-Parameters) | | |
| [Block / Timestamp Filter Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Block--Timestamp-Filter-Parameters) | | |
| `reversed` | `true` | Return records reversed |

**Request**
```
GET /contract/6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7/basic-txs?limit=3&offset=10
```

**Response**
```json
{
  "totalCount": 19611,
  "transactions": [
    {
      "transactionId": "30563670995c63fb99301c32498bf6bd32059d2ed680491ddb87bde60c425b8c",
      "outputIndex": 0,
      "blockHeight": 398666,
      "blockHash": "d958ea4817a4511ac0cd601deb7a7380cbfc12fcde21e495157b913048f6aa81",
      "timestamp": 1561618976,
      "confirmations": 8658,
      "type": "evm_call",
      "gasLimit": 100000,
      "gasPrice": 40,
      "byteCode": "a9059cbb0000000000000000000000005dbf04d00b2e13b820db7afc1bdab3d4e303e8b6000000000000000000000000000000000000000000000000000000471ca54070",
      "outputValue": "0",
      "sender": "QgAwsgVLnREV4GYTP1zishNmsfrGHNYMM3",
      "gasUsed": 21614,
      "contractAddress": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
      "contractAddressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
      "excepted": "None",
      "exceptedMessage": "",
      "evmLogs": [
        {
          "address": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
          "addressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
          "topics": [
            "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "000000000000000000000000d6a6404a173de5604ed9a5334854786514c9c125",
            "0000000000000000000000005dbf04d00b2e13b820db7afc1bdab3d4e303e8b6"
          ],
          "data": "000000000000000000000000000000000000000000000000000000471ca54070"
        }
      ]
    },
    {
      "transactionId": "3ea37cf8fa77031a7470001e422a618e5307711693d1c1ed81fa90542ec6d977",
      "outputIndex": 1,
      "blockHeight": 398660,
      "blockHash": "b2b8f46df7d70c587ea2c81919a7cc4ec12b80441e4e3e36230e270f1fe25fe2",
      "timestamp": 1561618240,
      "confirmations": 8664,
      "type": "evm_call",
      "gasLimit": 250000,
      "gasPrice": 40,
      "byteCode": "a9059cbb000000000000000000000000d6a6404a173de5604ed9a5334854786514c9c125000000000000000000000000000000000000000000000000000000471ca54070",
      "outputValue": "0",
      "sender": "QhHMyzZRN4neqp5SjovBYUVJZneFPcRN9A",
      "gasUsed": 36614,
      "contractAddress": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
      "contractAddressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
      "excepted": "None",
      "exceptedMessage": "",
      "evmLogs": [
        {
          "address": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
          "addressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
          "topics": [
            "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "000000000000000000000000e2d4ff6a36f6307e1bc034695c8a24a11fc504c6",
            "000000000000000000000000d6a6404a173de5604ed9a5334854786514c9c125"
          ],
          "data": "000000000000000000000000000000000000000000000000000000471ca54070"
        }
      ]
    },
    {
      "transactionId": "60ceddf045a6892fa95084313f551f980b087c115dbfe00f420b34b2929c78c0",
      "outputIndex": 0,
      "blockHeight": 397976,
      "blockHash": "bce13e100201df586df2b24cb6db9bfdc2a92f7f6de60ce7d9e449a3dfa344f1",
      "timestamp": 1561519520,
      "confirmations": 9348,
      "type": "evm_call",
      "gasLimit": 100000,
      "gasPrice": 40,
      "byteCode": "a9059cbb0000000000000000000000002354d9f2bbd1d14e18287aa44ec4dc2b237040b600000000000000000000000000000000000000000000000000000010b1a72d00",
      "outputValue": "0",
      "sender": "QW9VdHxy9xbeMq74bnZ2NqVQTgiXDbELDy",
      "gasUsed": 51550,
      "contractAddress": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
      "contractAddressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
      "excepted": "None",
      "exceptedMessage": "",
      "evmLogs": [
        {
          "address": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
          "addressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
          "topics": [
            "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "00000000000000000000000068aeaaa277528eb19cf582784f8eda0090e13a0c",
            "0000000000000000000000002354d9f2bbd1d14e18287aa44ec4dc2b237040b6"
          ],
          "data": "00000000000000000000000000000000000000000000000000000010b1a72d00"
        }
      ]
    }
  ]
}
```


## Call Contract
Returns RPC `callcontract` result.

**Request URL**
```
GET /contract/:contract/call
```

**Request Parameters**
| Name | Type | Description |
| - | - | - |
| `data` | String | Hexadecimal data to send to contract |
| `sender` | String (optional) | Base58 P2PKH or 20-byte hexadecimal sender address |

**Request**
```
GET /contract/6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7/call?data=313ce567
```

**Response**
```json
{
  "address": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
  "executionResult": {
    "gasUsed": 21533,
    "excepted": "None",
    "newAddress": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
    "output": "0000000000000000000000000000000000000000000000000000000000000008",
    "codeDeposit": 0,
    "gasRefunded": 0,
    "depositSize": 0,
    "gasForDeposit": 0
  },
  "transactionReceipt": {
    "stateRoot": "d314a238f5431c7aeb8aea73790fce0d41bd5f8d7d46b37a1f5692bdf0d14acd",
    "gasUsed": 21533,
    "bloom": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "log": []
  }
}
```


## Search Logs

**Request URL**
```
GET /searchlogs
```

**Request Parameters**
| Name | Type | Description |
| - | - | - |
| [Pagination Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Pagination-Parameters) | | |
| [Block / Timestamp Filter Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Block--Timestamp-Filter-Parameters) | | |
| `contract` | Hexadecimal String (optional) | Filter contract address in log |
| `topic1` | Hexadecimal String (optional) | Filter first topic in log |
| `topic2` | Hexadecimal String (optional) | Filter second topic in log |
| `topic3` | Hexadecimal String (optional) | Filter third topic in log |
| `topic4` | Hexadecimal String (optional) | Filter fourth topic in log |

**Request**
```
GET /searchlogs?contract=056168620105d8f73a55d8c6542b565aea3665ec&topic1=2b37430897e8d659983fc8ae7ab83ad5b3be5a7db7ea0add5706731c2395f550
```

**Response**
```json
{
  "totalCount": 5,
  "logs": [
    {
      "transactionId": "4de540d9be565ac079c735d5d6b641b07be6eeb54f098bda460edf1553b08fe2",
      "outputIndex": 0,
      "blockHash": "cff6b7b7a5cc2e39228d0f3f010e94eaab7cc2bbddd99ce1860991262a653a9c",
      "blockHeight": 171565,
      "timestamp": 1528883856,
      "sender": "Qar3EUkbk6N9rRw2NtBj8Rsd55jbhj3wLV",
      "contractAddress": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "contractAddressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "address": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "topics": [
        "2b37430897e8d659983fc8ae7ab83ad5b3be5a7db7ea0add5706731c2395f550",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "0000000000000000000000009c3a312a838351572971a76aee8a195e3cd2fac7"
      ],
      "data": "00000000000000000000000000000000000000000000000000000001013e02b90000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "transactionId": "97e313601a26deef95267fc1152fcc7065b204fdd2c6df1bbe5bdcaa6053859d",
      "outputIndex": 1,
      "blockHash": "95c913bec498cdedc187f72849930cbfc624cdf8f7a45b1852d4702e923a3750",
      "blockHeight": 171576,
      "timestamp": 1528884928,
      "sender": "QiyuDBQuvw8PFNZ4nDU7ST7PBYFRmffrh6",
      "contractAddress": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "contractAddressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "address": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "topics": [
        "2b37430897e8d659983fc8ae7ab83ad5b3be5a7db7ea0add5706731c2395f550",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "000000000000000000000000f577d44a6e8585cfec280afb990ffc2b414b00ca"
      ],
      "data": "0000000000000000000000000000000000000000000000000000000d65e579a30000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "transactionId": "7f2a6c58440dd6de7f4742aff1969f842921c85024280bc08985b67f7d338c85",
      "outputIndex": 1,
      "blockHash": "69832b0dc05cbe2c2a35a5d0ae7a7670f8bd59ff3af1adfdae4a27d383c8a0ee",
      "blockHeight": 171578,
      "timestamp": 1528885280,
      "sender": "QXUANYANRVAeX2Tomy9W1FTV6LQxWiNc99",
      "contractAddress": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "contractAddressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "address": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "topics": [
        "2b37430897e8d659983fc8ae7ab83ad5b3be5a7db7ea0add5706731c2395f550",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "000000000000000000000000772e9f721feca4a06169938cdaf02584e6c2b529"
      ],
      "data": "00000000000000000000000000000000000000000000000000000006b2f2bcd10000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "transactionId": "1ab6822f1613e15fad017410c2a732dfb40d446ec2de95ea87e29796f13285c6",
      "outputIndex": 0,
      "blockHash": "592ae3cc803d6f7ea0f00a9af1eea484e0a308767cd45a2e75d2dcf7d6501ec6",
      "blockHeight": 171750,
      "timestamp": 1528909824,
      "sender": "QUkSNYKHFB1HsiwPzv7Lmgr62T16XwWNUd",
      "contractAddress": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "contractAddressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "address": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "topics": [
        "2b37430897e8d659983fc8ae7ab83ad5b3be5a7db7ea0add5706731c2395f550",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "000000000000000000000000595a41cd3d6f997beeb1a6fc52f978c28582d2e0"
      ],
      "data": "00000000000000000000000000000000000000000000000000000000949f2e2000000000000000000000000000000000000000000000000000000002540be400"
    },
    {
      "transactionId": "fab9e5bc74b504f81f3b32e2ec548746924616dbe9addf379405f38a7231cdb5",
      "outputIndex": 0,
      "blockHash": "99d238d7527a57b4bf3fc908a6a9996470a2b4ded75d30e76e46bfec57d3fe43",
      "blockHeight": 174491,
      "timestamp": 1529298256,
      "sender": "QaRg6Nrf5uMEggBGv8v8SpzdK6NqWZEf3F",
      "contractAddress": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "contractAddressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "address": "EHeMZYyi79Q6LajK7U9ywV7ETezrZzyxj8",
      "addressHex": "056168620105d8f73a55d8c6542b565aea3665ec",
      "topics": [
        "2b37430897e8d659983fc8ae7ab83ad5b3be5a7db7ea0add5706731c2395f550",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "000000000000000000000000979e8ffce8ba65cc610c22bf412841ab9861ab53"
      ],
      "data": "00000000000000000000000000000000000000000000000000000042fd7b60310000000000000000000000000000000000000000000000000000000000000000"
    }
  ]
}
```
