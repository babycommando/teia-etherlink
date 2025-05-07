// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./teia1155.sol";   // path as in your repo

contract TeiaMarketplace is IERC1155Receiver, ReentrancyGuard {
    using Address for address payable;

    /* ------------------------------------------------------------ */
    /*                          Types                               */
    /* ------------------------------------------------------------ */

    struct Swap {
        address issuer;
        uint256 id;
        uint256 amount;   // editions still escrowed
        uint256 price;    // wei per edition
        uint16  royalty;  // ‰
        address creator;  // royalty recipient
    }

    /* ------------------------------------------------------------ */
    /*                       Immutable refs                         */
    /* ------------------------------------------------------------ */

    Teia1155 public immutable teia;  // the single ERC‑1155 collection

    /* ------------------------------------------------------------ */
    /*                          Storage                             */
    /* ------------------------------------------------------------ */

    mapping(uint256 => Swap) public swaps;
    uint256 public counter;

    uint16  public fee;           // marketplace fee ‰
    address public feeRecipient;

    address public manager;
    address public proposedManager;

    bool public swapsPaused;
    bool public collectsPaused;

    /* ------------------------------------------------------------ */
    /*                          Events                              */
    /* ------------------------------------------------------------ */

    event EditionMinted(address indexed artist, uint256 tokenId, uint256 amount);
    event SwapCreated(uint256 indexed id, address indexed issuer, uint256 amount, uint256 price);
    event SwapCollected(uint256 indexed id, address indexed buyer);
    event SwapCancelled(uint256 indexed id);
    event ManagerTransferProposed(address indexed newManager);
    event ManagerAccepted(address indexed newManager);

    /* ------------------------------------------------------------ */
    /*                        Modifiers                             */
    /* ------------------------------------------------------------ */

    modifier onlyManager() {
        require(msg.sender == manager, "MP_NOT_MANAGER");
        _;
    }

    /* ------------------------------------------------------------ */
    /*                       Constructor                            */
    /* ------------------------------------------------------------ */

    constructor(
        address _teia1155,
        address _manager,
        uint16  _fee,            // 25 → 2.5 %
        address _feeRecipient
    ) {
        require(_fee <= 250, "MP_FEE_TOO_HIGH");
        teia          = Teia1155(_teia1155);
        manager       = _manager;
        fee           = _fee;
        feeRecipient  = _feeRecipient;
    }

    /* ------------------------------------------------------------ */
    /*                       Minting proxy                          */
    /* ------------------------------------------------------------ */
    /// Artists call this to mint to themselves.
    /// Marketplace must already hold MINTER_ROLE.
    function mintEdition(
        uint256 tokenId,
        uint256 amount,
        string  calldata uri,
        uint16  royaltyBps          // ‰
    ) external nonReentrant {
        teia.mint(
            msg.sender,
            tokenId,
            amount,
            "",
            royaltyBps,
            uri
        );
        emit EditionMinted(msg.sender, tokenId, amount);
    }

    /* ------------------------------------------------------------ */
    /*                          Swaps                               */
    /* ------------------------------------------------------------ */

    function createSwap(
        uint256 tokenId,
        uint256 amount,
        uint256 price,        // wei per edition
        uint16  royalty,      // ‰ (copied for convenience)
        address creator
    ) external nonReentrant {
        require(!swapsPaused, "MP_SWAPS_PAUSED");
        require(amount > 0,   "MP_AMOUNT_ZERO");

        // Artist must have given setApprovalForAll beforehand
        teia.safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );

        swaps[counter] = Swap({
            issuer  : msg.sender,
            id      : tokenId,
            amount  : amount,
            price   : price,
            royalty : royalty,
            creator : creator
        });

        emit SwapCreated(counter, msg.sender, amount, price);
        counter++;
    }

    function collect(uint256 swapId, uint256 quantity)
        external payable nonReentrant
    {
        Swap storage s = swaps[swapId];
        require(!collectsPaused, "MP_COLLECTS_PAUSED");
        require(s.amount >= quantity,  "MP_NOT_ENOUGH_LEFT");
        require(msg.value == s.price * quantity, "MP_WRONG_ETH");

        uint256 total = msg.value;
        uint256 royaltyAmt = (total * s.royalty) / 1000;
        uint256 feeAmt     = (total * fee) / 1000;
        uint256 sellerAmt  = total - royaltyAmt - feeAmt;

        if (royaltyAmt > 0) payable(s.creator).sendValue(royaltyAmt);
        if (feeAmt     > 0) payable(feeRecipient).sendValue(feeAmt);
        payable(s.issuer).sendValue(sellerAmt);

        teia.safeTransferFrom(
            address(this),
            msg.sender,
            s.id,
            quantity,
            ""
        );

        s.amount -= quantity;
        if (s.amount == 0) delete swaps[swapId];

        emit SwapCollected(swapId, msg.sender);
    }

    function cancelSwap(uint256 swapId) external nonReentrant {
        Swap storage s = swaps[swapId];
        require(s.issuer == msg.sender, "MP_NOT_ISSUER");

        teia.safeTransferFrom(address(this), s.issuer, s.id, s.amount, "");
        delete swaps[swapId];

        emit SwapCancelled(swapId);
    }

    /* ------------------------------------------------------------ */
    /*                   Manager / admin ops                        */
    /* ------------------------------------------------------------ */

    function updateFee(uint16 newFee) external onlyManager {
        require(newFee <= 250, "MP_FEE_TOO_HIGH");
        fee = newFee;
    }

    function updateFeeRecipient(address newRecipient) external onlyManager {
        feeRecipient = newRecipient;
    }

    function setPauseSwaps(bool pause_)    external onlyManager { swapsPaused    = pause_; }
    function setPauseCollects(bool pause_) external onlyManager { collectsPaused = pause_; }

    function transferManager(address newManager) external onlyManager {
        proposedManager = newManager;
        emit ManagerTransferProposed(newManager);
    }

    function acceptManager() external {
        require(msg.sender == proposedManager, "MP_NOT_PROPOSED");
        manager = proposedManager;
        proposedManager = address(0);
        emit ManagerAccepted(manager);
    }

    /* ------------------------------------------------------------ */
    /*                IERC1155Receiver stubs                        */
    /* ------------------------------------------------------------ */

    function onERC1155Received(
        address, address, uint256, uint256, bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address, address, uint256[] calldata, uint256[] calldata, bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 iid)
        public pure override returns (bool)
    {
        return iid == type(IERC1155Receiver).interfaceId;
    }
}
