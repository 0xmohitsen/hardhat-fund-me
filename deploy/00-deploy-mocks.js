const { network } = require("hardhat");
const {
    developmentChains,
    DECIMALS,
    INITIAL_ANSWERS,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("What is the network name :", network.name);

    if (developmentChains.includes(network.name)) {
        log("Local network detected: Deploying mocks...");
        await deploy("MockV3Aggregator", {
            contract: "MockV3Aggregator", // for more specific
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_ANSWERS],
        });
        log("Mock deployed....");
        log("-------------------------------------------");
    }
};

module.exports.tags = ["all", "mocks"];
