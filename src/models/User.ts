export default class User {
    name: string;
    roomId: string | null;
    points: number;
    joinTime: Date;
    id: string;

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

    addPoint() {
        this.points ++
    }
}