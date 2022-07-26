import { expect, util } from "chai";
import { ethers, network } from "hardhat";
import { utils, BigNumber } from "ethers";

import { SaleToken } from "../typechain"


async function getNodeTime() {
    let blockNumber = await ethers.provider.send('eth_blockNumber', []);
    let txBlockNumber = await ethers.provider.send('eth_getBlockByNumber', [blockNumber, false]);
    return txBlockNumber.timestamp.toString()
}

async function shiftTime(newTime: number | string) {
    await ethers.provider.send("evm_increaseTime", [newTime]);
    await ethers.provider.send("evm_mine", []);
}



describe("SaleToken token test", function () {

    let saleToken: SaleToken;
    let addr: any;

    it("Deploy saleToken token", async function () {

        const saleToken = await ethers.getContractFactory("saleToken");
        saleToken = await saleToken.deploy(2, '500000000000000000000000000');
        await saleToken.deployed();

        addr = await ethers.getSigners();
        await saleToken.addAccountInDexList(addr[5].address, true);
        await saleToken.addAccountInDexList(addr[1].address, true);
        await saleToken.grantRole(await saleToken.BURNER_ROLE(), addr[0].address)
        await saleToken.connect(addr[0]).burn(addr[0].address, utils.parseEther('100000000'));

        expect(await saleToken.balanceOf(addr[0].address)).to.eq(utils.parseEther('400000000'));
    });

    it("Should transfer between users ", async function () {
        await saleToken.transfer(addr[1].address, utils.parseEther('100'))

        expect(await saleToken.balanceOf(saleToken.address)).to.be.closeTo(utils.parseEther('1.6'), 1e15);
        expect(await saleToken.balanceOf(addr[0].address)).to.be.closeTo(utils.parseEther('399999900.4'), 1e15);
        expect(await saleToken.balanceOf(addr[1].address)).to.be.closeTo(utils.parseEther('98'), 1e1);

    });

    it("Should transfer between excluded user and included user ", async function () {
        expect(await saleToken.isExcluded(addr[0].address)).to.eq(false);
        expect(await saleToken.isExcluded(addr[1].address)).to.eq(true);
        await saleToken.transfer(addr[1].address, utils.parseEther('100'));
        expect(await saleToken.balanceOf(addr[0].address)).to.be.closeTo(utils.parseEther('399999800.8'), 1e15);
        expect(await saleToken.balanceOf(addr[1].address)).to.be.closeTo(utils.parseEther('196'), 1e1);
    });

    it("Should transfer between excluded user and included user(case2) ", async function () {

        expect(await saleToken.isExcluded(addr[0].address)).to.eq(false);
        expect(await saleToken.isExcluded(addr[1].address)).to.eq(true);
        await saleToken.connect(addr[1]).transfer(addr[0].address, utils.parseEther('100'));
        expect(await saleToken.balanceOf(addr[0].address)).to.be.closeTo(utils.parseEther('399999899.2'), 1e15);
        expect(await saleToken.balanceOf(addr[1].address)).to.be.closeTo(utils.parseEther('96.0'), 1e0);

    });

    it("Should transfer between included three participants", async function () {

        await saleToken.includeAccount(addr[1].address);
        await saleToken.connect(addr[0]).transfer(addr[1].address, utils.parseEther('50'));
        await saleToken.connect(addr[0]).transfer(addr[2].address, utils.parseEther('50'));

        expect(await saleToken.balanceOf(addr[0].address)).to.be.closeTo(utils.parseEther('399999799.399'), 1e15);
        expect(await saleToken.balanceOf(addr[1].address)).to.be.closeTo(utils.parseEther('145.000000370000034963'), 1e15);
        expect(await saleToken.balanceOf(addr[2].address)).to.eq(utils.parseEther('50'));

    });

    it("Should transfer between two included and one excluded participants", async function () {

        await saleToken.excludeAccount(addr[1].address);
        await saleToken.connect(addr[0]).transfer(addr[1].address, utils.parseEther('50'));
        await saleToken.connect(addr[0]).transfer(addr[2].address, utils.parseEther('50'));

        expect(await saleToken.balanceOf(addr[0].address)).to.be.closeTo(utils.parseEther('399999699.599'), 1e15);
        expect(await saleToken.balanceOf(addr[1].address)).to.be.closeTo(utils.parseEther('194.000000370000034963'), 1e15);
        expect(await saleToken.balanceOf(addr[2].address)).to.be.closeTo(utils.parseEther('100.000000020000008024'), 1e15);

    });

    it("Should transfer between three excluded participants", async function () {

        await saleToken.excludeAccount(addr[0].address);
        await saleToken.excludeAccount(addr[2].address);
        expect(await saleToken.isExcluded(addr[0].address)).to.eq(true);
        expect(await saleToken.isExcluded(addr[1].address)).to.eq(true);
        expect(await saleToken.isExcluded(addr[2].address)).to.eq(true);

        await saleToken.connect(addr[2]).transfer(addr[1].address, utils.parseEther('30'));
        await saleToken.connect(addr[2]).transfer(addr[0].address, utils.parseEther('30'));

        expect(await saleToken.balanceOf(addr[0].address)).to.be.closeTo(utils.parseEther('399999729.599'), 1e15);
        expect(await saleToken.balanceOf(addr[1].address)).to.be.closeTo(utils.parseEther('223.400000370000034963'), 1e14);
        expect(await saleToken.balanceOf(addr[2].address)).to.be.closeTo(utils.parseEther('40.000000020000008024'), 1e14);

    });

    it("Should get accumulated fee", async function () {

        await saleToken.connect(addr[0]).transfer(addr[2].address, utils.parseEther('100'));
        expect(await saleToken.getBuyback()).to.eq(utils.parseEther('2.58'));
        expect(await saleToken.getCommunityRewardPool()).to.eq(utils.parseEther('2.58'));
        expect(await saleToken.getProvideLiquidity()).to.eq(utils.parseEther('1.72'));
        expect(await saleToken.getFeePecent()).to.eq('2');
        let ownerAddr = await saleToken.getOwner();
        expect(ownerAddr).to.equal(addr[0].address);

    });

    it("Should withdraw accumulated fee", async function () {

        let dao_role = await saleToken.DAO_ROLE();
        await saleToken.connect(addr[0]).grantRole(dao_role, addr[12].address);

        let communityRewardPool = await saleToken.getCommunityRewardPool();
        await saleToken.connect(addr[12]).withdrawCommunityRewardPool(addr[6].address);
        expect(communityRewardPool).to.eq(await saleToken.balanceOf(addr[6].address));

        let provideLiquidity = await saleToken.getProvideLiquidity();
        await saleToken.connect(addr[12]).withdrawProvideLiquidity(addr[7].address);
        expect(provideLiquidity).to.eq(await saleToken.balanceOf(addr[7].address));

        let withdrawBuyback = await saleToken.getBuyback();
        await saleToken.connect(addr[12]).withdrawBuyback(addr[8].address);
        expect(withdrawBuyback).to.eq(await saleToken.balanceOf(addr[8].address));

        await saleToken.connect(addr[0]).withdrawDistribute(addr[9].address);
        expect(await saleToken.balanceOf(addr[9].address)).to.eq(utils.parseEther('0.120000015600000015'));

    });

    it("Should withdraw and transfer accumulated fee", async function () {

        let dex1 = addr[1].address;

        await saleToken.transfer(dex1, utils.parseEther('100'))
        expect(await saleToken.balanceOf(dex1)).to.be.closeTo(utils.parseEther('321.400'), 1e15);

        await saleToken.transfer(addr[10].address, utils.parseEther('100'))
        expect(await saleToken.balanceOf(addr[10].address)).to.be.closeTo(utils.parseEther('100'), 1e1);

        await saleToken.connect(addr[0]).withdrawDistribute(addr[9].address);
        expect(await saleToken.balanceOf(addr[9].address)).to.eq(utils.parseEther('0.20000001618046513'));

        let communityRewardPool = await saleToken.getCommunityRewardPool();
        await saleToken.connect(addr[12]).withdrawCommunityRewardPool(addr[13].address);
        expect(communityRewardPool).to.eq(await saleToken.balanceOf(addr[13].address));

        let provideLiquidity = await saleToken.getProvideLiquidity();
        await saleToken.connect(addr[12]).withdrawProvideLiquidity(addr[14].address);
        expect(provideLiquidity).to.eq(await saleToken.balanceOf(addr[14].address));

        let withdrawBuyback = await saleToken.getBuyback();
        await saleToken.connect(addr[12]).withdrawBuyback(addr[15].address);
        expect(withdrawBuyback).to.eq(await saleToken.balanceOf(addr[15].address));

        expect(await saleToken.balanceOf(saleToken.address)).to.eq(0);

    });
});
