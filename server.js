const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let rooms = {}; // 방 상태 관리 { roomId: { players: [socketId1, socketId2] } }

io.on('connection', (socket) => {
    console.log(`유저 접속: ${socket.id}`);

    // 매치메이킹 (2인 1실 자동 배정)
    let assignedRoom = null;
    for (const roomId in rooms) {
        if (rooms[roomId].players.length < 2) {
            assignedRoom = roomId;
            break;
        }
    }

    if (!assignedRoom) {
        assignedRoom = `room_${Date.now()}`;
        rooms[assignedRoom] = { players: [] };
    }

    rooms[assignedRoom].players.push(socket.id);
    socket.join(assignedRoom);
    socket.roomId = assignedRoom;

    const playerCount = rooms[assignedRoom].players.length;
    socket.emit('waiting_for_opponent', { roomId: assignedRoom, playerCount });

    // 2명이 차면 게임 시작 명령
    if (playerCount === 2) {
        io.to(assignedRoom).emit('game_start', { startTime: Date.now() + 3000 });
    }

    // 실시간 점수 동기화 중계
    socket.on('update_score', (data) => {
        socket.to(socket.roomId).emit('opponent_score', data);
    });

    // 퇴장 처리
    socket.on('disconnect', () => {
        console.log(`유저 퇴장: ${socket.id}`);
        if (rooms[socket.roomId]) {
            rooms[socket.roomId].players = rooms[socket.roomId].players.filter(id => id !== socket.id);
            if (rooms[socket.roomId].players.length === 0) {
                delete rooms[socket.roomId];
            } else {
                io.to(socket.roomId).emit('opponent_left');
            }
        }
    });
});

// Render 배포를 위해 process.env.PORT 필수 사용
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
