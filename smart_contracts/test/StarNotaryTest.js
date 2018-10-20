const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => {
  
  // Error catching from solidity
  let catchRevert = require("./exceptions.js").catchRevert;
  let defaultAccount = accounts[0];

  // Instantiates a new, fresh contract for every test
  beforeEach(async function() { 

      // Don't use arrow function to keep accessing this.contract here
      this.contract = await StarNotary.new({from: defaultAccount});
  })
    
  describe('can create a star', function() {
    let user1 = accounts[1];
    let producedHash;

    beforeEach(async function()  {
      await this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1});
      await this.contract.createStar('Second Star', 'Awesome star!', 'ra_2', 'dec_2', 'mag_2', {from: user1})        
      
      //producedHash typeof(object) -> BigNumber because JS numbers are too small for Ethereum use cases
      // BigNumber {
      //   s: 1,
      //   e: 76,
      //   c: 
      //    [ 6999614,
      //      48740366926856,
      //      2125653978499,
      //      54597189878492,
      //      4157612983026,
      //      15432057850125
      //     ]
      // }
      producedHash = await this.contract.createMappingKeyHash('ra_1', 'dec_1', 'mag_1');
    });

    it('can generate the right hash', async function() {
      const testHash = 69996144874036692685602125653978499545971898784920415761298302615432057850125;
      assert.equal(producedHash.toNumber(), testHash);
      assert.equal(producedHash, testHash, 'Hashes generated from coordinates should be equal.');
    });

    it('can create a star and get its data', async function() {
      assert.deepEqual(
        await this.contract.tokenIdToStarInfo(producedHash), 
        ['First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1'], 'Returned star info should be equal.');
    });

    it('can check if star exists', async function() {
      assert.isTrue(await this.contract.checkIfStarExist('ra_1', 'dec_1', 'mag_1'));
      assert.isFalse(await this.contract.checkIfStarExist('1', '2', '3'));
    });

    it('registering existing star should abort with a revert error', async function() {
      await catchRevert(this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1}));
    });

  });


  describe('star ownership', function() {
    let user1 = accounts[1]
    let user2 = accounts[2]
    let starId;

    beforeEach(async function() {
      await this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1});
      starId = await this.contract.createMappingKeyHash('ra_1', 'dec_1', 'mag_1');
    });

    it('user1 should be the owner after toking minting', async function() {
      assert.equal(await this.contract.ownerOf(starId), user1);
    });
  });

  describe('approval rights', function() {
    let user1 = accounts[1];
    let user2 = accounts[2];

    let starId;
    let starId2;
    
    let starPrice = web3.toWei(.01, 'ether');

    beforeEach(async function() { 
      await this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1});
      starId = await this.contract.createMappingKeyHash('ra_1', 'dec_1', 'mag_1');    
    });

    describe('can transfer single star rights', function() {

      beforeEach(async function() {
        await this.contract.approve(user2, starId, {from: user1});
      });

      it('user1 can transfer the star rights', async function() {
        let approvedAddress = await this.contract.getApproved(starId);
        assert.equal(user2, approvedAddress);
      });

      it('user2 can transfer the star', async function() {
        await this.contract.safeTransferFrom(user1, user2, starId, {from: user2});
        assert.equal(await this.contract.ownerOf(starId), user2);
      });

    });

    describe('can transfer multiple star rights', function() {

      beforeEach(async function() {
        await this.contract.createStar('Second Star', 'Awesome star!', 'ra_2', 'dec_2', 'mag_2', {from: user1});
        starId2 = await this.contract.createMappingKeyHash('ra_2', 'dec_2', 'mag_2');
        await this.contract.setApprovalForAll(user2, true, {from: user1});
      });

      it('user1 can transfer all rights to user 2', async function() {
        assert.isTrue(await this.contract.isApprovedForAll(user1, user2));
      });

      it('user2 can transfer all stars', async function() {
        await this.contract.safeTransferFrom(user1, user2, starId2, {from: user2});
        assert.equal(await this.contract.ownerOf(starId2), user2);
      });

    });
  });


  describe('buying and selling stars', function() { 
    let user1 = accounts[1];
    let user2 = accounts[2];
    
    let starId;
    let starPrice = web3.toWei(.01, 'ether');

    beforeEach(async function() { 
      await this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1});
      starId = await this.contract.createMappingKeyHash('ra_1', 'dec_1', 'mag_1');    
    });

    it('user1 can put up their star for sale', async function () { 
      assert.equal(await this.contract.ownerOf(starId), user1)
      await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
      assert.equal(await this.contract.getStarForSale(starId), starPrice)
    });

    describe('user2 can buy a star that was put up for sale', function() { 
      beforeEach(async function () { 
          await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
      });

      it('user2 is the owner of the star after they buy it', async function() { 
        await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
        assert.equal(await this.contract.ownerOf(starId), user2)
      });

      it('user2 ether balance changed correctly', async function () { 
        let overpaidAmount = web3.toWei(.05, 'ether')
        const balanceBeforeTransaction = web3.eth.getBalance(user2)
        await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
        const balanceAfterTransaction = web3.eth.getBalance(user2)

        assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
      });
    });
  });

});
