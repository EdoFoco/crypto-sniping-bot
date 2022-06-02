const ethers = require('ethers');
const walletService = require('./walletService');

const getProvider = async(walletPassword, routerAddress, chainName) => {
    const walletJson = walletService.getWallet();

    const signer = await ethers.Wallet.fromEncryptedJson(walletJson, walletPassword);

    const provider = ethers.getDefaultProvider(chainName, {
        infura: '9f90670f41624367b456b7da572f2bd8',
        etherscan: '4PVYSANH4EP84KZAIBBZRJ7Y3NEG73GF2U',
        alchemy: 'avTxSuAvbj-qOPgyRw4RHRjVHCDVrrCU'
    });

    const accountSigner = signer.connect(provider);

    const uniswap = new ethers.Contract(
        routerAddress, // Address of Router2 on Uniswap
        [
            'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
            'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
        ],
        accountSigner
    );

    return {'uniswap': uniswap, 'provider': provider, 'signer':accountSigner};
}

module.exports.getProvider = getProvider;
