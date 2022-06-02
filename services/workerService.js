const Logger = require('./logger');
const txService = require('./transactionService');
const utils = require('./utils');
const walletService = require('./walletService');

var retryBuy = true;
var retrySell = true;

const buy = async(tokenAddress, destinationWallet, uniswap, amount, gas, slippage, workerNo, chainId, logLevel, debugMode) => {
    const logger = new Logger(logLevel, workerNo);
    while(retryBuy){
        try{
            const pairDetails = await txService.getPairDetails(chainId, tokenAddress, amount, gas, logger);
            const path = [pairDetails.weth.address, pairDetails.contract.address];
            const transactionDetails = await txService.getTransactionDetails(pairDetails, slippage, destinationWallet, logger);

            if(!debugMode){
                const tx = await txService.processTransaction(uniswap, transactionDetails, path, gas, logger);
                if(!tx.success){
                    continue;
                }

                retryBuy = false;
                return {'success': true, 'tx': tx.transaction, 'receipt': tx.receipt, 'boughtAt': pairDetails.midPriceInverted, 'boughtTokenAt': pairDetails.midPrice };
            }
            else{
                if(workerNo == 0){
                    retryBuy = false;
                    return {'success': true, 'tx': null, 'receipt': null, 'boughtAt': pairDetails.midPriceInverted, 'boughtTokenAt': pairDetails.midPrice };
                }
            }
        }
        catch(e)
        {
            logger.log(5, e);
        }
    }

    return { 'success': false };
}

const runBuyWorker = async(token, destinationWallet, providerConfig, amount, gas, slippage, chainId, numberOfWorkers, logLevel, debugMode) => {
    const result = [];
    
    for(var i = 0; i < numberOfWorkers; i++){
        result.push(buy(token, destinationWallet, providerConfig.uniswap, amount, gas, slippage, i, chainId, logLevel, debugMode));
        await utils.sleep(300);
    }

    var res = await Promise.all(result);

    for(var i = 0; i < res.length; i++){
        if(res[i].success){
            return res[i];
        }
    }

    throw "No transactions suceeded";
}


const sell = async(workerNo, logLevel, token, destinationWallet, providerConfig, gas, slippage, chainId, boughtAt, takeProfit, amountToSell, debugMode) => {
    const logger = new Logger(logLevel, workerNo);
    let profit = -10000;
    let pairDetails = null;

    while(retrySell){
        try{
            pairDetails = await txService.getInversePairDetails(chainId, token, amountToSell.toString(), gas, logger); // insert a fake amount => 1. We don't need it
        
            profit = (pairDetails.executionPrice / boughtAt -1) * 100;
            logger.log(2, `Profit: ${profit}`);
            
            if(debugMode){
                profit = takeProfit;
            }

            if(profit >= takeProfit){
                var transactionDetails = await txService.getTransactionDetails(pairDetails, slippage, destinationWallet, logger);
                
                if(!debugMode){
                    var tx = await txService.processSellTransaction(providerConfig.uniswap, transactionDetails, pairDetails, gas, logger);
                    if(!tx.success){
                        continue;
                    }

                    retrySell = false;
                    return {'success': true, 'tx': tx.transaction, 'receipt': tx.receipt, 'soldAt': pairDetails.midPriceInverted, 'soldAtEth': pairDetails.midPrice };
                }
                else{
                    retrySell = false;
                    return {'success': true, 'tx': null, 'receipt': null, 'soldAt': pairDetails.midPriceInverted, 'soldAtEth': pairDetails.midPrice };
                }
                
            }
        }
        catch(e){
            logger.log(5, e);
        }
    }
    return { 'success': false };
}

const runSellWorker = async(token, destinationWallet, providerConfig, gas, slippage, chainId, numberOfWorkers, logLevel, boughtAt, takeProfit, amountToSell, debugMode) => {
    const result = [];
    
    for(var i = 0; i < numberOfWorkers; i++){
        result.push(sell(i, logLevel, token, destinationWallet, providerConfig, gas, slippage, chainId, boughtAt, takeProfit, amountToSell, debugMode));
        await utils.sleep(300);
    }

    var res = await Promise.all(result);

    for(var i = 0; i < res.length; i++){
        if(res[i].success){
            return res[i];
        }
    }

    throw new Exception("No sell transactions suceeded");
}

module.exports.runBuyWorker = runBuyWorker;
module.exports.runSellWorker = runSellWorker;