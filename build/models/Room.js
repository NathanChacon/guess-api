import topics from "../topics";
import { InvalidUserNameError, UserAlreadyRegisteredError, } from "../errors/UserErrors";
import { RoomIsFullError } from "../errors/RoomErrors";
export default class Room {
    _name;
    _id;
    _currentTopic;
    _currentDescription;
    _currentPlayer;
    _players;
    _alreadyPlayed;
    _alreadyScored;
    _countDownRef;
    _io;
    _maxPlayers = 5;
    _writerPoint = 10;
    _guesserPoint = 20;
    constructor(name, id, io) {
        this._name = name;
        this._id = id;
        this._currentTopic = null;
        this._currentPlayer = null;
        this._alreadyPlayed = [];
        this._players = [];
        this._alreadyScored = [];
        this._currentDescription = null;
        this._io = io;
        this._countDownRef = "";
    }
    get name() {
        return this._name;
    }
    get id() {
        return this._id;
    }
    set id(id) {
        this._id = id;
    }
    get currentTopic() {
        return this._currentTopic;
    }
    get currentPlayer() {
        return this._currentPlayer;
    }
    get currentDescription() {
        return this._currentDescription;
    }
    get players() {
        return this._players;
    }
    isValidUserName(userName) {
        // Check if username is not empty
        if (userName.trim() === "") {
            return false;
        }
        // Check if userName has more than 10 characters
        if (userName.length > 10) {
            return false;
        }
        // Check if userName contains special characters
        var specialCharacters = /[!@#$%^&*(),.?":{}|<>]/;
        if (specialCharacters.test(userName)) {
            return false;
        }
        // Check if userName contains empty spaces
        if (/\s/.test(userName)) {
            return false;
        }
        // If all checks pass, userName is valid
        return true;
    }
    nameAlreadyExistis(userName) {
        return this._players.some(({ name }) => userName.toLowerCase() === name.toLowerCase());
    }
    hasUser(userId) {
        return this._players.some(({ id }) => id === userId);
    }
    addPlayer(player) {
        if (!this.hasUser(player.id)) {
            this._players.push(player);
        }
    }
    generateTopic() {
        const randomIndex = Math.floor(Math.random() * topics.length);
        const topic = topics[randomIndex];
        this._currentTopic = topic;
    }
    stopCountdown() {
        clearInterval(this._countDownRef);
    }
    startCountDown() {
        let timeLeft = 40; // Example: 60 seconds countdown
        const countdownInterval = setInterval(() => {
            timeLeft--;
            // Emit the remaining time to all clients in the room
            this._io.to(this._id).emit("room:timer", timeLeft);
            // If the countdown reaches zero, stop the interval
            if (timeLeft === 0 || !this._currentTopic || !this._currentPlayer) {
                this.handleNextMatch();
                clearInterval(countdownInterval);
            }
        }, 1000);
        this._countDownRef = countdownInterval;
    }
    getSortedPlayersByJoinTime() {
        return this._players.sort((playerA, playerB) => playerA.joinTime - playerB.joinTime);
    }
    getPlayersWaiting(players) {
        return players.filter(({ id }) => {
            const hasPlayed = this._alreadyPlayed.some((alreadyPlayedUser) => alreadyPlayedUser.id === id);
            return !hasPlayed;
        });
    }
    handleNextWaitingPlayer() {
        const needToFindNext = this._alreadyPlayed.length >= 1;
        const sortedPlayersByJoinTime = this.getSortedPlayersByJoinTime();
        const playersWaitingToPlay = this.getPlayersWaiting(sortedPlayersByJoinTime);
        const nextWaitingPlayer = playersWaitingToPlay[0];
        if (!needToFindNext) {
            return sortedPlayersByJoinTime[0];
        }
        if (nextWaitingPlayer) {
            return nextWaitingPlayer;
        }
        else {
            this._alreadyPlayed = [];
            return sortedPlayersByJoinTime[0];
        }
    }
    handleNextPlayer() {
        const nextPlayer = this.handleNextWaitingPlayer();
        this._currentPlayer = nextPlayer;
        this._alreadyPlayed.push(nextPlayer);
    }
    async removePlayer(playerId) {
        const playerRemoved = this._players.find(({ id }) => id === playerId);
        const newPlayersArray = this._players.filter(({ id }) => id !== playerId);
        const newAlreadyPlayedArray = this._alreadyPlayed.filter(({ id }) => id !== playerId);
        await this._io.to(this._id).emit("room:user-leave", { ...playerRemoved });
        this._players = newPlayersArray;
        this._alreadyPlayed = newAlreadyPlayedArray;
        if (newPlayersArray.length === 1) {
            this._currentPlayer = null;
            this._currentTopic = null;
            await this._io.to(this._id).emit("room:stop", {});
        }
        else if (this._currentPlayer?.id === playerId) {
            this._currentPlayer = null;
            this._currentTopic = null;
            this.handleNextMatch();
        }
    }
    async join(user) {
        const isRoomFull = this._players.length === this._maxPlayers;
        const isValidName = this.isValidUserName(user.name);
        const isNameAlreadyInTheRoom = this.nameAlreadyExistis(user.name);
        const isValidUser = isValidName && !isNameAlreadyInTheRoom;
        if (isRoomFull) {
            throw new RoomIsFullError("Room is full");
        }
        if (isValidUser) {
            this.addPlayer(user);
            this.startRoom();
        }
        else {
            if (!isValidName) {
                throw new InvalidUserNameError("Invalid user name");
            }
            if (isNameAlreadyInTheRoom) {
                throw new UserAlreadyRegisteredError("Name already registered");
            }
        }
    }
    async startRoom() {
        const playersLenghtToStart = 2;
        const hasEnouthPlayers = this._players.length === playersLenghtToStart;
        const hasEmptyCurrentPlayer = !this.currentPlayer;
        if (hasEnouthPlayers && hasEmptyCurrentPlayer) {
            this.handleNextMatch();
        }
    }
    async handleNextMatch() {
        this.stopCountdown();
        this._alreadyScored = [];
        this._currentDescription = null;
        if (this._players.length >= 2) {
            this.handleNextPlayer();
            this.generateTopic();
            await this._io
                .to(this._id)
                .emit("room:next-match", { ...this._currentPlayer });
            await this._io
                .to(this._currentPlayer?.id || "")
                .emit("room:topic", { topic: this._currentTopic });
            this.startCountDown();
        }
        else {
            this._currentPlayer = null;
            this._currentTopic = null;
            await this._io.to(this._id).emit("room:stop", {});
        }
    }
    handleChat({ fromUserId, message }) {
        const canSendMessage = fromUserId !== this._currentPlayer?.id;
        if (canSendMessage) {
            const playerSendingMessage = this._players.find(({ id }) => id === fromUserId);
            if (playerSendingMessage) {
                this.handleScore({ user: playerSendingMessage, message });
            }
        }
    }
    canScore({ user, message }) {
        const isMessageCorrect = message === this._currentTopic;
        const playerAlreadyScored = this._alreadyScored.some(({ id }) => id === user?.id);
        return isMessageCorrect && !playerAlreadyScored;
    }
    makeScore(user) {
        this._alreadyScored.push(user);
        user?.addPoint(this._guesserPoint);
        this.currentPlayer?.addPoint(this._writerPoint);
        this._io.to(this._id).emit("room:score", { user, writer: this._currentPlayer });
    }
    handleScore({ user, message }) {
        const canScore = this.canScore({ user, message });
        if (!canScore) {
            this._io
                .to(this._id)
                .emit("room:chat", { fromUser: { ...user }, message });
        }
        if (canScore) {
            this.makeScore(user);
        }
        if (this._alreadyScored.length === this._players.length - 1) {
            this.handleNextMatch();
        }
    }
    setDescription(descrption) {
        this._currentDescription = descrption;
    }
}
