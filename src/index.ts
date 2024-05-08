import express from 'express';
import http from 'http';
import cors from 'cors'
import { Server, Socket } from 'socket.io';
import registerRoomHandlers from './socket/handlers/roomHandler'
import gameState from './gameState';

const app = express();

app.use(cors(
    {
        origin: '*'
    }
));
const server = http.createServer(app);

const rooms = [
    {
        title: "sala 1",
    }, 
    {
        title: "sala 2",
    }
]


const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      }
});


const onConnection = (socket: Socket) => {
    socket.on('disconnect', () => {
        const currentRoom = socket?.data?.currentRoom
        if(currentRoom){
            const roomToLeave = gameState.rooms.find(({id}) => id === currentRoom)
            const removedPlayer = roomToLeave?.removePlayer(socket.id)

            io.to(currentRoom).emit('room:user-leave', {...removedPlayer})
        }
    })

    registerRoomHandlers(io, socket)
  }
  
  io.on("connection", onConnection);

const port = process.env.PORT || 8080;

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.get('/rooms', (req, res) => {
    res.json(rooms);
});



