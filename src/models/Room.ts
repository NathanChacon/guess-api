import User from "./User";
import topics from "../topics";
import { Server } from "socket.io";
import {
  InvalidUserNameError,
  UserAlreadyRegisteredError,
} from "../errors/UserErrors";
import { RoomIsFullError } from "../errors/RoomErrors";

enum Points {
  writerPoint = 10,
  guesserPoint = 20,
}

export default class Room {
  private _name: string;
  private _id: string;
  private _currentTopic: string | null;
  private _currentDescription: string | null;
  private _currentPlayer: User | null;
  private _players: Array<User>;
  private _alreadyPlayed: Array<User>;
  private _alreadyScored: Array<User>;
  private _countDownRef: any;
  private _io: Server;
  private _maxPlayers = 5;
  private _writerPoint = Points.writerPoint;
  private _guesserPoint = Points.guesserPoint;

  constructor(name: string, id: string, io: Server) {
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

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
  }

  set id(id: string) {
    this._id = id;
  }

  get currentTopic(): string | null {
    return this._currentTopic;
  }

  get currentPlayer(): User | null {
    return this._currentPlayer;
  }

  get currentDescription(): String | null {
    return this._currentDescription;
  }

  get players(): Array<User> {
    return this._players;
  }

  private isValidUserName(userName: string) {
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

  private nameAlreadyExistis(userName: string) {
    return this._players.some(
      ({ name }) => userName.toLowerCase() === name.toLowerCase()
    );
  }

  hasUser(userId: string): boolean {
    return this._players.some(({ id }) => id === userId);
  }

  addPlayer(player: User) {
    if (!this.hasUser(player.id)) {
      this._players.push(player);
    }
  }

  private generateTopic() {
    const randomIndex = Math.floor(Math.random() * topics.length);
    const topic = topics[randomIndex];
    this._currentTopic = topic;
  }

  private stopCountdown() {
    clearInterval(this._countDownRef);
  }

  private startCountDown() {
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

  private getSortedPlayersByJoinTime(): Array<User> {
    return this._players.sort(
      (playerA: any, playerB: any) => playerA.joinTime - playerB.joinTime
    );
  }

  private getPlayersWaiting(players: Array<User>) {
    return players.filter(({ id }) => {
      const hasPlayed = this._alreadyPlayed.some(
        (alreadyPlayedUser) => alreadyPlayedUser.id === id
      );
      return !hasPlayed;
    });
  }

  private handleNextWaitingPlayer(): User {
    const needToFindNext = this._alreadyPlayed.length >= 1;
    const sortedPlayersByJoinTime = this.getSortedPlayersByJoinTime();
    const playersWaitingToPlay = this.getPlayersWaiting(
      sortedPlayersByJoinTime
    );
    const nextWaitingPlayer = playersWaitingToPlay[0];

    if (!needToFindNext) {
      return sortedPlayersByJoinTime[0];
    }
    if (nextWaitingPlayer) {
      return nextWaitingPlayer;
    } else {
      this._alreadyPlayed = [];
      return sortedPlayersByJoinTime[0];
    }
  }

  private handleNextPlayer() {
    const nextPlayer = this.handleNextWaitingPlayer();
    this._currentPlayer = nextPlayer;
    this._alreadyPlayed.push(nextPlayer);
  }

  async removePlayer(playerId: string) {
    const playerRemoved = this._players.find(({ id }) => id === playerId);
    const newPlayersArray = this._players.filter(({ id }) => id !== playerId);
    const newAlreadyPlayedArray = this._alreadyPlayed.filter(
      ({ id }) => id !== playerId
    );

    await this._io.to(this._id).emit("room:user-leave", { ...playerRemoved });

    this._players = newPlayersArray;
    this._alreadyPlayed = newAlreadyPlayedArray;
    if (newPlayersArray.length === 1) {
      this._currentPlayer = null;
      this._currentTopic = null;
      await this._io.to(this._id).emit("room:stop", {});
    } else if (this._currentPlayer?.id === playerId) {
      this._currentPlayer = null;
      this._currentTopic = null;
      this.handleNextMatch();
    }
  }

  async join(user: User) {
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
    } else {
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
      const previousTopic = this._currentTopic;
      this.handleNextPlayer();
      this.generateTopic();

      await this._io.to(this._id).emit("room:next-match", {
        currentPlayer: this._currentPlayer,
        previousTopic,
      });
      await this._io
        .to(this._currentPlayer?.id || "")
        .emit("room:topic", { topic: this._currentTopic });

      this.startCountDown();
    } else {
      this._currentPlayer = null;
      this._currentTopic = null;
      await this._io.to(this._id).emit("room:stop", {});
    }
  }

  canSendMessage({
    fromUserId,
    message,
  }: {
    fromUserId: string;
    message: string;
  }): Boolean {
    const isUserWriter = fromUserId === this._currentPlayer?.id;
    const isMessageCorrect =
      message.toLowerCase() === this._currentTopic.toLowerCase();
    if (!isUserWriter && !isMessageCorrect) {
      return true;
    }

    return false;
  }

  handleChat({ fromUserId, message }: { fromUserId: string; message: string }) {
    const canSendMessage = fromUserId !== this._currentPlayer?.id;

    const playerSendingMessage = this._players.find(
      ({ id }) => id === fromUserId
    );

    if (playerSendingMessage) {
      if (this.canSendMessage({ fromUserId, message })) {
        this._io
          .to(this._id)
          .emit("room:chat", {
            fromUser: { ...playerSendingMessage },
            message,
          });
      }

      this.handleScore({ user: playerSendingMessage, message });
    }
  }

  private canScore({ user, message }: { user: User; message: string }) {
    if (message && this._currentTopic) {
      const isMessageCorrect =
        message.toLowerCase() === this._currentTopic.toLowerCase();
      const playerAlreadyScored = this._alreadyScored.some(
        ({ id }) => id === user?.id
      );
      return isMessageCorrect && !playerAlreadyScored;
    }

    return false;
  }

  private makeScore(user: User) {
    this._alreadyScored.push(user);

    user?.addPoint(this._guesserPoint);
    this.currentPlayer?.addPoint(this._writerPoint);
    this._io
      .to(this._id)
      .emit("room:score", { user, writer: this._currentPlayer });
  }

  private handleScore({ user, message }: { user: User; message: string }) {
    const canScore = this.canScore({ user, message });

    if (canScore) {
      this.makeScore(user);
    }

    if (this._alreadyScored.length === this._players.length - 1) {
      this.handleNextMatch();
    }
  }

  setDescription(descrption: string) {
    this._currentDescription = descrption;
  }
}
