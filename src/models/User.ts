export default class User {
    name: string;
    roomId: string | null;
    points: number = 0;
    joinTime: Date;
    id: string;
    hasPlayed: boolean = false

    constructor(name: string, id: string, roomId: string, points: number, joinTime: Date) {
        this.name = name;
        this.roomId = roomId;
        this.points = points;
        this.joinTime = joinTime
        this.id = id
    }



    clearCurrentRoom():void {
        this.roomId = null
    }

    addPoint(points: number) {
        this.points += points
    }
}