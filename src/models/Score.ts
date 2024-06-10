import { Line } from "./Line";
import { Topic } from "./Topic";
import User from "./User";
import { Server } from "socket.io";


enum Points {
    writerPoint = 10,
    guesserPoint = 20,
}

export class Score {
    private topic: Topic
    private line: Line
    private io: Server
    private writerPoint = Points.writerPoint;
    private guesserPoint = Points.guesserPoint;

    constructor(topic: Topic, line: Line, io: Server) {
        this.topic = topic
        this.line = line
        this.io = io
    }


   resetUsersScores(){
      this.line.players.forEach((player) => player.hasScored = false)
   }


   canScore({ user, message }: { user: User; message: string }) {
        if (message && this.topic.currentTopic) {
          const isMessageCorrect =
            message.toLowerCase() === this.topic.currentTopic.toLowerCase();
        
          return isMessageCorrect && !user.hasScored;
        }
    
        return false;
    }

    handleScore({ user, message, roomId }: { user: User; message: string, roomId: string }){
        const canUserScore = this.canScore({ user, message })

        if(canUserScore){
            user.hasScored = true
            user?.addPoint(this.guesserPoint);

            this.line.nextPlayer?.addPoint(this.writerPoint);
            this.io
              .to(roomId)
              .emit("room:score", { user, writer: this.line.nextPlayer });
        }
    }

    isEveryoneScored(){
       const usersScored = this.line.players.filter((player) => player.hasScored && player.id !== this.line.nextPlayer.id)

       return usersScored.length === this.line.players.length - 1 
    }
}