# Block API

- [Block API](#Block-API)
  - [Block Information](#Block-Information)
  - [Blocks of Date](#Blocks-of-Date)
  - [Recent Blocks](#Recent-Blocks)


## Block Information

**Request URL**
```
GET /block/:height
GET /block/:hash
```

**Request**
```
GET /block/400000
GET /block/14f9d58d8f96d3a685808a8be3e5f2743dd71cb1af54fb8a134b9a1bc8bc20b8
```

**Response**
```json
{
  "hash": "14f9d58d8f96d3a685808a8be3e5f2743dd71cb1af54fb8a134b9a1bc8bc20b8",
  "height": 400000,
  "version": 536870912,
  "prevHash": "186d8797fc3280174c0dec83457c8a1e8c1bbd003baf930efce6f23d6cf2ac5a",
  "nextHash": "69e8f78ded5eb2f53f28b7bcde1a4299a61d9cde89d2a8a6c8ff2793fc777119",
  "merkleRoot": "93ce673230dbdd33c90fceca4a1504a8a40aa8ae51464f6f00848d239f08e0b8",
  "timestamp": 1561809392,
  "bits": "1a0aa152",
  "nonce": 0,
  "hashStateRoot": "ff18f1a8d8e6584f8f2c2e921257fd245668de5fb37c8d0800de675eaf673d21",
  "hashUTXORoot": "9e729950c184acd011471252a0c1a4bc279cd4c1e86d543bead4af6df787b2dd",
  "prevOutStakeHash": "9ed785ab666b13becffa83dc2aecc17a80cb434d4ba9670be455e15e730a2d2d",
  "prevOutStakeN": 1,
  "signature": "3044022027bb84b9e75477f3ca81c2bd12612593aa91daeafdb99feef7bbd2b560fb16ba022049e9af798574c8cfc70cd145d9cb223beff9ebf3576eada1c508e21c4edade46",
  "chainwork": "0000000000000000000000000000000000000000000001130f72ecb5f976a847",
  "flags": "proof-of-stake",
  "interval": 16,
  "size": 926,
  "weight": 3596,
  "transactions": [
    "50c7c324f59729da9b30f72cda43de64ef69fa7b617428c69cd1946931ff40b2",
    "89a16f4ce26db8029a835df02f46e0416fe729eee1da8b95225cb35a30fc78f9"
  ],
  "miner": "Qhyek8Kn36vCKSdkcmbSFdR1XfKRKGX6hP",
  "difficulty": 1578241.9071624815,
  "reward": "400000000",
  "confirmations": 5970
}
```


## Blocks of Date

**Request URL**
```
GET /blocks
```
**Request Params**
<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
              <code>date</code>
            </td>
            <td>
              <code>ISO 8601 Date String (optional)</code>
            </td>
            <td>Today</td>
        </tr>
    </tbody>
</table>

**Request**
```
GET /blocks?date=2019-01-01
```

**Response**
```json
[
  {
    "hash": "7c22bfc2192145e1db6d9c1492a0697ef7d23893798c454433fab3bcc2c2b35d",
    "height": 292738,
    "timestamp": 1546387072,
    "interval": 208,
    "size": 1668,
    "transactionCount": 5,
    "miner": "QiRx4CWwVHNqWf3dLW12kcnwRovSw8w9K6",
    "reward": "402883776"
  },
  {
    "hash": "27687c6f8a9ad7db5d278db9326f3ac9a0b701a851b29fe81b779f95ff759056",
    "height": 292737,
    "timestamp": 1546386864,
    "interval": 496,
    "size": 3178,
    "transactionCount": 5,
    "miner": "QYHV93kbN9osowPHTWHjeYzgrmZasdatov",
    "reward": "404394122"
  },
  {
    "hash": "37051ffc1e77a552994a6700bc32a778196f2f7165d07b4df020b134bf662021",
    "height": 292736,
    "timestamp": 1546386368,
    "interval": 64,
    "size": 928,
    "transactionCount": 2,
    "miner": "QdB6krR2kgssX7xnx8E9JPrRktfSBRBrEa",
    "reward": "400000000"
  },
  // ... 592 more items ...
  {
    "hash": "ed3d13dcc7b91ec384a034c32ff701b874977c06abf25fe5e621a390e147f7f7",
    "height": 292142,
    "timestamp": 1546301312,
    "interval": 16,
    "size": 1152,
    "transactionCount": 3,
    "miner": "Qgdj4FrXXxLVkxPDYtFNNGZNd9TJrNjtpM",
    "reward": "404833647"
  },
  {
    "hash": "0fe877ba6c90dfc7de1411e8f69378ddf94aaff718c21d11577661ad82898da1",
    "height": 292141,
    "timestamp": 1546301296,
    "interval": 32,
    "size": 1597,
    "transactionCount": 4,
    "miner": "QNLZS9sVUTTZZQ6UfaDnAwTQifbKWFZwmP",
    "reward": "407149600"
  },
  {
    "hash": "4a6f69b82f578c4edceaf03f0015f8ccc1ef613181ec69c64f95cc44e4c6ddc2",
    "height": 292140,
    "timestamp": 1546301264,
    "interval": 512,
    "size": 2008,
    "transactionCount": 6,
    "miner": "QgYB6x5RQBGgGL2R7Qe6WJAsUE4ZkdBj7Z",
    "reward": "422733104"
  }
]
```


## Recent Blocks

**Request URL**
```
GET /recent-blocks
```
**Request Params**
<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
              <code>count</code>
            </td>
            <td>
              <code>Number (optional)</code>
            </td>
            <td>10</td>
            <td>Number of Recent Blocks</td>
        </tr>
    </tbody>
</table>

**Request**
```
GET /recent-blocks?count=5
```

**Response**
```json
[
  {
    "hash": "cda36eef9029d120c6f0ba34392954aa2a929643f33a791d7f47332721a7ab86",
    "height": 405981,
    "timestamp": 1562661728,
    "interval": 32,
    "size": 882,
    "transactionCount": 2,
    "miner": "QX8U4uMCaQzoLv6rcBvN4dBk9xYPi8TkcR",
    "reward": "400000000"
  },
  {
    "hash": "ca51ad6bcf5c300f8ffce4847dbe881b54cfac886746f09dc41e9323447f2ca2",
    "height": 405980,
    "timestamp": 1562661696,
    "interval": 112,
    "size": 1151,
    "transactionCount": 3,
    "miner": "QQrm6av1tWtTmvkTpft3FygcmLFcrEWGWk",
    "reward": "400090427"
  },
  {
    "hash": "e7f60b634158ae80347ca84d30388f0b7c48563dcfa9183a4a33c755668636fb",
    "height": 405979,
    "timestamp": 1562661584,
    "interval": 80,
    "size": 1406,
    "transactionCount": 3,
    "miner": "QXDkSQAFEneCaPMC4ML6w8kmcrYxhsz4Qv",
    "reward": "402233609"
  },
  {
    "hash": "96adbe135480a585372a67739a3d64d593f7c826c5542e9c5f156de711a7df81",
    "height": 405978,
    "timestamp": 1562661504,
    "interval": 320,
    "size": 11337,
    "transactionCount": 7,
    "miner": "QhUdHBgHcW7rTYxtzbs3By4nz9sggE5EbV",
    "reward": "408284149"
  },
  {
    "hash": "9b3dab86fd71d24cb144ae44d8106241b52b9cc2c68a9924e1a371eb897ed4fe",
    "height": 405977,
    "timestamp": 1562661184,
    "interval": 240,
    "size": 1852,
    "transactionCount": 5,
    "miner": "QWKsTwTkH5n2qp1ivWp6ropknSsqKj9NXY",
    "reward": "400409061"
  }
]
```
