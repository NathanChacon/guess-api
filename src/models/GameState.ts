import Room from "./Room";
import User from "./User";

export default class GameState {
    users: Array<User>
    rooms: Array<Room>

    constructor(){
        this.rooms = []
        this.users = []
    }
}