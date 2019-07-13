# QRC20 API

- [QRC20 API](#QRC20-API)
  - [QRC20 list](#QRC20-list)
  - [QRC20 Transaction list](#QRC20-Transaction-list)


## QRC20 list
List all qrc20 tokens order by transfer transactions count.

**Request URL**
```
GET /qrc20
```

**Request Parameter**
| Name | Default | Description |
| - | - | - |
| [Pagination Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Pagination-Parameters) | | |

**Request**
```
GET /qrc20?limit=10&offset=0
```

**Response**
```json
{
  "totalCount": 184,
  "tokens": [
    {
      "address": "EfDYuWmSUbZPaAe2qzeWurcDGobSnhYa6F",
      "addressHex": "f2033ede578e17fa6231047265010445bca8cf1c",
      "name": "QCASH",
      "symbol": "QC",
      "decimals": 8,
      "totalSupply": "1000000000000000000",
      "version": null,
      "holders": 22612,
      "transactions": 133347
    },
    {
      "address": "EgLnhSREpcpnrmSHp3uKQT1nPjhiV7DEx9",
      "addressHex": "fe59cbc1704e89a698571413a81f0de9d8f00c69",
      "name": "INK Coin",
      "symbol": "INK",
      "decimals": 9,
      "totalSupply": "1000000000000000000",
      "version": null,
      "holders": 33588,
      "transactions": 75033
    },
    {
      "address": "ERPLiez3T9MQ21tz9B8kLmajK7xQWrkS6B",
      "addressHex": "5a4b7889cad562d6c099bf877c8f5e3d66d579f8",
      "name": "FENIX.CASH",
      "symbol": "FENIX",
      "decimals": 18,
      "totalSupply": "432000000000000000000000000",
      "version": null,
      "holders": 58118,
      "transactions": 60343
    },
    {
      "address": "ER8xXcVq6HmXLfPUKmQpusvtxoHoAM9uC3",
      "addressHex": "57931faffdec114056a49adfcaa1caac159a1a25",
      "name": "SpaceCash",
      "symbol": "SPC",
      "decimals": 8,
      "totalSupply": "100000000000000000",
      "version": null,
      "holders": 12375,
      "transactions": 50625
    },
    {
      "address": "ESxZUjVBnbeeEyx7E1WhwviAujfRmfCgjU",
      "addressHex": "6b8bf98ff497c064e8f0bde13e0c4f5ed5bf8ce7",
      "name": "Bodhi Token",
      "symbol": "BOT",
      "decimals": 8,
      "totalSupply": "10000000000000000",
      "version": null,
      "holders": 33219,
      "transactions": 49624
    },
    {
      "address": "EfFoUtTKMVcWHKJeByQate1jdCkYTXHaBC",
      "addressHex": "f2703e93f87b846a7aacec1247beaec1c583daa4",
      "name": "Hyperpay",
      "symbol": "HPY",
      "decimals": 8,
      "totalSupply": "265000000000000000",
      "version": null,
      "holders": 7269,
      "transactions": 42171
    },
    {
      "address": "EPr1RrYoNpHPiHFV1R1mHjJf6TfzFJXuTd",
      "addressHex": "49665919e437a4bedb92faa45ed33ebb5a33ee63",
      "name": "AWARE Token",
      "symbol": "AWR",
      "decimals": 8,
      "totalSupply": "100000000000000000",
      "version": "1.0",
      "holders": 1967,
      "transactions": 37871
    },
    {
      "address": "EZRg6Xhqe3V7Sva29irwZHj9LwcoknARtR",
      "addressHex": "b27d7bf95b03e02b55d5eb63d3f1692762101bf9",
      "name": "Halal Chain",
      "symbol": "HLC",
      "decimals": 9,
      "totalSupply": "1000000000000000000",
      "version": null,
      "holders": 5404,
      "transactions": 30136
    },
    {
      "address": "EMUWzpCfRZbgyQZd6oHdkXsuaJgVy8ncdL",
      "addressHex": "2f65a0af11d50d2d15962db39d7f7b0619ed55ae",
      "name": "MED TOKEN",
      "symbol": "MED",
      "decimals": 8,
      "totalSupply": "1000000000000000000",
      "version": null,
      "holders": 4801,
      "transactions": 27933
    },
    {
      "address": "ETdR6C6aeX5MqCkNBYNBdTPa5rEdc1khne",
      "addressHex": "72e531e37c31ecbe336208fd66e93b48df3af420",
      "name": "Luna Stars",
      "symbol": "LSTR",
      "decimals": 8,
      "totalSupply": "3800000000000000000",
      "version": null,
      "holders": 13374,
      "transactions": 26867
    }
  ]
}
```


## QRC20 Transaction list

**Request URL**
```
GET /qrc20/:token/txs
```

**Request Parameter**
| Name | Default | Description |
| - | - | - |
| [Pagination Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Pagination-Parameters) | | |
| [Block / Timestamp Filter Parameters](https://github.com/qtumproject/qtuminfo-api/blob/master/README.md#Block--Timestamp-Filter-Parameters) | | |
| `reversed` | `true` | Return records reversed |

**Request**
```
GET /qrc20/f2033ede578e17fa6231047265010445bca8cf1c/txs?limit=5&offset=0
```

**Response**
```json
{
  "totalCount": 133563,
  "transactions": [
    {
      "transactionId": "56a76c38966c663bafef3247c2475af45c8d1c81adaa7a27773b05853063d06f",
      "outputIndex": 0,
      "blockHeight": 408403,
      "blockHash": "7feac3a08ae8f5561c39e3c1a9c4c5d79c124bf8d79a671145db6933fdb08266",
      "timestamp": 1563009408,
      "from": "QWSTGRwdScLfdr6agUqR4G7ow4Mjc4e5re",
      "to": "QanTJBm9NTXqiFYNe9rWLi3dJPSTfoHZrL",
      "value": "373300000000"
    },
    {
      "transactionId": "b3cff5534d7e7720edb177b0cf36fad1c6839926116bc39175e48ef541b0718a",
      "outputIndex": 0,
      "blockHeight": 408402,
      "blockHash": "f74fa86a8bb9eee226eebcdac76e10e25f966b791bc05b2ab16db9e00b396af6",
      "timestamp": 1563009328,
      "from": "QUZ6sqXN5dXWUAQniy9uPVpC3QjyXhoznz",
      "to": "QhXS93hPpUcjoDxo192bmrbDubhH5UoQDp",
      "value": "143458584740"
    },
    {
      "transactionId": "8b79a1fc8f1381ff05fcc4f53430a6be072ca4ba5148037a48ab2b330b66dc60",
      "outputIndex": 0,
      "blockHeight": 408402,
      "blockHash": "f74fa86a8bb9eee226eebcdac76e10e25f966b791bc05b2ab16db9e00b396af6",
      "timestamp": 1563009328,
      "from": "QaDcm9UeGveyVWY9UiNRN9cTsFMe8v2k2t",
      "to": "QhXS93hPpUcjoDxo192bmrbDubhH5UoQDp",
      "value": "1097495687249"
    },
    {
      "transactionId": "28948af9bee1cba22b2af04fc35d47bcb5b4dd5d2a817168a4238d141d7f5a62",
      "outputIndex": 1,
      "blockHeight": 408398,
      "blockHash": "4da2cc6042360ade09b4a48b2512fb8e950c97d196e6729718d7301296f0bc3e",
      "timestamp": 1563009056,
      "from": "QWSTGRwdScLfdr6agUqR4G7ow4Mjc4e5re",
      "to": "QUZ6sqXN5dXWUAQniy9uPVpC3QjyXhoznz",
      "value": "70729292370"
    },
    {
      "transactionId": "801c94a6b6fa331f517b3dd85dd5ba778b541e913c6590feb9e26590cfad5050",
      "outputIndex": 1,
      "blockHeight": 408398,
      "blockHash": "4da2cc6042360ade09b4a48b2512fb8e950c97d196e6729718d7301296f0bc3e",
      "timestamp": 1563009056,
      "from": "QWSTGRwdScLfdr6agUqR4G7ow4Mjc4e5re",
      "to": "QTSbcq4y5i4SgxSc6Cz5yDV9LEQBKW4eQE",
      "value": "1000000000"
    }
  ]
}
```
