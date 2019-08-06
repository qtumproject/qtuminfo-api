# qtuminfo API Documentation

* [Pagination Parameters](#pagination-parameters)
* [Block / Timestamp Filter Parameters](#block--timestamp-filter-parameters)
* [Blockchain](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/blockchain.md)
  * [Blockchain Information](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/blockchain.md#Blockchain-Information)
  * [Supply](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/blockchain.md#Supply)
  * [Total Max Supply](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/blockchain.md#Total-Max-Supply)
* [Block](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md)
  * [Block Information](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md#Block-Information)
  * [Blocks of Date](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md#Blocks-of-Date)
  * [Recent Blocks](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md#Recent-Blocks)
* [Transaction](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md)
  * [Transaction Information](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md#Transaction-Information)
  * [Raw Transaction](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md#Raw-Transaction)
  * [Send Raw Transaction](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/block.md#Send-Raw-Transaction)
* [Address](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md)
  * [Address Information](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-Information)
  * [Address Balance](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-Balance)
  * [Address Transactions](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-Transactions)
  * [Address Basic Transactions](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-Basic-Transactions)
  * [Address Contract Transactions](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-Contract-Transactions)
  * [Address QRC20 Token Transactions](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-QRC20-Token-Transactions)
  * [Address UTXO List](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-UTXO-List)
  * [Address Balance History](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-Balance-History)
  * [Address QRC20 Balance History](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/address.md#Address-QRC20-Balance-History)
* [Contract](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md)
  * [Contract Information](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#Contract-Information)
  * [Contract Transactions](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#Contract-Transactions)
  * [Contract Basic Transactions](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#Contract-Basic-Transactions)
  * [Call Contract](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#Call-Contract)
  * [Search Logs](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#Search-Logs)
* [QRC20](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md)
  * [QRC20 list](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#QRC20-list)
  * [QRC20 Transaction list](https://github.com/qtumproject/qtuminfo-api/blob/master/doc/contract.md#QRC20-Transaction-list)


## API Endpoint
* `https://qtum.info/api/` for mainnet
* `https://testnet.qtum.info/api/` for testnet


## Pagination Parameters

You may use one of 3 forms below, all indices count from 0, maximum 100 records per page:
* `limit=20&offset=40`
* `from=40&to=59`
* `pageSize=20&page=2`


## Block / Timestamp Filter Parameters

These params are available in some transaction list queries,
records are picked only when `fromBlock <= blockHeight <= toBlock`, `fromTime <= blockTimestamp <= toTime`.

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
            <td><code>fromBlock</code></td>
            <td>Number (optional)</td>
            <td>Search blocks from height</td>
        </tr>
        <tr>
            <td><code>toBlock</code></td>
            <td>Number (optional)</td>
            <td>Search blocks until height</td>
        </tr>
        <tr>
            <td><code>fromTime</code></td>
            <td>ISO 8601 Date String (optional)</td>
            <td>Search blocks from timestamp</td>
        </tr>
        <tr>
            <td><code>toTime</code></td>
            <td>ISO 8601 Date String (optional)</td>
            <td>Search blocks until timestamp</td>
        </tr>
    </tbody>
</table>
