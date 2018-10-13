pragma solidity ^0.4.23;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract StarNotary is ERC721 { 

  struct Star { 
    string name;
    string story;
    string ra;
    string dec;
    string mag;
  }

  uint256 public tokenCount;

  mapping(uint256 => Star) public tokenIdToStarInfo; 
  mapping(uint256 => uint256) public starsForSale;

  function createStar(string _name, string _story, string _ra, string _dec, string _mag) public { 
    tokenCount++;
    uint256 _tokenId = tokenCount;
    Star memory newStar = Star(_name, _story, _ra, _dec, _mag);

    tokenIdToStarInfo[_tokenId] = newStar;

    _mint(msg.sender, _tokenId);
  }

  function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
    require(this.ownerOf(_tokenId) == msg.sender, "Must be the owner to sell a star.");

    starsForSale[_tokenId] = _price;
  }

  function buyStar(uint256 _tokenId) public payable { 
    require(starsForSale[_tokenId] > 0, "Star must be up for sale.");
    
    uint256 starCost = starsForSale[_tokenId];
    address starOwner = this.ownerOf(_tokenId);
    require(msg.value >= starCost, "Not enough money available to buy the star.");

    _removeTokenFrom(starOwner, _tokenId);
    _addTokenTo(msg.sender, _tokenId);
    
    starOwner.transfer(starCost);

    if(msg.value > starCost) { 
      msg.sender.transfer(msg.value - starCost);
    }
  }

}