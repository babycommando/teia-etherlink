// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Teia1155 is ERC1155Supply, ERC2981, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE  = keccak256("PAUSER_ROLE");

    mapping(uint256 => string) private _uris;

    constructor(
        string memory _baseUri,
        address admin,
        uint96 defaultRoyaltyBps
    ) ERC1155(_baseUri) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _setDefaultRoyalty(admin, defaultRoyaltyBps);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data,
        uint96 royaltyBps,
        string memory uri_
    ) external onlyRole(MINTER_ROLE) {
        require(!paused(), "Teia1155: Contract is paused");
        _mint(to, id, amount, data);

        if (bytes(uri_).length > 0) {
            _uris[id] = uri_;
            emit URI(uri_, id);
        }

        if (royaltyBps > 0) {
            _setTokenRoyalty(id, to, royaltyBps);
        }
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        require(!paused(), "Teia1155: Contract is paused");
        _mintBatch(to, ids, amounts, data);
    }

    function setTokenURI(uint256 id, string calldata newURI) 
        external onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _uris[id] = newURI;
        emit URI(newURI, id);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function uri(uint256 id) public view override returns (string memory) {
        string memory tokenUri = _uris[id];
        return bytes(tokenUri).length > 0 ? tokenUri : super.uri(id);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
