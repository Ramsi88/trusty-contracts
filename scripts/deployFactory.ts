import { network } from "hardhat";
const { ethers } = await network.connect();

import promptSync from 'prompt-sync';

const prompt = promptSync({});

async function main() {
    const awareness = prompt('ARE YOU SURE YOU WANT TO DEPLOY? [deploy] or [press any button] to exit: ') === "deploy" ? true : false;
    if (!awareness) {
        throw "[Aborting all and exiting...]";
    }

    // here we deploy the contract
    const deployedFactoryContract = await ethers.deployContract("TrustyFactory", [], {
        maxFeePerGas: 10_000_000_000n,
        maxPriorityFeePerGas: 2_000_000_000n,
    });
    await deployedFactoryContract.waitForDeployment();

    // print the address of the deployed contract
    console.log("Factory Contract Address:", await deployedFactoryContract.getAddress());
}

// Call the main function and catch if there is any error
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
