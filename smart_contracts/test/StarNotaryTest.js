const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => {
  
  // Error catching from solidity
  let catchRevert = require("./exceptions.js").catchRevert;
  let defaultAccount = accounts[0];

  // Instantiates a new, fresh contract for every test
  beforeEach(async function() { 
      this.contract = await StarNotary.new({from: defaultAccount});
  })
    
  describe('can create a star', () => {
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
        await this.contract.getStar(producedHash), 
        ['First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1'], 'Returned star info should be equal.');
    });

    it('should abort with a revert error', async function() {
      await catchRevert(this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1}));
    });

  });

  describe('buying and selling stars', () => { 
    let user1 = accounts[1]
    let user2 = accounts[2]
    let randomMaliciousUser = accounts[3]
    
    let starId;
    let starPrice = web3.toWei(.01, 'ether')

    beforeEach(async function () { 
      await this.contract.createStar('First Star', 'Awesome star!', 'ra_1', 'dec_1', 'mag_1', {from: user1});
      starId = await this.contract.createMappingKeyHash('ra_1', 'dec_1', 'mag_1');    
    });

    it('user1 can put up their star for sale', async function () { 
      assert.equal(await this.contract.ownerOf(starId), user1)
      await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
      assert.equal(await this.contract.starsForSale(starId), starPrice)
    })

    describe('user2 can buy a star that was put up for sale', () => { 
      beforeEach(async function () { 
          await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
      })

      it('user2 is the owner of the star after they buy it', async function() { 
        await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
        assert.equal(await this.contract.ownerOf(starId), user2)
      })

      it('user2 ether balance changed correctly', async function () { 
        let overpaidAmount = web3.toWei(.05, 'ether')
        const balanceBeforeTransaction = web3.eth.getBalance(user2)
        await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
        const balanceAfterTransaction = web3.eth.getBalance(user2)

        assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
      })
    })
  })

});
