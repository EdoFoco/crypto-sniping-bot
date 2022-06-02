const { ChainId } = require('@uniswap/sdk');
const { logger } = require('ethers');
const providerService = require('./services/providerService');
const workerService = require('./services/workerService');
const walletService = require('./services/walletService');
const Logger = require('./services/logger');

// Settings
const debugMode = true;
const sellOnly = false;

const logLevel = 2;
const chainId = ChainId.KOVAN;
const chainName = "kovan"

const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; //Uniswap router 2
const myWalletAddress = '${WALLET_ADDRESS}';
const token = '0x0b4385f7569639770f4c8a7168104a7edcc61706'; //<- test token kovan network
const walletPassword = "${WALLET_PASSWORD}";
const maxGas = 300 * (10**9); // gweis. Max gas fees in gwei.
const maxContractApprovalGas = 300 * (10**9);
const totAmount = 0.04 * (10**18); // eth. Amount to spend in ETH.
const maxSlippage = 100; // in percentage. Indicaates the max slippage
const numberOfWorkers = 1;
const takeProfit = 30; // in percentage. Indicates the TP threshold.
const tokenPctToSell = 98; // in percentage. Indicates the amount of token you want to sell after the buy operation.

const start = async() => {
    const logger = new Logger(logLevel, null);

    console.log();
    // Config
    const providerConfig = await providerService.getProvider(walletPassword, routerAddress, chainName);
    if(!sellOnly){
        // Buy
        const buyResult = await workerService.runBuyWorker(token, myWalletAddress, providerConfig, totAmount, maxGas, maxSlippage, chainId, numberOfWorkers, logLevel, debugMode);
        logger.log(5, buyResult);
        
        // Approve token
        let contractBalance = await walletService.getBalance(myWalletAddress, token, providerConfig);
        if(contractBalance.balance < 0.0000001){
            throw "No balance found. Are you sure the txn went through?";
        }

        if(!debugMode){
            const approveTxn = await contractBalance.contract.approve(routerAddress, contractBalance.balance.toString(), {gasPrice: maxContractApprovalGas});
            const receipt = await approveTxn.wait();
            logger.log(2, "Approved txn");
        }
    }  
    
    // get balance again
    let contractBalance = await walletService.getBalance(myWalletAddress, token, providerConfig);
    if(!debugMode && contractBalance.balance < 0.0000001){
         throw "No balance found. Are you sure the txn went through?";
    }

    const amountToSell = contractBalance.balance * tokenPctToSell / 100;
    const buyPrice = totAmount / contractBalance.balance;
    const sellResult = await workerService.runSellWorker(token, myWalletAddress, providerConfig, maxGas, maxSlippage, chainId, numberOfWorkers, logLevel, buyPrice, takeProfit, amountToSell, debugMode);
    logger.log(5, sellResult);
    logger.log(5, 'Complete!');
    logger.log(5, `Profit: ${(sellResult.soldAt/buyPrice -1)*100}%`);
    logger.log(5, `BoughtAt: ${buyPrice} and SoldAt: ${sellResult.soldAt}`);
    logger.log(5, `Buy txn: ${buyResult.transaction}`);
    logger.log(5, `Sell txn: ${sellResult.transaction}`);

    logger.log(5, "**** GET RICH OR DIE TRYIN' ****");
}

start();