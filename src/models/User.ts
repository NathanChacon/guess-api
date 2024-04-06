class User {
    private _name: string;
    private _roomId: string;
    private _points: number;

    constructor(name: string, roomId: string, points: number) {
        this._name = name;
        this._roomId = roomId;
        this._points = points;
    }

    get name(): string {
        return this._name;
    }

    get roomId(): string {
        return this._roomId;
    }

    set roomId(roomId: string) {
        this._roomId = roomId;
    }

    get points(): number {
        return this._points;
    }

    addPoint() {
        this._points ++
    }
}