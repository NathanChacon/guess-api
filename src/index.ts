import express from 'express';
import http from 'http';
import cors from 'cors'
import { Server, Socket } from 'socket.io';
import topics from './topics';

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

const roomsStates: any = {}


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
    const keepSocketInOneRoom = () => {
       if(socket.data.currentRoom){
            socket.leave(socket.data.currentRoom)
       }
    }

    const getSocketsInRoom = async (roomId: string) => {

        const sockets = await io.in(roomId).fetchSockets();

        const formattedSocketsInRoom = sockets.map((socket) => {
            return {userId: socket.id, ...socket.data}
        })

        return formattedSocketsInRoom

    }

    const generateNewRoomTopic = () => {
        const randomIndex = Math.floor(Math.random() * topics.length);
        const topic = topics[randomIndex];
        return topic
        
    }
    
    const handleNextMatch = (sockets: any, roomId: string) => {
        const nextPlayer = handleNextPlayer(sockets, roomId)
        const topic = generateNewRoomTopic()

        roomsStates[roomId].topic = topic

        return {
            nextPlayer,
            topic 
        }
    }

    const handleNextPlayer = (sockets: any, roomId: string) => {
        const socketsSortedByTime = sockets.sort((a: any, b: any) => a.joinTime - b.joinTime);
        const nextPlayer = socketsSortedByTime.find((socket: any) => !socket?.hasPlayed)

        if(!nextPlayer){
            socketsSortedByTime.forEach((socket: any) => {
                socket.hasPlayed = false
            });
            const firstPlayer = socketsSortedByTime[0]
            roomsStates[roomId] = {
                describer: firstPlayer
            }
            return firstPlayer
        }

        roomsStates[roomId] = {
            describer: nextPlayer
        }

        return nextPlayer
    }

    const setSocketInitialState = () => {
        socket.data.score = 0
        socket.data.joinTime = new Date()
    }


    socket.on("joinRoom", async (roomId: string) => {
        setSocketInitialState()

        keepSocketInOneRoom()
        
        await socket.join(roomId);

        socket.data.currentRoom = roomId   


        const formattedSocketsInRoom = await getSocketsInRoom(roomId)

        const filteredSockets = formattedSocketsInRoom.filter(({userId}) => userId !== socket.id)

        await socket.emit("usersInRoom", {usersInRoom: filteredSockets})

        await io.to(roomId).emit("userJoin", {userId: socket.id, ...socket.data});

        if(formattedSocketsInRoom?.length > 1 && !roomsStates[roomId]?.describer){
            const {nextPlayer, topic} = handleNextMatch(formattedSocketsInRoom, roomId)
            await io.to(roomId).emit("nextPlayer", {...nextPlayer});
            
            await io.to(nextPlayer.userId).emit("roomTopic", {topic});
        }
        else{
            await io.to(roomId).emit("roomStopGame");
        }
    })

    socket.on('roomMessage', ({roomId, message}) => {
        io.to(roomId).emit("roomMessage", {fromUser: socket.id, message, data: socket.data});
    })

    socket.on('roomDescription', ({roomId, description}) => {
        io.to(roomId).except(socket.id).emit("roomDescription", {fromUser: socket.id, description});
    })


    socket.on('roomScore', ({roomId}) => {

    })

    socket.on('disconnect', () => {
        const currentRoom = socket?.data?.currentRoom
        if(currentRoom){
            const isDescriber = roomsStates[currentRoom]?.describer?.userId == socket.id
            if(isDescriber){
                roomsStates[currentRoom].describer = null
            }
            io.to(currentRoom).emit('userLeave', {userId: socket.id, ...socket.data})
        }
    })
});


const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



