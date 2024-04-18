import { Socket, Server} from 'socket.io';
import User from '../../models/User'
import Room from '../../models/Room'
import gameState from '../../gameState';


export default (io: Server, socket: Socket) => {

    const keepSocketInOneRoom = () => {
        if(socket.data.currentRoom){
             socket.leave(socket.data.currentRoom)
        }
     }


    const joinRoom = async ({roomId}: {roomId: string}) => {
        const roomAlreadyCreated = gameState.rooms.find(({id}) => {return roomId === id})
        const room = roomAlreadyCreated || new Room(roomId, roomId, null)
        const user = new User("", socket.id, roomId, 0, new Date())


        if(!roomAlreadyCreated){
            gameState.rooms.push(room)
        }

        keepSocketInOneRoom()
        
        await socket.join(roomId);

        socket.data.currentRoom = roomId

        if(!room.hasUser(user.id)){
            room.addPlayer(user)
        }




        

        const formattedSocketsInRoom = room.players

        const filteredSockets = formattedSocketsInRoom.filter(({id}) => id !== socket.id)

        await socket.emit("usersInRoom", {usersInRoom: filteredSockets})

        await io.to(roomId).emit("userJoin", {...user});

        room.handleNextMatch()
        if(room.currentPlayer){
            await io.to(roomId).emit("nextPlayer", {...room.currentPlayer});
            await io.to(room.currentPlayer.id).emit("roomTopic", {...room});
        }
    }
  
  
    socket.on("joinRoom", joinRoom);

    socket.on('roomMessage', ({roomId, message}) => {
        io.to(roomId).emit("roomMessage", {fromUser: socket.id, message, data: socket.data});
    })

    socket.on('roomDescription', ({roomId, description}) => {
        io.to(roomId).except(socket.id).emit("roomDescription", {fromUser: socket.id, description});
    })
  }