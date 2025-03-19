// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Trusty Multisignature
 * @author Ramzi Bougammoura
 * @notice This contract is inherithed by Trusty Factory deployer
 * @dev All function calls are meant to be called from the Factory, but the contract can also be deployed alone
 * Copyright (c) 2024 Ramzi Bougammoura
 */
contract Trusty is ReentrancyGuard {
    string public id;

    //Events
    event Deposit(address indexed sender, uint amount, uint balance);
    event SubmitTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);

    error TimeLock(string err,int blockLeft);

    // Variable Slots
    address proxy;
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;     
        uint blockHeight;
        uint timestamp;
        bool exists;
        uint index;
    }

    uint txIndex = 0;

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    mapping(uint => Transaction) public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(transactions[_txIndex].exists, "tx does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    // Constructor
    constructor(
        address[] memory _owners, 
        uint _numConfirmationsRequired, 
        string memory _id
    ) {
        require(_owners.length > 0, "owners required");
        
        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "invalid number of required confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;

            owners.push(owner);
        }

        proxy = msg.sender;

        numConfirmationsRequired = _numConfirmationsRequired;

        id = _id;
    }

    function getCaller(address sender, address source) internal view returns(address) {
        if (sender == proxy) {
            return source;
        } else {
            return sender;
        }
    }

    /**
    * @notice Method used to submit a transaction proposal that will be seen by the others multisignature's owners
    * @param _to Address that will receive the tx or the contract that receive the interaction
    * @param _value Amount of ether to send
    * @param _data Optional data field or calldata to another contract
    * @dev _data can be used as "bytes memory" or "bytes calldata"
    */
    function submitTransaction(address _to, uint _value, bytes calldata _data) public onlyOwner {
        transactions[txIndex] =
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                blockHeight: block.number,
                timestamp: block.timestamp,
                exists: true,
                index: txIndex
            })
        ;

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);

        txIndex++;
    }

    function submitTransaction(address caller, address _to, uint _value, bytes calldata _data) public /* onlyOwner */ {
        address origin = getCaller(msg.sender, caller);

        require(isOwner[origin], "not owner");

        transactions[txIndex] =
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0,
                blockHeight: block.number,
                timestamp: block.timestamp,
                exists: true,
                index: txIndex
            })
        ;

        emit SubmitTransaction(origin, txIndex, _to, _value, _data);

        txIndex++;
    }

    /**
    * @notice Method used to confirm the transaction with index `_txIndex` if exists, not executed and not confirmed.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function confirmTransaction(uint _txIndex) 
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function confirmTransaction(address caller, uint _txIndex) public txExists(_txIndex) notExecuted(_txIndex) {
        address origin = getCaller(msg.sender, caller);

        require(isOwner[origin], "not owner");

        require(!isConfirmed[_txIndex][origin], "tx already confirmed");

        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][origin] = true;

        emit ConfirmTransaction(origin, _txIndex);
    }

    /**
    * @notice Method used to revoke confirmation of transaction with index `_txIndex` if exists and not executed.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function revokeConfirmation(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    function revokeConfirmation(address caller, uint _txIndex) public txExists(_txIndex) notExecuted(_txIndex) {
        address origin = getCaller(msg.sender, caller);

        require(isOwner[origin], "not owner");

        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][origin], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][origin] = false;

        emit RevokeConfirmation(origin, _txIndex);
    }

    /**
    * @notice Method used to execute the transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @param _txIndex The index of the transaction that needs to be signed and confirmed
    */
    function executeTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        nonReentrant() 
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        
        require(success, "tx failed");

        transaction.executed = true;
        
        transaction.timestamp = block.timestamp;
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(address caller, uint _txIndex)
        public
        txExists(_txIndex)
        notExecuted(_txIndex)
        nonReentrant() 
    {
        address origin = getCaller(msg.sender, caller);

        require(isOwner[origin], "not owner");
        
        Transaction storage transaction = transactions[_txIndex];
        
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "cannot execute tx due to number of confirmation required"
        );

        transaction.executed = true;
        
        transaction.timestamp = block.timestamp;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        
        require(success, "tx failed");
        
        emit ExecuteTransaction(origin, _txIndex);
    }

    /**
    * @notice Method used to execute the transaction with index `_txIndex` if it exists and is not executed yet.
    * It can only be called by the contract's owners
    * @return address[] Returns the Trusty's owners as an array
    */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    /**
    * @notice Method used to get the current Trusty's balance
    * @return uint256 Returns the Trusty's balance as uint256
    */
    function getBalance() public view returns (uint256) {
        uint256 amount = address(this).balance;
        return amount;
    }

    /**
    * @notice Method used to get the current Trusty's total transactions
    * @return uint Returns the Trusty's total transactions as uint
    */
    function getTransactionCount() public view returns (uint) {
        return txIndex;
    }

    /**
    * @notice Method used to get the transaction proposal structure
    * @param _txIndex The index of the transaction that needs to be retrieved
    * @custom:return Returns Transaction (address to, uint value, bytes data, bool executed, uint numConfirmations)
    */
    function getTransaction(uint _txIndex) public view returns(
        address to,
        uint value,
        bytes memory data,
        bool executed,
        uint numConfirmations,
        uint blockHeight,
        uint timestamp
    ) {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.blockHeight,
            transaction.timestamp
        );
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is empty
    */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
    * @notice Fallback function triggered when the contract is receiving Ether and msg.data is not empty
    */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
}
