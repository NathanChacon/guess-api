import User from './User'
import topics from '../topics';


export default class Room {
    private _name: string;
    private _id: string;
    private _currentTopic: string | null ;
    private _currentPlayer: User | null;
    private _players: Array<User>
    private _alreadyPlayed: Array<User>

    constructor(name: string, id: string, currentTopic: string | null) {
        this._name = name;
        this._id = id;
        this._currentTopic = currentTopic;
        this._currentPlayer = null
        this._alreadyPlayed = []
        this._players = []
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

    get players (): Array<User> {
        return this._players;
    }

    hasUser(userId: string):boolean {
        return this._players.some(({id}) => id === userId)
    }

    addPlayer(player: User) {
        this._players.push(player)
    }

    private restartLine () {
        const sortedPlayersByJoinTime = this._players.sort((playerA: any, playerB: any) => playerA.joinTime - playerB.joinTime)
        this._alreadyPlayed = []
        this._currentPlayer = sortedPlayersByJoinTime[0]
    }

    private generateTopic () {
        const randomIndex = Math.floor(Math.random() * topics.length);
        const topic = topics[randomIndex];
        this._currentTopic = topic
    }

    removePlayer(playerId: string): User | undefined {
        const playerRemoved = this._players.find(({id}) => id === playerId)
        const newPlayersArray = this._players.filter(({id}) => id !== playerId)
        const newAlreadyPlayedArray = this._alreadyPlayed.filter(({id}) => id !== playerId)

        if(this._currentPlayer?.id === playerId){
            this._currentPlayer = null
            this._currentTopic = null
        }

        this._players = newPlayersArray
        this._alreadyPlayed = newAlreadyPlayedArray

        return playerRemoved
    }



    handleNextMatch() {
        if(this._players.length >= 2){
           const needToFindNext = this._alreadyPlayed.length >= 1
           if(needToFindNext){
            const sortedPlayersByJoinTime = this._players.sort((playerA: any, playerB: any) => playerA.joinTime - playerB.joinTime)
            const possiblePlayers = sortedPlayersByJoinTime.filter(({id}) => {
                const hasPlayed = this._alreadyPlayed.some((alreadyPlayedUser) =>  alreadyPlayedUser.id === id)
                return !hasPlayed
            })

            if(possiblePlayers.length > 0){
                this._currentPlayer = possiblePlayers[0]
                this._alreadyPlayed.push(possiblePlayers[0])
            }
            else{
                this.restartLine()
            }
           }
           else{
             this._currentPlayer = this._players[0]
             this._alreadyPlayed.push(this._currentPlayer)
           }

           this.generateTopic()
          
        }
    }
}