import express from 'express';
import http from 'http';
import cors from 'cors'
import { Server, Socket } from 'socket.io';

// when he joins a room make sure to disconnect all other rooms
// take a look at socket error handling

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

app.get('/rooms', (req, res) => {
    res.json(rooms);
});



io.on('connection', (socket: Socket) => {
    socket.on("joinRoom", (roomId: string) => {
        
       const currentSocketRooms = socket.rooms

       if(currentSocketRooms && currentSocketRooms?.size > 0){
            const rooms = currentSocketRooms.keys()
            const [previousRoom] = rooms;
            console.log(previousRoom)
            socket.leave(previousRoom)
       }
        
        socket.join(roomId);
        console.log(currentSocketRooms)
        io.to(roomId).emit("userJoin", {user: socket.id});
    })

    socket.on('roomMessage', ({roomId, message}) => {
        io.to(roomId).emit("roomMessage", {fromUser: socket.id, message});
    })
});


const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



