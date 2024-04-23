import User from './User'
import topics from '../topics';
import {Server} from 'socket.io';

export default class Room {
    private _name: string;
    private _id: string;
    private _currentTopic: string | null ;
    private _currentDescription: string | null ;
    private _currentPlayer: User | null;
    private _players: Array<User>
    private _alreadyPlayed: Array<User>
    private _alreadyScored: Array<User>
    private _countDownRef: any
    private _io: Server
    constructor(name: string, id: string, io:Server ) {
        this._name = name;
        this._id = id;
        this._currentTopic = null;
        this._currentPlayer = null
        this._alreadyPlayed = []
        this._players = []
        this._alreadyScored = []
        this._currentDescription = null
        this._io = io
        this._countDownRef = ""
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

    get players (): Array<User> {
        return this._players;
    }

    hasUser(userId: string):boolean {
        return this._players.some(({id}) => id === userId)
    }

    addPlayer(player: User) {
        if(!this.hasUser(player.id)){
            this._players.push(player)
        }
       
    }

    private restartLine () {
        const sortedPlayersByJoinTime = this.getSortedPlayersByJoinTime()
        const currentPlayer = sortedPlayersByJoinTime[0]

        this._currentPlayer = currentPlayer
        this._alreadyPlayed = [currentPlayer]
    }

    private generateTopic () {
        const randomIndex = Math.floor(Math.random() * topics.length);
        const topic = topics[randomIndex];
        this._currentTopic = topic
    }

    private stopCountdown (){
        clearInterval(this._countDownRef)
    }

    private startCountDown () {
        let timeLeft = 20; // Example: 60 seconds countdown

        const countdownInterval = setInterval(() => {
            timeLeft--;
    
            // Emit the remaining time to all clients in the room
            this._io.to(this._id).emit('room:timer', timeLeft);
    
            // If the countdown reaches zero, stop the interval
            if (timeLeft === 0 || !this._currentTopic || !this._currentPlayer) {
                this.handleNextMatch()
                clearInterval(countdownInterval);
            }
        }, 1000);

        this._countDownRef = countdownInterval
    }

    private getSortedPlayersByJoinTime(): Array<User>{
        return this._players.sort((playerA: any, playerB: any) => playerA.joinTime - playerB.joinTime)
    }

    private getPlayersWaiting(players: Array<User>){
        return players.filter(({id}) => {
            const hasPlayed = this._alreadyPlayed.some((alreadyPlayedUser) =>  alreadyPlayedUser.id === id)
            return !hasPlayed
        })

    }

    private handleNextWaitingPlayer(): User{
        const needToFindNext = this._alreadyPlayed.length >= 1
        const sortedPlayersByJoinTime = this.getSortedPlayersByJoinTime()
        const playersWaitingToPlay = this.getPlayersWaiting(sortedPlayersByJoinTime)
        const nextWaitingPlayer = playersWaitingToPlay[0]

        if(!needToFindNext){
            return sortedPlayersByJoinTime[0]
        }
        if(nextWaitingPlayer){
            return nextWaitingPlayer
        }
        else{
            this._alreadyPlayed = []
            return sortedPlayersByJoinTime[0]
        } 
    }

    private handleNextPlayer() {
        const nextPlayer = this.handleNextWaitingPlayer()
        this._currentPlayer = nextPlayer
        this._alreadyPlayed.push(nextPlayer)
    }

    async removePlayer(playerId: string){
        const playerRemoved = this._players.find(({id}) => id === playerId)
        const newPlayersArray = this._players.filter(({id}) => id !== playerId)
        const newAlreadyPlayedArray = this._alreadyPlayed.filter(({id}) => id !== playerId)

       await this._io.to(this._id).emit('room:user-leave', {...playerRemoved})

        this._players = newPlayersArray
        this._alreadyPlayed = newAlreadyPlayedArray

        if(this._currentPlayer?.id === playerId){
            this._currentPlayer = null
            this._currentTopic = null
            this.handleNextMatch()
        }
        
    }

    async join(user: User) {
        this.addPlayer(user)

        await this._io.to(this._id).emit("room:user-enter", {...user});

        this.startRoom()
    }

    
    
    async startRoom(){
        const playersLenghtToStart = 2
        const hasEnouthPlayers = this._players.length === playersLenghtToStart
        const hasEmptyCurrentPlayer = !this.currentPlayer
        if(hasEnouthPlayers && hasEmptyCurrentPlayer){
            this.handleNextMatch()
        }
    }

    async handleNextMatch(){
        this.stopCountdown()
        this._alreadyScored = []
        this._currentDescription = null

        if(this._players.length >= 2){
            this.handleNextPlayer()
            this.generateTopic()
                       
           await this._io.to(this._id).emit("room:next-match", {...this._currentPlayer});
           await this._io.to(this._currentPlayer?.id || "").emit("room:topic", {topic: this._currentTopic});

           this.startCountDown()
        }
        else{
            this._currentPlayer = null
            this._currentTopic = null
            await this._io.to(this._id).emit("room:stop", {});
        }
    }


    handleChat({fromUserId, message}: {fromUserId: string, message: string}){
        const playerSendingMessage = this._players.find(({id}) => id === fromUserId)
        if(playerSendingMessage){
            this._io.to(this._id).emit("room:chat", {fromUser: {...playerSendingMessage}, message});
            this.handleScore({user: playerSendingMessage, message})
        }
    }

    private handleScore({user, message}: {user: User, message: string}){
        const isMessageCorrect = message === this._currentTopic
        const playerAlreadyScored = this._alreadyScored.some(({id}) => id === user?.id)
        const canScore = isMessageCorrect && !playerAlreadyScored
       
        if(canScore){
            this._alreadyScored.push(user)
            user?.addPoint()
            this._io.to(this._id).emit("room:score", {...user});
        }

        if(this._alreadyScored.length === (this._players.length - 1)){
            this.handleNextMatch()
        }
    }

    setDescription(descrption: string){
        this._currentDescription = descrption
    }
}