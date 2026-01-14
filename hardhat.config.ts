import { defineConfig } from 'hardhat/config';
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";

export default defineConfig({
    plugins: [
        hardhatNetworkHelpers,
        hardhatToolboxViemPlugin,
        hardhatEthers,
        hardhatEthersChaiMatchers
    ],
    solidity: {
        version:"0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
});
