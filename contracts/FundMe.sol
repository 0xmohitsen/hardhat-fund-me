// SPDX-License-Identifier: MIT
// Pragma
pragma solidity ^0.8.27;
// Imports
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
// Error Codes
error FundMe__NotOwner();

// Interfaces, Libraries, Contracts

/**
 * @title A contract for crowd funding
 * @author Mohit Sen
 * @notice This contract is to demo a sample funding contract
 * @dev This implements price feeds as our library
 */

contract FundMe {
    // Type Declarations
    using PriceConverter for uint256;

    // State Variables!
    mapping(address => uint256) public addressToAmountFunded;
    address[] public funders;

    // Could we make this constant?  /* hint: no! We should make it immutable! */
    address public immutable i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;

    AggregatorV3Interface public priceFeed;

    modifier onlyOwner() {
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }

    // Function Order
    //// constructor
    ////receive
    ////fallback
    ////external
    ////public
    ////internal
    ////private
    ////view / pure

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /**
     * @notice This function funds this contract
     * @dev This implements price feeds as our library
     */

    function fund() public payable {
        require(
            msg.value.getConversionRate(priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH!"
        );
        addressToAmountFunded[msg.sender] = msg.value;
        funders.push(msg.sender);
    }

    function withdraw() public onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }

        funders = new address[](0);
        // // transfer
        // payable(msg.sender).transfer(address(this).balance);
        // // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");
        // call

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }
}

// Concepts we didn't cover yet (will cover in later sections)
// 1. Enum
// 2. Events
// 3. Try / Catch
// 4. Function Selector
// 5. abi.encode / decode
// 6. Hash with keccak256
// 7. Yul / Assembly
