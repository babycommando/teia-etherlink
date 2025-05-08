## Teia @ Etherlink

This is a proof-of-concept migration of the Teia smart contracts, showcasing a seamless swapping experience where the contract securely holds tokens on behalf of creators and sellers, facilitating transactions while automatically distributing royalties.

The repository contains the refactored Teia smart contracts for Solidity, and the user interface to test it.

Contracts can be accessed at /contracts.

- The FA2.py equivalent is [Teia1155.sol](https://github.com/babycommando/teia-etherlink/blob/main/contracts/Teia1155.sol)
- The TeiaMarketplace.py is [TeiaMarketplace.sol](https://github.com/babycommando/teia-etherlink/blob/main/contracts/TeiaMarketplace.sol)

The Teia1155.sol demo is deployed at [0x7234F64Df5539fb1d79cE84f00B72eb02b478690](https://testnet.explorer.etherlink.com/address/0x7234F64Df5539fb1d79cE84f00B72eb02b478690?tab=index).
The TeiaMarketplace.sol demo is deployed at [0xFbaCe80171cf60bB7E27EFa9FE8eFa66C2eb36D9](https://testnet.explorer.etherlink.com/address/0xFbaCe80171cf60bB7E27EFa9FE8eFa66C2eb36D9).

---

## 1. Deploying The Contracts

The demo contracts have beed deployed to the Etherlink Testnet using [Remix.Ethereum](https://remix.ethereum.org/) as recommended by [Etherlink here](https://docs.etherlink.com/building-on-etherlink/deploying-contracts). Remix is a similar online IDE similar to Smartpy where you can compile contracts. Please follow the instructions for compiling and deploying the contracts with remix on the Etherlink page.

To deploy the contracts you are required to have "Etherlink XTZ" in your wallet. Proceed to their Faucet, connect your Metamask wallet and switch the network to start using Etherlink. Then request your XTZ.

**Important:** You can only claim XTZ on the faucet once by day. To bypass it use multiple browsers and transfer between different wallets to a single one.

Proceed to deploy the contracts in this order and use the following params for each when requested:

Teia1155.sol:
`_manager:` Someone's wallet or DAO to be the administrator
`_fee:` The % fee (Ex 250 = 2,5%)
`_feeRecipient:` Someone's wallet or DAO to receive the fees

TeiaMarketplace.sol:
`_teia1155:` The deployed 0xAddress of Teia1155.sol
`_manager:` Someone's wallet or DAO to be the administrator
`_fee:` The % fee (Ex 250 = 2,5%)
`_feeRecipient:` Someone's wallet or DAO to receive the fees

---

## 2. Running The Client Application

With the contracts deployed to the Etherlink Testnet, we need to configure and test it further. For this we use a client-side js application that will interact with the blockchain.

The client application was made with Nextjs, to install and run you must:

Clone the repository:
`git clone https://github.com/babycommando/teia-etherlink.git`

Inside the cloned repository, install dependencies:
`npm install`

Replace the contract addresses at .env.local with your own (or use the current one if you haven't deployed contracts):

```
NEXT_PUBLIC_TEIA1155_ADDRESS=0x...
NEXT_PUBLIC_TEIA_MARKETPLACE_ADDRESS=0x...
```

Then run the application with:
`npm run dev`

It will be running at [http://localhost:8080](http://localhost:8080).

---

## 3. Grant Minting Rights to the Contract

Before playing with the marketplace we need to authorize the contract to become a minter. This action requires the administrator account/wallet previously set during the contracts deployment.

Granting minting rights to the marketplace contract means giving it permission to create new tokens in the Teia1155 contract. Without this permission, the marketplace can’t mint tokens, and any attempt to do so will fail. To grant this right, the admin account needs to call a function that allows the marketplace to mint tokens. This way, the marketplace can create new editions or swaps on behalf of users while keeping minting control secure and limited to specific contracts.

With the app running, go to [http://localhost:8080/grant](http://localhost:8080/grant).

Log in with the wallet you set as administrator on the contract, and call the function to give the contract minting rights.

---

## 4. Minting / Swapping / Buying NFTs

With the minting rights granted, you can now start playing with the contracts. Proceed to the app's homepage at [http://localhost:8080](http://localhost:8080).

The process is divided into 5 steps:

#### 0. Connect your wallet

This demo currently works with metamask but [Thirdweb](https://thirdweb.com/) could be used similar to how Beacon works on Tezos.

#### 1. Mint Tokens

Fill in a token ID (for proof of concept), the amount of NFTs and the IPFS URI containig the JSON with the piece's data. I've pre-filled it with a piece of my own to facilitate, but you can try yours (must be in Teia/HEN format).

#### 2. Approve Marketplace

The "approve marketplace" function is a one-time setup that allows the marketplace contract to handle your tokens. By calling this function, you’re giving the marketplace permission to transfer your tokens when a swap or sale happens. This approval only needs to be done once and remains active until you revoke it. Without this approval, the marketplace can’t move your tokens, so any swap or sale would fail.

#### 3. Swap Minted Tokens

This sends the tokens to the contract to operate in your name for a certain price.

#### 4. Collect or Cancel Open Swaps

**Buy:** This is the act of collecting a piece as a buyer, that transfer the token to your wallet in exchange for a set up price.

**Cancel:** If you are the minter you can see the "cancel swap" button as well, wich returns the tokens to your wallet.

---
