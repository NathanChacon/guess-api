import express from 'express';
import http from 'http';
import cors from 'cors'
import { Server, Socket } from 'socket.io';
import registerRoomHandlers from './socket/handlers/roomHandler'
import gameState from './gameState';
import Room from './models/Room';
import { v4 as uuidv4 } from 'uuid';

const app = express();

app.use(cors(
    {
        origin: '*'
    }
));
const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      }
});

function generateDefaultRooms() {
    const rooms = [];
    for (let i = 1; i <= 6; i++) {
        rooms.push(
            new Room(`sala ${i}`, uuidv4(), io)
        )
    }

    gameState.rooms = rooms
}


generateDefaultRooms()


const onConnection = (socket: Socket) => {
    socket.on('disconnect', async () => {
        const currentRoom = socket?.data?.currentRoom
        if(currentRoom){
            const roomToLeave = gameState.rooms.find(({id}) => id === currentRoom)
            await roomToLeave?.removePlayer(socket.id)
            io.emit("room:change-state", {room: {
                roomId: roomToLeave.id,
                players: roomToLeave.players.length
            }})
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
    const formattedRooms = gameState.rooms.map((room) => {
        return {
            title: room.name,
            id: room.id,
            players: room.players.length
        }
    })
    res.json({rooms: formattedRooms});
});



