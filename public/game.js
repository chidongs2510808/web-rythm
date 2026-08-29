// 기존 socket 선언 유지
const socket = io();

// 화면 DOM 요소
const screens = {
    lobby: document.getElementById('lobby-screen'),
    create: document.getElementById('create-screen'),
    join: document.getElementById('join-screen'),
    waiting: document.getElementById('waiting-screen'),
    game: document.getElementById('game-screen')
};

// 화면 전환 함수
function showScreen(screenName) {
    Object.values(screens).forEach(el => el.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// ---- 버튼 이벤트 리스너 ----

// 로비 버튼
document.getElementById('btn-goto-create').addEventListener('click', () => showScreen('create'));
document.getElementById('btn-goto-join').addEventListener('click', () => showScreen('join'));

// 뒤로가기 버튼
document.getElementById('btn-back-from-create').addEventListener('click', () => showScreen('lobby'));
document.getElementById('btn-back-from-join').addEventListener('click', () => showScreen('lobby'));

// 방 생성 버튼
document.getElementById('btn-create-room').addEventListener('click', () => {
    const settings = {
        maxPlayers: document.getElementById('set-max-players').value,
        isPublic: document.getElementById('set-is-public').value === 'true',
        survivors: document.getElementById('set-survivors').value,
        hasRepechage: document.getElementById('set-repechage').checked,
        hasPlacement: document.getElementById('set-placement').checked
    };
    socket.emit('create_room', settings);
});

// 코드로 참가 버튼
document.getElementById('btn-join-code').addEventListener('click', () => {
    const code = document.getElementById('input-room-code').value.toUpperCase();
    if (code) socket.emit('join_room_by_code', { code });
});

// 랜덤 참가 버튼
document.getElementById('btn-join-random').addEventListener('click', () => {
    socket.emit('join_random_room');
});

// 방장 전용 시작 버튼
document.getElementById('btn-start-game').addEventListener('click', () => {
    socket.emit('host_start_game');
});

// ---- Socket 수신 처리 ----
socket.on('room_joined', (data) => {
    showScreen('waiting');
    document.getElementById('room-title').innerText = `ROOM CODE: ${data.roomCode}`;
    document.getElementById('max-players').innerText = data.maxPlayers;
    
    // 내가 방장이면 시작 버튼 표시
    if (data.isHost) {
        document.getElementById('btn-start-game').classList.remove('hidden');
        document.getElementById('waiting-msg').innerText = "참가자가 모이면 게임을 시작하세요.";
    }
});

socket.on('player_count_update', (count) => {
    document.getElementById('current-players').innerText = count;
});

// 게임 시작 신호
socket.on('game_start', (data) => {
    showScreen('game');
    // 여기서부터 기존 게임 루프(차트 로드, requestAnimationFrame) 시작
    setTimeout(() => {
        // ... (기존 게임 렌더링 로직 연동)
    }, data.startTime - Date.now());
});

socket.on('error_msg', (msg) => {
    alert(msg);
});
