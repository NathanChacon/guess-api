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

        await socket.emit("room:current-state", {usersInRoom: filteredSockets, currentPlayer: room.currentPlayer, currentDescription: room.currentDescription})

        await io.to(roomId).emit("room:user-enter", {...user});

        const newRoomValues = room.startRoom()
        if(newRoomValues){
            const {currentPlayer, topic} = newRoomValues
            await io.to(roomId).emit("room:next-match", {...currentPlayer});
            await io.to(currentPlayer?.id || "").emit("room:topic", {topic: topic});
        }
    }
  
    
    socket.on("room:join", joinRoom);

    socket.on("room:user-leave", async () => {
        const currentRoom = socket?.data?.currentRoom
        await socket.leave(currentRoom)

        if(currentRoom){
            const roomToLeave = gameState.rooms.find(({id}) => id === currentRoom)
            const removedPlayer = roomToLeave?.removePlayer(socket.id)

            io.to(currentRoom).emit('room:user-leave', {...removedPlayer})
        }
    })

    socket.on('room:chat', ({roomId, message}) => {
        io.to(roomId).emit("room:chat", {fromUser: socket.id, message, data: socket.data});
    })

    socket.on('room:description', ({roomId, description}) => {
        const room = gameState.rooms.find(({id}) => id === roomId)
        if(room){
            room.setDescription(description)
        }
        io.to(roomId).except(socket.id).emit("room:description", {fromUser: socket.id, description});
    })
  }