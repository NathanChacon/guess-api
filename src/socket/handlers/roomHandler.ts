import { Socket, Server} from 'socket.io';
import User from '../../models/User'
import Room from '../../models/Room'
import gameState from '../../gameState';
import { InvalidUserNameError, UserAlreadyRegisteredError } from '../../errors/UserErrors';
 

export default (io: Server, socket: Socket) => {

    const keepSocketInOneRoom = () => {
        if(socket.data.currentRoom){
             socket.leave(socket.data.currentRoom)
        }
     }


    const joinRoom = async ({roomId, userName}: {roomId: string, userName: string}, callback: any) => {
        const roomAlreadyCreated = gameState.rooms.find(({id}) => {return roomId === id})
        const room = roomAlreadyCreated || new Room(roomId, roomId, io)
        const user = new User(userName, socket.id, roomId, 0, new Date())


        if(!roomAlreadyCreated){
            gameState.rooms.push(room)
        }

        try{
            keepSocketInOneRoom()
        
            await socket.join(roomId);
    
            socket.data.currentRoom = roomId
    
            await room.join(user)
    
            const playersInRoom = room.players.filter(({id}) => id !== socket.id)

            await socket.emit("room:current-state", {usersInRoom: playersInRoom, currentPlayer: room.currentPlayer, currentDescription: room.currentDescription})
        }
        catch(error){
            if(error instanceof InvalidUserNameError || error instanceof UserAlreadyRegisteredError) {
                callback({
                    status: error.statusCode,
                    message: error.message,
                    name: error.name
                })
            }
            else{
                callback({
                    status: 500,
                    message: "Something went wrong",
                    name: "serverError"
                })
            }
        }
    }
  
    
    socket.on("room:join", joinRoom);

    socket.on("room:user-leave", async () => {
        const currentRoom = socket?.data?.currentRoom
        await socket.leave(currentRoom)

        if(currentRoom){
            const roomToLeave = gameState.rooms.find(({id}) => id === currentRoom)
            roomToLeave?.removePlayer(socket.id)
        }
    })

    socket.on('room:chat', ({roomId, message}) => {
        const room = gameState.rooms.find(({id}) => id === roomId)
        room?.handleChat({fromUserId: socket.id, message})
        
    })

    socket.on('room:description', ({roomId, description}) => {
        const room = gameState.rooms.find(({id}) => id === roomId)
        if(room){
            room.setDescription(description)
        }
        io.to(roomId).except(socket.id).emit("room:description", {fromUser: socket.id, description});
    })
  }