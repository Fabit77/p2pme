// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { IP2PIntegrator } from "../../interfaces/IP2PIntegrator.sol";
import { IB2BGateway } from "../../interfaces/IB2BGateway.sol";
import { UserProxy } from "../../base/UserProxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FondoTreasuryIntegrator
 * @notice P2P checkout integrator that settles every completed order into one
 *         immutable Fondo treasury. Campaign ownership and balances are kept
 *         in Fondo's application ledger; they are intentionally not trusted
 *         as on-chain routing inputs.
 *
 * @dev Register this contract with `usdcThroughIntegrator = true`. The P2P
 *      Diamond transfers settlement USDC to this contract and calls
 *      `onOrderComplete`, which forwards the exact order amount to `treasury`.
 */
contract FondoTreasuryIntegrator is IP2PIntegrator, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OnlyDiamond();
    error OnlyOwner();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidLimit();
    error LimitExceedsCeiling();
    error PlacementInProgress();
    error UnexpectedValidation();
    error ValidationMismatch();
    error MissingValidation();
    error DuplicateOrderId();
    error UnknownOrder();
    error OrderMismatch();
    error OrderAlreadyFulfilled();
    error OrderAlreadyCancelled();

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed user,
        uint256 amount,
        bytes32 indexed currency
    );
    event OrderCompleted(
        uint256 indexed orderId,
        address indexed user,
        uint256 amount,
        address indexed treasury
    );
    event OrderCancelled(uint256 indexed orderId, address indexed user);
    event UserProxyDeployed(address indexed user, address proxy);
    event MaxTxAmountUpdated(uint256 amount);
    event DailyTxCountLimitUpdated(uint256 count);
    event StrandedUsdcRecovered(uint256 amount, address indexed treasury);

    address public immutable diamond;
    IERC20 public immutable usdc;
    address public immutable treasury;
    address public immutable owner;
    address public immutable proxyImpl;

    /// @notice Immutable policy ceilings. The owner may tighten limits, but a
    ///         compromised owner key cannot raise them beyond these bounds.
    uint256 public constant MAX_TX_AMOUNT_CEILING = 1_000e6;
    uint256 public constant MAX_DAILY_TX_COUNT_LIMIT = 100;

    uint256 public maxTxAmount;
    uint256 public dailyTxCountLimit;

    struct PendingPlacement {
        uint256 amount;
        bytes32 currency;
        bool active;
        bool validated;
    }

    struct CheckoutSession {
        address user;
        bool fulfilled;
        bool cancelled;
        uint32 placementDay;
        uint256 usdcAmount;
        bytes32 currency;
    }

    mapping(address => PendingPlacement) private pendingPlacements;
    mapping(uint256 => CheckoutSession) public sessions;
    mapping(address => mapping(uint256 => uint256)) public userDailyCount;

    modifier onlyDiamond() {
        if (msg.sender != diamond) revert OnlyDiamond();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        address _diamond,
        address _usdc,
        address _treasury,
        uint256 _maxTxAmount,
        uint256 _dailyTxCountLimit
    ) {
        if (_diamond == address(0) || _usdc == address(0) || _treasury == address(0)) {
            revert InvalidAddress();
        }
        if (_maxTxAmount == 0 || _dailyTxCountLimit == 0) revert InvalidLimit();
        if (
            _maxTxAmount > MAX_TX_AMOUNT_CEILING ||
            _dailyTxCountLimit > MAX_DAILY_TX_COUNT_LIMIT
        ) revert LimitExceedsCeiling();

        diamond = _diamond;
        usdc = IERC20(_usdc);
        treasury = _treasury;
        owner = msg.sender;
        maxTxAmount = _maxTxAmount;
        dailyTxCountLimit = _dailyTxCountLimit;
        proxyImpl = address(new UserProxy());
    }

    function setMaxTxAmount(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidLimit();
        if (amount > MAX_TX_AMOUNT_CEILING) revert LimitExceedsCeiling();
        maxTxAmount = amount;
        emit MaxTxAmountUpdated(amount);
    }

    function setDailyTxCountLimit(uint256 count) external onlyOwner {
        if (count == 0) revert InvalidLimit();
        if (count > MAX_DAILY_TX_COUNT_LIMIT) revert LimitExceedsCeiling();
        dailyTxCountLimit = count;
        emit DailyTxCountLimitUpdated(count);
    }

    /**
     * @notice Places a dynamic-amount P2P BUY order for the connected user.
     * @param amount Exact USDC amount in 6-decimal base units.
     */
    function userPlaceOrder(
        uint256 amount,
        bytes32 currency,
        uint256 circleId,
        string calldata pubKey,
        uint256 preferredPaymentChannelConfigId,
        uint256 fiatAmountLimit
    ) external nonReentrant returns (uint256 orderId) {
        if (amount == 0) revert InvalidAmount();

        PendingPlacement storage pending = pendingPlacements[msg.sender];
        if (pending.active) revert PlacementInProgress();
        pending.amount = amount;
        pending.currency = currency;
        pending.active = true;
        pending.validated = false;

        address proxy = _ensureProxy(msg.sender);
        bytes memory data = abi.encodeCall(
            IB2BGateway.placeB2BOrder,
            (
                msg.sender,
                amount,
                currency,
                address(this),
                pubKey,
                circleId,
                preferredPaymentChannelConfigId,
                fiatAmountLimit
            )
        );
        bytes memory result = UserProxy(proxy).execute(diamond, data, address(usdc), 0);
        orderId = abi.decode(result, (uint256));

        if (!pending.validated) revert MissingValidation();
        delete pendingPlacements[msg.sender];

        if (sessions[orderId].user != address(0)) revert DuplicateOrderId();
        sessions[orderId] = CheckoutSession({
            user: msg.sender,
            fulfilled: false,
            cancelled: false,
            placementDay: uint32(block.timestamp / 1 days),
            usdcAmount: amount,
            currency: currency
        });

        emit OrderPlaced(orderId, msg.sender, amount, currency);
    }

    function validateOrder(
        address user,
        uint256 amount,
        bytes32 currency
    ) external onlyDiamond returns (bool allowed) {
        PendingPlacement storage pending = pendingPlacements[user];
        if (!pending.active || pending.validated) revert UnexpectedValidation();
        if (pending.amount != amount || pending.currency != currency) revert ValidationMismatch();
        if (amount > maxTxAmount) return false;

        uint256 day = block.timestamp / 1 days;
        uint256 count = userDailyCount[user][day];
        if (count >= dailyTxCountLimit) return false;

        userDailyCount[user][day] = count + 1;
        pending.validated = true;
        return true;
    }

    function onOrderComplete(
        uint256 orderId,
        address user,
        uint256 amount,
        address recipientAddr
    ) external onlyDiamond {
        CheckoutSession storage session = sessions[orderId];
        if (session.user == address(0)) revert UnknownOrder();
        if (session.fulfilled) revert OrderAlreadyFulfilled();
        if (session.cancelled) revert OrderAlreadyCancelled();
        if (
            session.user != user ||
            session.usdcAmount != amount ||
            recipientAddr != address(this)
        ) revert OrderMismatch();

        session.fulfilled = true;
        usdc.safeTransfer(treasury, amount);

        emit OrderCompleted(orderId, user, amount, treasury);
    }

    function onOrderCancel(uint256 orderId) external onlyDiamond {
        CheckoutSession storage session = sessions[orderId];
        if (session.user == address(0) || session.fulfilled || session.cancelled) return;

        session.cancelled = true;
        uint256 day = uint256(session.placementDay);
        uint256 count = userDailyCount[session.user][day];
        if (count > 0) userDailyCount[session.user][day] = count - 1;

        emit OrderCancelled(orderId, session.user);
    }

    /**
     * @notice Recovers settlement USDC left behind if a best-effort Diamond
     *         callback failed. Funds can only go to the immutable treasury.
     */
    function recoverStrandedUsdc() external onlyOwner nonReentrant {
        uint256 amount = usdc.balanceOf(address(this));
        if (amount == 0) return;
        usdc.safeTransfer(treasury, amount);
        emit StrandedUsdcRecovered(amount, treasury);
    }

    function getRemainingDailyCount(address user) external view returns (uint256) {
        uint256 count = userDailyCount[user][block.timestamp / 1 days];
        if (count >= dailyTxCountLimit) return 0;
        return dailyTxCountLimit - count;
    }

    function proxyAddress(address user) public view returns (address) {
        return
            Clones.predictDeterministicAddressWithImmutableArgs(
                proxyImpl,
                _proxyArgs(user),
                _salt(user),
                address(this)
            );
    }

    function _salt(address user) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(user)));
    }

    function _proxyArgs(address user) internal view returns (bytes memory) {
        return abi.encodePacked(user, address(this));
    }

    function _ensureProxy(address user) internal returns (address proxy) {
        proxy = proxyAddress(user);
        if (proxy.code.length == 0) {
            address deployed = Clones.cloneDeterministicWithImmutableArgs(
                proxyImpl,
                _proxyArgs(user),
                _salt(user)
            );
            assert(deployed == proxy);
            emit UserProxyDeployed(user, proxy);
        }
    }
}
