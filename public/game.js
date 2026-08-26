const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const LANES = [0, 1, 2, 3];
const KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
const LANE_WIDTH = 80;
const JUDGE_LINE_Y = 500;
const NOTE_SPEED = 400; // 초당 400px 이동 (낙하 물리 속도)

let notes = [];
let myScore = 0;
let myCombo = 0;
let isPlaying = false;
let lastTime = performance.now();

// 간단한 악보 생성 데이터 (라인 번호, 떨어질 타임스탬프 ms)
const chartData = [
    { lane: 0, time: 1000 }, { lane: 1, time: 1500 },
    { lane: 2, time: 2000 }, { lane: 3, time: 2500 },
    { lane: 1, time: 3000 }, { lane: 2, time: 3000 },
    { lane: 0, time: 3500 }, { lane: 3, time: 4000 }
];

// Socket 이벤트 통신
socket.on('waiting_for_opponent', (data) => {
    document.getElementById('status').innerText = `방 입장완료 (${data.playerCount}/2). 상대 기다리는 중...`;
});

socket.on('game_start', (data) => {
    document.getElementById('status').innerText = "🔥 게임 시작!";
    setTimeout(() => {
        notes = chartData.map(n => ({ ...n, y: -50, hit: false }));
        isPlaying = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }, data.startTime - Date.now());
});

socket.on('opponent_score', (data) => {
    document.getElementById('op-score').innerText = data.score;
    document.getElementById('op-combo').innerText = data.combo;
});

socket.on('opponent_left', () => {
    document.getElementById('status').innerText = "상대방이 나가 게임이 종료되었습니다.";
    isPlaying = false;
});

// 키보드 입력을 통한 판정 로직
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    const laneIndex = KEYS.indexOf(e.code);
    if (laneIndex === -1) return;

    // 해당 라인의 가장 인접한 노트 검사
    const targetNote = notes.find(n => n.lane === laneIndex && !n.hit && Math.abs(n.y - JUDGE_LINE_Y) < 100);

    if (targetNote) {
        const diff = Math.abs(targetNote.y - JUDGE_LINE_Y);
        targetNote.hit = true;

        if (diff < 30) {
            myScore += 100;
            myCombo++;
        } else {
            myScore += 50;
            myCombo++;
        }
    } else {
        myCombo = 0; // 공타 시 콤보 리셋
    }
    syncScore();
});

function syncScore() {
    document.getElementById('my-score').innerText = myScore;
    document.getElementById('my-combo').innerText = myCombo;
    socket.emit('update_score', { score: myScore, combo: myCombo });
}

// 델타 타임 기반의 물리 렌더링 루프 (모니터 주사율 60Hz, 144Hz 모두 일정하게 이동)
function gameLoop(now) {
    if (!isPlaying) return;
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 라인 및 판정선 그리기
    for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#444';
        ctx.strokeRect(i * LANE_WIDTH, 0, LANE_WIDTH, canvas.height);
    }
    ctx.fillStyle = 'red';
    ctx.fillRect(0, JUDGE_LINE_Y, canvas.width, 5);

    // 2. 노트 위치 업데이트 (물리) & 그리기
    notes.forEach(note => {
        if (!note.hit) {
            note.y += NOTE_SPEED * deltaTime;

            // Miss 처리 (판정선을 지나친 경우)
            if (note.y > JUDGE_LINE_Y + 50) {
                note.hit = true;
                myCombo = 0;
                syncScore();
            }

            // 노트 렌더링
            ctx.fillStyle = ['#FF5722', '#2196F3', '#FFEB3B', '#4CAF50'][note.lane];
            ctx.fillRect(note.lane * LANE_WIDTH + 5, note.y, LANE_WIDTH - 10, 20);
        }
    });

    requestAnimationFrame(gameLoop);
}
