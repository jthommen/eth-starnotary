pragma solidity >=0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract StarNotary is ERC721 { 

  struct Star { 
    string name;
    string story;
    string ra;
    string dec;
    string mag;
    bool exists;
  }

  mapping(uint256 => Star) tokenIdToStarInfoMap; 
  mapping(uint256 => uint256) starsForSaleMap;

  //Modifier: Ensure stars are only claimed once
  modifier uniqueStar(string memory _ra, string memory _dec, string memory _mag) {
    uint256 starKey = createMappingKeyHash(_ra, _dec, _mag);
    bool starExists = tokenIdToStarInfoMap[starKey].exists;
    require(!starExists, "Star already registered.");
    _;
  }

  function checkIfStarExist(string memory _ra, string memory _dec, string memory _mag) public view returns (bool exists){
    uint256 starKey = createMappingKeyHash(_ra, _dec, _mag);
    bool starExists = tokenIdToStarInfoMap[starKey].exists;
    if(starExists) {
      return true;
    } else {
      return false;
    }
  }

  function createStar(string memory _name, string memory _story, string memory _ra, string memory _dec, string memory _mag) public uniqueStar(_ra, _dec, _mag) { 
    uint256 _tokenId = createMappingKeyHash(_ra, _dec, _mag);    
    Star memory newStar = Star(_name, _story, _ra, _dec, _mag, true);
    tokenIdToStarInfoMap[_tokenId] = newStar;
    _mint(msg.sender, _tokenId);
  }

  function tokenIdToStarInfo(uint256 _tokenId) public view returns (string memory name, string memory story, string memory ra, string memory dec, string memory mag) {
    Star memory star = tokenIdToStarInfoMap[_tokenId];
    name = star.name;
    story = star.story;
    ra = star.ra;
    dec = star.dec;
    mag = star.mag;
    return (name, story, ra, dec, mag);
  }

  function getStarForSale(uint256 _tokenId) public view returns (uint256 price) {
    return starsForSaleMap[_tokenId];
  }

  function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
    require(this.ownerOf(_tokenId) == msg.sender, "Must be the owner to sell a star.");

    starsForSaleMap[_tokenId] = _price;
  }

  function buyStar(uint256 _tokenId) public payable { 
    require(starsForSaleMap[_tokenId] > 0, "Star must be up for sale.");
    
    uint256 starCost = starsForSaleMap[_tokenId];
    address starOwner = this.ownerOf(_tokenId);
    require(msg.value >= starCost, "Not enough money available to buy the star.");

    _transferFrom(starOwner, msg.sender, _tokenId);

    if(msg.value > starCost) { 
      msg.sender.transfer(msg.value - starCost);
    }
  }
  
  // Convert string coordinates into sha3 key
  function createMappingKeyHash(string memory _ra, string memory _dec, string memory _mag) public pure returns (uint256) {
    bytes32 _bytes32Hash = keccak256(abi.encodePacked(_ra, _dec, _mag));
    return uint256(_bytes32Hash);
  }

}
