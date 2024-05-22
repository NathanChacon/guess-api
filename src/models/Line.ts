import User from "./User"
export class Line {
    players: Array<User> = []
    nextPlayer: User = null

    constructor(players){
        this.players = players
    }

    private getPlayersWaiting() {
        return this.players.filter(({ hasPlayed }) => {
            return !hasPlayed;
        });
    }

    private restartLine(){
        this.players.forEach((player) => {
            player.hasPlayed = false
        });
    }

    private sortPlayersByJoinTime(): Array<User> {
        return this.players.sort(
          (playerA: any, playerB: any) => playerA.joinTime - playerB.joinTime
        );
    }

    public getNextPlayer(): User {
        const playersWaitingToPlay = this.getPlayersWaiting();

        if(playersWaitingToPlay.length === 0){
            this.restartLine()
        }

        const nextWaitingPlayer = playersWaitingToPlay[0];
    

        if (nextWaitingPlayer) {
          this.nextPlayer = nextWaitingPlayer 

        } 
        else {
          this.nextPlayer = this.players[0]
        }


       this.nextPlayer.hasPlayed = true

        return this.nextPlayer
       
      }

    removePlayer(playerId: string){
        const newPlayersArray = this.players.filter(({ id }) => id !== playerId);

        this.players = newPlayersArray
        this.sortPlayersByJoinTime()
    }

    addPlayer(player: User){
        this.players.push(player)
        this.sortPlayersByJoinTime()
    } 
}