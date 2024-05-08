export default class User {
    name;
    roomId;
    points = 0;
    joinTime;
    id;
    constructor(name, id, roomId, points, joinTime) {
        this.name = name;
        this.roomId = roomId;
        this.points = points;
        this.joinTime = joinTime;
        this.id = id;
    }
    clearCurrentRoom() {
        this.roomId = null;
    }
    addPoint(points) {
        this.points += points;
    }
}
