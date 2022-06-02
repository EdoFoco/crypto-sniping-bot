const { Fetcher, WETH, Route, Trade, TokenAmount
    , TradeType, Percent,} = require('@uniswap/sdk')
const ethers = require('ethers');

let buyLocked = false;
let sellLocked = false;

const getPairDetails = async (chainId, tokenAddress, amount, gas, logger) => {
    try{
        const contract = await Fetcher.fetchTokenData(chainId, tokenAddress);
        const weth = WETH[chainId];
        
        const pair = await Fetcher.fetchPairData(contract, weth);
        const route = new Route([pair], weth);
    
        const trade = new Trade(route, new TokenAmount(weth, `${amount}` ), TradeType.EXACT_INPUT); 
    
        logger.log(2, `Exec Price: ${trade.executionPrice.toSignificant(6)}, Token Amount: ${amount / (10**18)}`);
        logger.log(1, `Eth Amount: ${amount / (10**18)}`);
        logger.log(1, `Mid price: ${route.midPrice.toSignificant(6)}`);
        logger.log(1, `Mid price inverted: ${route.midPrice.invert().toSignificant(6)}`);
        logger.log(1, `Execution price: ${trade.executionPrice.toSignificant(6)}`);
        logger.log(1, `Next mid price: ${trade.nextMidPrice.toSignificant(6)}`);
        logger.log(1, `Gas: ${gas / (10**9)} gwei`);

        return { 'pair': pair, 'trade': trade, 'weth': weth, 'contract': contract, 'midPriceInverted': route.midPrice.invert().toSignificant(6), 'midPrice': route.midPrice.toSignificant(6), 'executionPrice': trade.executionPrice.toSignificant(6) };
    }
    catch(e){
        logger.log(3, `Unable to get pair details`);
        throw e;
    }
}

const getInversePairDetails = async (chainId, tokenAddress, amount, gas, logger) => {
    try{
        const contract = await Fetcher.fetchTokenData(chainId, tokenAddress);
        const weth = WETH[chainId];
        
        const pair = await Fetcher.fetchPairData(weth, contract);
        const route = new Route([pair], contract);
    
        const trade = new Trade(route, new TokenAmount(contract, `${amount}` ), TradeType.EXACT_INPUT); 
    
        logger.log(2, `Exec Price: ${trade.executionPrice.toSignificant(6)}, Token Amount: ${amount / (10**18)}`);
        logger.log(1, `Mid price: ${route.midPrice.toSignificant(6)}`);
        logger.log(1, `Mid price inverted: ${route.midPrice.invert().toSignificant(6)}`);
        logger.log(1, `Execution price: ${trade.executionPrice.toSignificant(6)}`);
        logger.log(1, `Next mid price: ${trade.nextMidPrice.toSignificant(6)}`);
        logger.log(1, `Gas: ${gas / (10**9)} gwei`);
        logger.log(1, '');

        return { 'pair': pair, 'trade': trade, 'weth': weth, 'contract': contract, 'midPriceInverted': route.midPrice.invert().toSignificant(6), 'midPrice': route.midPrice.toSignificant(6), 'executionPrice': trade.executionPrice.toSignificant(6) };
    }
    catch(e){
        logger.log(3, `Unable to get pair details`);
        throw e;
    }
}


const getTransactionDetails = async (pairDetails, slippage, destinationWallet, logger) => {
    
    try{
        // Get trade amounts
        const slippageTolerance = new Percent(slippage, '100'); //50 bips => 1 bip = 0.001%
        const amountOutMin = pairDetails.trade.minimumAmountOut(slippageTolerance).raw;
        const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString();

        // Create txn details
        const to = destinationWallet;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // (seconds) + 60*20 (20min)
        const inputAmount = pairDetails.trade.inputAmount.raw;
        const inputAmountHex = ethers.BigNumber.from(inputAmount.toString()).toHexString(); 

        return { 'amountOutMin': amountOutMin, 'amountOutMinHex': amountOutMinHex, 'to': to, 'deadline': deadline, 'inputAmount': inputAmount, 'inputAmountHex': inputAmountHex };
    }
    catch(e){
        logger.log(3, `Unable to get txn details`);
        throw e;
    }
}

const processTransaction = async (uniswap, transactionDetails, path, gas, logger) => {
    try{
        if(buyLocked){
            return { 'transaction': null, 'receipt': null, 'success': false }
        }

        buyLocked = true;
        //console.log(transactionDetails.inputAmount.toString());
        //console.log(transactionDetails.amountOutMin.toString());
        const tx = await uniswap.swapExactETHForTokens(transactionDetails.amountOutMinHex, path, transactionDetails.to, transactionDetails.deadline, { value: transactionDetails.inputAmountHex, gasPrice: gas, gasLimit: 300000 });
        logger.log(5, '');
        logger.log(5, `**** Txn created ${tx.hash}`)
        logger.log(5, '');
        
        const receipt = await tx.wait();
        logger.log(5, `Transaction ${tx.hash} was mined in block: ${receipt.blockNumber}`);
    
        return {'success': true, 'transaction': tx, 'receipt': receipt }
    }
    catch(e){
        buyLocked = false;
        logger.log(5, `Unable to create txn`);
        throw e;
    }
}

const processSellTransaction = async (uniswap, transactionDetails, pairDetails, gas, logger) => {
    try{
        if(sellLocked){
            return { 'transaction': null, 'receipt': null, 'success': false }
        }

        sellLocked = true;
        //console.log(transactionDetails.inputAmount.toString());
        //console.log(transactionDetails.amountOutMin.toString());
        //console.log(transactionDetails.minimumAmountOut.toString());
        //console.log(transactionDetails.amountOutMin.toString());

        const path = [pairDetails.contract.address, pairDetails.weth.address];

        const tx = await uniswap.swapExactTokensForETH(transactionDetails.inputAmountHex, transactionDetails.amountOutMinHex, path, transactionDetails.to, transactionDetails.deadline, { gasLimit: 300000, gasPrice: gas });
        
        logger.log(5, '');
        logger.log(5, `**** Sell Txn created ${tx.hash}`)
        logger.log(5, '');
        
        const receipt = await tx.wait();
        logger.log(5, `Transaction ${tx.hash} was mined in block: ${receipt.blockNumber}`);
    
        return {'success': true, 'transaction': tx, 'receipt': receipt }
    }
    catch(e){
        sellLocked = false;
        logger.log(5, `Unable to create txn`);
        throw e;
    }
}

module.exports.getPairDetails = getPairDetails;
module.exports.getInversePairDetails = getInversePairDetails;
module.exports.getTransactionDetails = getTransactionDetails;
module.exports.processTransaction = processTransaction;
module.exports.processSellTransaction = processSellTransaction;
