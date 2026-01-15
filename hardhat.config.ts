import { configVariable, defineConfig, HardhatUserConfig } from 'hardhat/config';
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatLedgerPlugin from "@nomicfoundation/hardhat-ledger";
import hardhatIgnitionViemPlugin from "@nomicfoundation/hardhat-ignition-viem";
import { argv } from 'node:process';
import * as dotenv from "dotenv";
dotenv.config();
import promptSync from 'prompt-sync';

const prompt = promptSync({});

let input = false
if (
    //input
    argv.length > 2 &&
    //process.argv[2].includes("ignition/modules/Deploy.ts") ||
    argv[3]?.includes("scripts/deploy.ts") ||
    argv[3]?.includes("scripts/deployFactory.ts") ||
    argv[3]?.includes("scripts/deployFactoryAdvanced.ts") ||
    argv[3]?.includes("scripts/deployRecovery.ts") ||
    argv[3]?.includes("scripts/deployAdvanced.ts")
) {
    input = prompt('Would you like to use HW Ledger? [y] or [press any button] to skip: ') === "y" ? true : false;
}

const { INFURA_API_KEY, ETHERSCAN_API_KEY, PRIVATE_KEY, LEDGER_ADDRESS, MNEMONIC, PASSPHRASE } = process.env;


// Set to `true` and insert the `ledgerAddress` that will be used to deploy 
const useLedger = input;
const ledgerAddress = LEDGER_ADDRESS ?? "";
//console.log("[LEDGER_ADDRESS]", ledgerAddress);

const LEDGER_CONFIG: HardhatUserConfig = {
    plugins: [
        hardhatNetworkHelpers,
        hardhatToolboxViemPlugin,
        hardhatEthers,
        hardhatEthersChaiMatchers,
        hardhatLedgerPlugin,
        hardhatIgnitionViemPlugin
    ],
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhatMainnet: {
            type: "edr-simulated",
            chainType: "l1",
            ledgerAccounts: [
                // Set your ledger address here
                ledgerAddress,
            ],
        },
        hardhatOp: {
            type: "edr-simulated",
            chainType: "op",
        },
        sepolia: {
            type: "http",
            chainType: "l1",
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`, //configVariable("SEPOLIA_RPC_URL"),
            ledgerAccounts: [
                // Set ledger address
                ledgerAddress,
            ],
            ignition: {
                maxFeePerGasLimit: 50_000_000_000n, // 50 gwei
                maxFeePerGas: 20_000_000_000n, // 20 gwei
                maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
                gasPrice: 50_000_000_000n, // 50 gwei
                disableFeeBumping: false,
                explorerUrl: "https://sepolia.etherscan.io",
                maxRetries: 10,
                retryInterval: 1_000,
            },
            // accounts: {
            //     mnemonic: configVariable("MNEMONIC"),
            //     path: "m/44'/60'/0'/0",
            //     initialIndex: 0,
            //     count: 20,
            //     passphrase: configVariable("PASSPHRASE"),
            //     // only available when network type === "edr-simulated"
            //     //accountsBalance: 10n ** 18n, // 1 ETH in wei
            // },
        },
        mumbai: {
            type: "http",
            chainType: "generic",
            url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
            ledgerAccounts: [ledgerAddress],
        },
        amoy: {
            type: "http",
            chainType: "generic",
            url: `https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}`,
            ledgerAccounts: [ledgerAddress],
        },
        polygon: {
            type: "http",
            chainType: "generic",
            url: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
            ledgerAccounts: [ledgerAddress],
        },
        mainnet: {
            type: "http",
            chainType: "l1",
            url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
            ledgerAccounts: [ledgerAddress],
        },
    }
};

const DEFAULT_CONFIG: HardhatUserConfig = {
    plugins: [
        hardhatNetworkHelpers,
        hardhatToolboxViemPlugin,
        hardhatEthers,
        hardhatEthersChaiMatchers,
        hardhatLedgerPlugin,
        hardhatIgnitionViemPlugin
    ],
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhatMainnet: {
            type: "edr-simulated",
            chainType: "l1",
            accounts: {
                mnemonic: configVariable("MNEMONIC"),
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: configVariable("PASSPHRASE"),
                // only available when network type === "edr-simulated"
                accountsBalance: 10n ** 18n, // 1 ETH in wei
            },
        },
        hardhatOp: {
            type: "edr-simulated",
            chainType: "op",
        },
        sepolia: {
            type: "http",
            chainType: "l1",
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`, //configVariable("SEPOLIA_RPC_URL"),
            ignition: {
                maxFeePerGasLimit: 50_000_000_000n, // 50 gwei
                maxFeePerGas: 20_000_000_000n, // 20 gwei
                maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
                gasPrice: 50_000_000_000n, // 50 gwei
                disableFeeBumping: false,
                explorerUrl: "https://sepolia.etherscan.io",
                maxRetries: 10,
                retryInterval: 1_000,
            },
            accounts: {
                mnemonic: MNEMONIC ?? "",
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: PASSPHRASE,
            },
        },
        mumbai: {
            type: "http",
            chainType: "generic",
            url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
            accounts: {
                mnemonic: MNEMONIC ?? "",
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: PASSPHRASE,
            },
        },
        amoy: {
            type: "http",
            chainType: "generic",
            url: `https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}`,
            accounts: {
                mnemonic: MNEMONIC ?? "",
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: PASSPHRASE,
            },
        },
        polygon: {
            type: "http",
            chainType: "generic",
            url: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
            accounts: {
                mnemonic: MNEMONIC ?? "",
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: PASSPHRASE,
            },
        },
        mainnet: {
            type: "http",
            chainType: "l1",
            url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
            ignition: {
                maxFeePerGasLimit: 50_000_000_000n, // 50 gwei
                maxFeePerGas: 20_000_000_000n, // 20 gwei
                maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
                gasPrice: 50_000_000_000n, // 50 gwei
                disableFeeBumping: false,
                explorerUrl: "https://etherscan.io",
                maxRetries: 10,
                retryInterval: 1_000,
            },
            accounts: {
                mnemonic: MNEMONIC ?? "",
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 20,
                passphrase: PASSPHRASE,
            },
        },
    },
    verify: {
        etherscan: {
            apiKey: ETHERSCAN_API_KEY,
        },
    },
};

export default defineConfig(useLedger? LEDGER_CONFIG : DEFAULT_CONFIG);
