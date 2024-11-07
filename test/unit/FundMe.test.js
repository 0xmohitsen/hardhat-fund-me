const { assert, expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require("hardhat");

describe("FundMe", function () {
    let fundMe;
    let mockV3Aggregator;
    let deployer;
    const sendValue = ethers.parseEther("1");
    beforeEach(async () => {
        // const accounts = await ethers.getSigners();
        // deployer = accounts[0];

        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer,
        );
    });

    describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
            const response = await fundMe.priceFeed();
            console.log("Price Feed Address :", response);
            console.log("MOckV3Aggregator address :", mockV3Aggregator.address);
            assert.equal(response, mockV3Aggregator.address);
        });
    });

    describe("fund", function () {
        // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
        // could also do assert.fail

        if (
            ("Fails if you don't send enough ETH!",
            async function () {
                await expect(
                    fundMe
                        .fund()
                        .to.be.revertedWith("You need to send enough ETH!"),
                );
            })
        );

        // we could be even more precise here by making sure exactly $50 works
        // but this is good enough for now

        it("Updates the amount funded data structure", async () => {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.addressToAmountFunded(deployer);
            assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array of funders", async () => {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.funders(0);
            assert.equal(response, deployer);
        });
    });

    describe("withdraw", function () {
        beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
        });

        it("withdraws ETH from a single funder", async () => {
            console.log("FundMe address", fundMe.runner.address);
            // Arrange
            const startingFundMeBalance = await ethers.provider.getBalance(
                fundMe.runner.address,
            );

            console.log("Who is deployer :", deployer);

            const startingDeployerBalance =
                await ethers.provider.getBalance(deployer);

            //Act

            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait();
            console.log("Transaction receipt :", transactionReceipt);
            const { gasUsed, gasPrice } = transactionReceipt;
            console.log("Gas Used:", gasUsed);
            // console.log("Effective Gas Price:", effectiveGasPrice);
            const gasCost = gasUsed * gasPrice;

            const endingFundMeBalance = await ethers.provider.getBalance(
                fundMe.address,
            );

            const endingDeployerBalance =
                await ethers.provider.getBalance(deployer);

            //Assert
            // Maybe clean up to understand the testing
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString(),
            );
        });

        // this test is overloaded. Ideally we'd split it into multiple tests
        // but for simplicity we left it as one
        it("is allows us to withdraw with multiple funders", async () => {
            // Arrange
            const accounts = await ethers.getSigners();
            for (i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i],
                );
                await fundMeConnectedContract.fund({ value: sendValue });
            }
            const startingFundMeBalance = await ethers.provider.getBalance(
                fundMe.runner.address,
            );
            const startingDeployerBalance =
                await ethers.provider.getBalance(deployer);

            // Act
            const transactionResponse = await fundMe.withdraw();
            // Let's compare gas costs :)
            // const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait();
            const { gasUsed, gasPrice } = transactionReceipt;
            const withdrawGasCost = gasUsed * gasPrice;
            // console.log(`GasCost: ${withdrawGasCost}`);
            // console.log(`GasUsed: ${gasUsed}`);
            // console.log(`GasPrice: ${effectiveGasPrice}`);
            const endingFundMeBalance = await ethers.provider.getBalance(
                fundMe.address,
            );

            const endingDeployerBalance =
                await ethers.provider.getBalance(deployer);
            // Assert
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(withdrawGasCost).toString(),
            );
            // Make a getter for storage variables
            await expect(fundMe.funders(0)).to.be.reverted;

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.addressToAmountFunded(accounts[i].address),
                    0,
                );
            }
        });
        it("Only allows the owner to withdraw", async function () {
            const accounts = await ethers.getSigners();
            const fundMeConnectedContract = await fundMe.connect(accounts[1]);
            await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
                "FundMe__NotOwner",
            );
        });
    });
});
