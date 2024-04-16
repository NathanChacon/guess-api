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
    socket.on("joinRoom", async (roomId: string) => {
       socket.data.score = 0
       const currentSocketRooms = socket.rooms

       if(currentSocketRooms && currentSocketRooms?.size > 0){
            const rooms = currentSocketRooms.keys()
            const [previousRoom] = rooms;
            socket.leave(previousRoom)
       }   
        
        await socket.join(roomId);

        socket.data.currentRoom = roomId

        const sockets = await io.in(roomId).fetchSockets();

        const formattedSocketsInRoom = sockets.map((socket) => {

            return {userId: socket.id, ...socket.data}
        })

        const filteredSockets = formattedSocketsInRoom.filter(({userId}) => userId !== socket.id)

        await socket.emit("usersInRoom", {usersInRoom: filteredSockets})

        io.to(roomId).emit("userJoin", {userId: socket.id, ...socket.data});
    })

    socket.on('roomMessage', ({roomId, message}) => {
        io.to(roomId).emit("roomMessage", {fromUser: socket.id, message, data: socket.data});
    })


    socket.on('roomScore', ({roomId}) => {

    })

    socket.on('disconnect', () => {
        const currentRoom = socket?.data?.currentRoom
        if(currentRoom){
            io.to(currentRoom).emit('userLeave', {userId: socket.id, ...socket.data})
        }
    })
});


const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



