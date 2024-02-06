import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config({ path: ".env" });

const {INFURA_API_KEY, QUICKNODE_HTTP_URL, PRIVATE_KEY} = process.env;
const etherscanKey = process.env.ETHERSCAN_API_KEY;

export const solidity = "0.8.13";
export const networks = {
  mainnet: {
    chainId: 1,
    url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY]
  },
  goerli: {
    url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
  },
  sepolia: {
    url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    accounts: [PRIVATE_KEY],
  },
  mumbai: {
    url: QUICKNODE_HTTP_URL,
    accounts: [PRIVATE_KEY],
  },
};
export const etherscan = {
  apiKey: {
    goerli: etherscanKey
  }
};
