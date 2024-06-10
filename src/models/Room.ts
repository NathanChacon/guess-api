import User from "./User";
import topics from "../topics";
import { Server } from "socket.io";
import {
  InvalidUserNameError,
  UserAlreadyRegisteredError,
  UserAlreadyJoinedError,
} from "../errors/UserErrors";
import { RoomIsFullError } from "../errors/RoomErrors";
import { Topic } from "./Topic";
import { Line } from "./Line";
import { Score } from "./Score";
import { UserValidator } from "./UserValidator";
export default class Room {
  private _name: string;
  private _id: string;
  private _currentDescription: string | null;
  private _currentPlayer: User | null;
  private _players: Array<User>;
  private _countDownRef: any;
  private _io: Server;
  private _maxPlayers = 12;
  private topic = new Topic(topics);
  private line = new Line([]);
  private score: Score;
  private userValidator: UserValidator = new UserValidator(this.line);

  constructor(name: string, id: string, io: Server) {
    this._name = name;
    this._id = id;
    this._currentPlayer = null;
    this._players = [];
    this._currentDescription = null;
    this._io = io;
    this._countDownRef = "";

    this.score = new Score(this.topic, this.line, io);
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

  get currentPlayer(): User | null {
    return this._currentPlayer;
  }

  get currentDescription(): String | null {
    return this._currentDescription;
  }

  get players(): Array<User> {
    return this._players;
  }

  get maxPlayers(): number {
    return this._maxPlayers;
  }

  addPlayer(player: User) {
    this._players.push(player);
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
      if (timeLeft === 0 || !this.topic.currentTopic || !this._currentPlayer) {
        this.handleNextMatch();
        clearInterval(countdownInterval);
      }
    }, 1000);

    this._countDownRef = countdownInterval;
  }

  private handleNextPlayer() {
    const nextPlayer = this.line.getNextPlayer();
    this._currentPlayer = nextPlayer;
  }

  async removePlayer(playerId: string) {
    const playerRemoved = this._players.find(({ id }) => id === playerId);
    const newPlayersArray = this._players.filter(({ id }) => id !== playerId);

    this.line.removePlayer(playerId);

    await this._io.to(this._id).emit("room:user-leave", { ...playerRemoved });

    this._players = newPlayersArray;

    if (newPlayersArray.length === 1) {
      this._currentPlayer = null;
      this.topic.clear();
      await this._io.to(this._id).emit("room:stop", {});
    } else if (this._currentPlayer?.id === playerId) {
      this._currentPlayer = null;
      this.topic.clear();
      this.handleNextMatch();
    }
  }

  async join(user: User) {
    const isRoomFull = this._players.length === this._maxPlayers;
    const isValidName = this.userValidator.isValidUserName(user.name);
    const isNameAlreadyInTheRoom = this.userValidator.nameAlreadyExistis(
      user.name
    );
    const userAlreadyJoined = this.userValidator.isUserAlreadyInTheRoom(
      user.id
    );

    const isValidUser =
      isValidName && !isNameAlreadyInTheRoom && !userAlreadyJoined;

    if (isRoomFull) {
      throw new RoomIsFullError("Room is full");
    }

    if (isValidUser) {
      this.line.addPlayer(user);
      this.addPlayer(user);

      this.startRoom();
    } else {
      if (!isValidName) {
        throw new InvalidUserNameError("Invalid user name");
      }

      if (isNameAlreadyInTheRoom) {
        throw new UserAlreadyRegisteredError("Name already registered");
      }

      if (userAlreadyJoined) {
        throw new UserAlreadyJoinedError("User already joined");
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
    this.score.resetUsersScores();
    this._currentDescription = null;

    if (this._players.length >= 2) {
      this.handleNextPlayer();
      this.topic.generate();

      await this._io.to(this._id).emit("room:next-match", {
        currentPlayer: this._currentPlayer,
        previousTopic: this.topic.previousTopic,
      });
      await this._io
        .to(this._currentPlayer?.id || "")
        .emit("room:topic", { topic: this.topic.currentTopic });

      this.startCountDown();
    } else {
      this._currentPlayer = null;
      this.topic.clear();
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
      message?.toLowerCase() === this.topic.currentTopic?.toLowerCase();
    if (!isUserWriter && !isMessageCorrect) {
      return true;
    }

    return false;
  }

  handleChat({ fromUserId, message }: { fromUserId: string; message: string }) {
    const playerSendingMessage = this._players.find(
      ({ id }) => id === fromUserId
    );

    if (playerSendingMessage) {
      if (this.canSendMessage({ fromUserId, message })) {
        this._io.to(this._id).emit("room:chat", {
          fromUser: { ...playerSendingMessage },
          message,
        });
      }

      this.score.handleScore({
        user: playerSendingMessage,
        message,
        roomId: this._id,
      });

      if (this.score.isEveryoneScored()) {
        this.handleNextMatch();
      }
    }
  }

  setDescription(descrption: string) {
    this._currentDescription = descrption;
  }
}
