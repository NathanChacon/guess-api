import express from 'express';
import http from 'http';
import cors from 'cors'
import { Server, Socket } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      }
});
app.use(cors());

io.on('connection', (socket: Socket) => {
    console.log('A user connected');


    socket.on('enter room', (roomId: string, userName: string) => {
        
    });

    // Handle 'disconnect' event
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

