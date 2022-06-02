# Introduction

This is a crypto sniping bot!

It's purpose is to snipe a token launch and buy as soon as the token is released. It's best performance was to get the 4th transaction on Ethereum.

## How it works
1. Loads your wallet and creates a signer
2. Starts polling the blockchain to see if he can get a price. If it does, it means the token is active and we can swap it.
3. Executes a transactions on Uniswap (or PancakeSwap), if it fails it tries again.
4. Once the transaction suceeds, it sells immidiately (we're trying to make profit on the initial launch so it's best to sell right after).

## Config
I've been lazy!

I haven't used dotenv and all values are hardcoded. All variables are in index.js apart from wallet info (in json format) which is in walletService.js file.

## Set up
>```npm install```
>```npm start```
