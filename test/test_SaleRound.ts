import { expect, util } from "chai";
import { ethers, network } from "hardhat";
import { utils, BigNumber } from "ethers";

import { SaleToken, SaleRound, USDT, TestToken } from "../typechain"


async function getNodeTime() {
    let blockNumber = await ethers.provider.send('eth_blockNumber', []);
    let txBlockNumber = await ethers.provider.send('eth_getBlockByNumber', [blockNumber, false]);
    return txBlockNumber.timestamp.toString()
}

async function shiftTime(newTime: number | string) {
    await ethers.provider.send("evm_increaseTime", [newTime]);
    await ethers.provider.send("evm_mine", []);
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';


describe("SaleRound test: Base function", function () {

    let saleToken: SaleToken;
    let usdt: USDT;
    let usdc: USDT;
    let pSale: SaleRound;
    let token: TestToken;
    let addr: any;


    it("Hardhat_reset", async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: process.env.ALCHEMY_API_HTTP,
                        blockNumber: 27549864,
                    },
                },
            ],
        });
    });


    it("Deploy saleToken token", async function () {

        const saleToken = await ethers.getContractFactory("saleToken");
        saleToken = await saleToken.deploy(2, utils.parseEther('500000000'));
        await saleToken.deployed();
        addr = await ethers.getSigners();

    });




    it("Transfer USDT token", async function () {

        let usdtAddr = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
        usdt = await ethers.getContractAt("USDT", usdtAddr) as USDT;

        let address = '0x11ededebf63bef0ea2d2d071bdf88f71543ec6fb';
        await ethers.provider.send('hardhat_impersonateAccount', [address]);
        let signer = await ethers.getSigner(address)
        await addr[1].sendTransaction({ to: signer.address, value: utils.parseEther('1000') })

        let amount = 1000 * 1e6;

        await usdt.connect(signer).transfer(addr[5].address, amount);
        await usdt.connect(signer).transfer(addr[6].address, amount);
        await usdt.connect(signer).transfer(addr[7].address, amount);
        await usdt.connect(signer).transfer(addr[8].address, amount);
        await usdt.connect(signer).transfer(addr[9].address, amount);
        await usdt.connect(signer).transfer(addr[10].address, amount);
        await usdt.connect(signer).transfer(addr[11].address, amount);
        await usdt.connect(signer).transfer(addr[13].address, amount);

        expect(await usdt.balanceOf(addr[5].address)).to.equal(amount);
        expect(await usdt.balanceOf(addr[6].address)).to.equal(amount);


        await ethers.provider.send('hardhat_stopImpersonatingAccount', [address]);

    });

    it("Transfer USDC token", async function () {

        let usdcAddr = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
        usdc = await ethers.getContractAt("USDT", usdcAddr) as USDT;

        let address = '0x21cb017b40abe17b6dfb9ba64a3ab0f24a7e60ea';
        await ethers.provider.send('hardhat_impersonateAccount', [address]);
        let signer = await ethers.getSigner(address)
        await addr[1].sendTransaction({ to: signer.address, value: utils.parseEther('100') })

        let amount = 1000000000;
        await usdc.connect(signer).transfer(addr[3].address, amount);
        await usdc.connect(signer).transfer(addr[4].address, amount);
        expect(await usdc.balanceOf(addr[3].address)).to.equal(amount);
        expect(await usdc.balanceOf(addr[4].address)).to.equal(amount);

    });

    it("Should saleToken transfer to addr[1]", async function () {

        let amount = utils.parseEther('100');
        await saleToken.connect(addr[0]).transfer(addr[1].address, amount);
        expect(await saleToken.balanceOf(addr[1].address,)).to.equal(amount.toString());

    });

    let totalAmount = utils.parseEther('10000');
    const percentDistributedImmediately = 5
    const month = 12;
    let maxContribution = 100 * 1e6
    let minContribution = 0


    it("Deploy SaleRound", async function () {
        let USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
        let USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
        let adapter = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';
        const PSale = await ethers.getContractFactory("SaleRound");
        pSale = await PSale.deploy(totalAmount,
            saleToken.address,
            month,
            percentDistributedImmediately,
            utils.parseEther('0.07'),
            USDT,
            USDC,
            adapter,
            maxContribution,
            minContribution,
            addr[0].address
        );
        await saleToken.connect(addr[0]).transfer(pSale.address, totalAmount);
        expect(await saleToken.balanceOf(pSale.address)).to.eq(totalAmount);

    });

    it("Deploy token for test case ", async function () {

        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy();
        await token.deployed();
        await token.connect(addr[0]).transfer(pSale.address, utils.parseEther('1000'));
    });

    it("Should get info about sale round", async function () {

        let info = await pSale.getInfo();
        expect(info[0]).to.equal(saleToken.address);
        expect(info[1]).to.equal(totalAmount);
        expect(info[2]).to.equal(percentDistributedImmediately);
        expect(info[3]).to.equal(0);
        expect(info[4]).to.equal(month);
        expect(info[6]).to.equal(utils.parseEther('0.07'));

    });

    it("Should buy saleToken of USDT", async function () {

        let amountUSD = 100 * 1e6;
        console.log("balanceOf addr[5] = ", await usdt.balanceOf(addr[5].address));
        await usdt.connect(addr[5]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[6]).approve(pSale.address, amountUSD);
        await pSale.connect(addr[5])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, ZERO_ADDRESS);
        let feeContract = await pSale.connect(addr[0]).getFeeContract();
        expect(feeContract).to.equal(10 * 1e6);
        let amountsaleToken = 90 / 0.07 * 0.05;
        expect(await saleToken.balanceOf(addr[5].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)
        //1000000
        //
    });

    it("Test referral program: Should add users in white list, because he he made a payment of more than 100 and send fee to users ", async function () {
        let amountUSD = 100 * 1e6;
        await usdt.connect(addr[5]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[6]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[0]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[9]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[7]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[8]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[10]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[11]).approve(pSale.address, amountUSD * 2);
        await usdt.connect(addr[12]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[13]).approve(pSale.address, amountUSD * 1000);

        await pSale.connect(addr[7])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[0].address);
        let amountsaleToken = 90 / 0.07 * 0.05;
        //[addr7] --> 5% [addr0]  --> 3% [paltform] 2% --> [paltform]
        expect(await saleToken.balanceOf(addr[7].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)

        await pSale.connect(addr[9])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[7].address);
        //[addr9] --> 5% [addr7]  --> 3% [addr0] 2% --> [paltform]
        expect(await usdt.balanceOf(addr[9].address)).to.equal(900 * 1e6);
        expect(await usdt.balanceOf(addr[7].address)).to.equal(905 * 1e6);
        let feeContract = await pSale.connect(addr[0]).getFeeContract();
        expect(feeContract).to.equal(17 * 1e6);

        await pSale.connect(addr[8])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[9].address);
        //[addr8] --> 5% [addr9]  --> 3% [addr7] 2% --> [addr0]
        expect(await usdt.balanceOf(addr[9].address)).to.equal(905 * 1e6);
        expect(await usdt.balanceOf(addr[7].address)).to.equal(908 * 1e6);
        expect(await usdt.balanceOf(addr[8].address)).to.equal(900 * 1e6);


    });

    it("Test referral program: Should add users in white list, because he he made a payment of more than 100 and send fee to users ", async function () {
        let amountUSD = 100 * 1e6;
        await usdt.connect(addr[5]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[6]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[0]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[9]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[7]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[8]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[10]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[11]).approve(pSale.address, amountUSD * 2);
        await usdt.connect(addr[12]).approve(pSale.address, amountUSD);
        await usdt.connect(addr[13]).approve(pSale.address, amountUSD * 1000);

        await pSale.connect(addr[7])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[0].address);
        let amountsaleToken = 90 / 0.07 * 0.05;
        //[addr7] --> 5% [addr0]  --> 3% [paltform] 2% --> [paltform]
        expect(await saleToken.balanceOf(addr[7].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)

        await pSale.connect(addr[9])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[7].address);
        //[addr9] --> 5% [addr7]  --> 3% [addr0] 2% --> [paltform]
        expect(await usdt.balanceOf(addr[9].address)).to.equal(900 * 1e6);
        expect(await usdt.balanceOf(addr[7].address)).to.equal(905 * 1e6);
        let feeContract = await pSale.connect(addr[0]).getFeeContract();
        expect(feeContract).to.equal(17 * 1e6);

        await pSale.connect(addr[8])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[9].address);
        //[addr8] --> 5% [addr9]  --> 3% [addr7] 2% --> [addr0]
        expect(await usdt.balanceOf(addr[9].address)).to.equal(905 * 1e6);
        expect(await usdt.balanceOf(addr[7].address)).to.equal(908 * 1e6);
        expect(await usdt.balanceOf(addr[8].address)).to.equal(900 * 1e6);


        it("Should get price for exchange", async function () {
            await expect(await pSale.connect(addr[0]).getPrice(utils.parseEther('100'))).to.be.equal(126549404);
        });

        it("Should get currency status.The First test point should get true, the second point should get false ", async function () {
            await pSale.connect(addr[0]).getPrice(100);
            expect(await pSale.connect(addr[0]).getCurrencyStatus("0xc2132D05D31c914a87C6611C10748AEb04B58e8F")).to.be.equal(true);  //Use variable let USD 
            expect(await pSale.connect(addr[0]).getCurrencyStatus('0x11ededebf63bef0ea2d2d071bdf88f71543ec6fb')).to.be.equal(false);
        });

        it("Should get info tokens. The fist struct field should get info about MATIC receive, and the second struct field should get info about USD receive ", async function () {
            let info = await pSale.connect(addr[0]).getInfoTokens()
            expect(info[0]).to.equal(0);
            expect(info[1]).to.equal(400 * 1e6);
        });

        it("Test referral program: Should add users in white list, because owner call function addToWhiteList() ", async function () {
            let amountUSD_less = 90 * 1e6;
            let amountUSD = 100 * 1e6;
            await pSale.connect(addr[0]).addToWhiteList(addr[12].address)
            let amountsaleToken = 81 / 0.07 * 0.05;
            await pSale.connect(addr[10])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD_less, addr[8].address);
            //[addr10] --> 5% [addr8]  --> 3% [addr9] 2% --> [addr7]
            expect(await usdt.balanceOf(addr[9].address)).to.equal(907.7 * 1e6); // 2 level
            expect(await usdt.balanceOf(addr[7].address)).to.equal(909.8 * 1e6); // 3 level
            expect(await usdt.balanceOf(addr[8].address)).to.equal(904.5 * 1e6); // 1 level

            await pSale.connect(addr[11])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD_less, addr[10].address);
            //reffer[addr10]
            expect(await usdt.balanceOf(addr[9].address)).to.equal(907.7 * 1e6); // 2 level
            expect(await usdt.balanceOf(addr[7].address)).to.equal(909.8 * 1e6); // 3 level
            expect(await usdt.balanceOf(addr[8].address)).to.equal(904.5 * 1e6); // 1 level
            expect(await usdt.balanceOf(addr[10].address)).to.equal(910 * 1e6);

            expect(await saleToken.balanceOf(addr[11].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)
            expect(await saleToken.balanceOf(addr[10].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)
            await pSale.connect(addr[11])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD_less, addr[12].address);

            expect(await usdt.balanceOf(addr[12].address)).to.equal(4.5 * 1e6); // 1 level
            expect(await usdt.balanceOf(addr[11].address)).to.equal(820 * 1e6);

            expect(await pSale.connect(addr[0]).getFeeContract()).to.be.equal(30.5 * 1e6)
        });

        it("Should get price for exchange", async function () {
            await expect(await pSale.connect(addr[0]).getPrice(utils.parseEther('100'))).to.be.equal(126549404);
        });


        it("Should buy saleToken of MATIC", async function () {

            let amountMATIC = utils.parseEther('10');
            await pSale.connect(addr[2])["buySaleToken(address)"](addr[5].address, { value: amountMATIC });
            expect(await saleToken.balanceOf(addr[2].address)).to.closeTo(utils.parseEther('8.1355725'), 1e15)

            await pSale.connect(addr[2])["buySaleToken(address)"](addr[5].address, { value: amountMATIC });
            expect(await saleToken.balanceOf(addr[2].address)).to.closeTo(utils.parseEther('16.271145'), 1e15)

        });

        it("Should claim amount for the first time and the second time should revert, after 6 month repeat claim will be successful", async function () {

            shiftTime(3600 * 24 * 30 * 6)
            let amountsaleToken = (90 / 0.07 * 0.05) + ((90 / 0.07 - (90 / 0.07 * 0.05)) / 12 * 6)

            await pSale.connect(addr[5]).claim();
            expect(await saleToken.balanceOf(addr[5].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)

            await expect(pSale.connect(addr[5]).claim()).to.revertedWith('ZeroAmount()')
            shiftTime(3600 * 24 * 30 * 12)

            let calcavailableAmount = (90 / 0.07) - amountsaleToken
            let availableAmount = await pSale.connect(addr[5]).getAvailableAmount(addr[5].address)
            expect(utils.parseEther(calcavailableAmount.toString())).to.closeTo(availableAmount, 1e6)

            await pSale.connect(addr[5]).claim();
            amountsaleToken = (90 / 0.07 * 0.05) + ((90 / 0.07 - (90 / 0.07 * 0.05)) / 12 * 12)
            expect(await saleToken.balanceOf(addr[5].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)

        });

        it("Should claim tokens after shiftTime", async function () {

            shiftTime(3600 * 24 * 30 * 66)
            await expect(pSale.connect(addr[5]).claim()).to.revertedWith('ZeroAmount()')
            let amountsaleToken = 90 / 0.07;
            expect(await saleToken.balanceOf(addr[5].address)).to.closeTo(utils.parseEther(amountsaleToken.toString()), 1e6)
            await expect(pSale.connect(addr[5]).claim()).to.revertedWith('ZeroAmount()')

            await pSale.connect(addr[2]).claim();
            expect(await saleToken.balanceOf(addr[2].address)).to.closeTo(utils.parseEther('325.422'), 1e15)  //test

        });
        it("Should withdraw the native currency from the contract ", async function () {
            expect(await pSale.connect(addr[0]).getBalanceContract()).to.be.equal(utils.parseEther('19'));
            await pSale.connect(addr[0]).withdraw(utils.parseEther('19'));
            expect(await pSale.connect(addr[0]).getBalanceContract()).to.be.equal(utils.parseEther('0'));
        });

        it("Should withdraw token from the contract ", async function () {
            await pSale.withdrawToken(token.address, utils.parseEther('100'));
            expect(await token.balanceOf(addr[0].address)).to.be.equal(utils.parseEther('100'))
            expect(await token.balanceOf(pSale.address)).to.be.equal(utils.parseEther('900'))
        });

        it("Should revert function because the deposited amount more max contribution", async function () {
            let amountUSD = 1000000000 * 1e6;
            await expect(pSale.connect(addr[11])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[12].address)).to.be.revertedWith('MinMaxContribution()');
        });

        it("Should revert function because purchased tokens more the totalReward", async function () {
            let amountUSD = 100 * 1e6;
            await expect(pSale.connect(addr[13])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[12].address)).to.be.revertedWith('ExceedingMaxSold()');

            it("Should revert function because the deposited amount more max contribution", async function () {
                let amountUSD = 1000000000 * 1e6;
                await expect(pSale.connect(addr[11])["buySaleToken(address,uint256,address)"](usdt.address, amountUSD, addr[12].address)).to.be.revertedWith('MinMaxContribution()');
            });

            it("Should burn the unsold tokens and revert call the function buySaleToken()", async function () {
                await saleToken.connect(addr[0]).setBurnableRole(pSale.address);
                await pSale.connect(addr[0]).burnUnsoldToken();
            });


        });