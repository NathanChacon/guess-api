export class RoomIsFullError extends Error {
    statusCode;
    constructor(message) {
        super(message);
        this.name = 'RoomIsFull';
        this.statusCode = 403;
    }
}
