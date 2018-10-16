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


  mapping(uint256 => Star) tokenIdToStarInfo; 
  mapping(uint256 => uint256) starsForSale;

  function createStar(string _name, string _story, string _ra, string _dec, string _mag) public { 

    uint256 _tokenId = createMappingKeyHash(_ra, _dec, _mag);    

    Star memory newStar = Star(_name, _story, _ra, _dec, _mag);

    tokenIdToStarInfo[_tokenId] = newStar;

    _mint(msg.sender, _tokenId);
  }

  function getStar(uint256 _tokenId) public view returns (string name, string story, string ra, string dec, string mag) {
    Star memory star = tokenIdToStarInfo[_tokenId];
    name = star.name;
    story = star.story;
    ra = star.ra;
    dec = star.dec;
    mag = star.mag;
    return (name, story, ra, dec, mag);
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
  
  // Convert string coordinates into sha3 key
  function createMappingKeyHash(string _ra, string _dec, string _mag) public pure returns (uint256) {
    bytes32 _bytes32Hash = keccak256(abi.encodePacked(_ra, _dec, _mag));
    return uint256(_bytes32Hash);
  }

}

