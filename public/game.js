const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const LANES = [0, 1, 2, 3];
const KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
const LANE_WIDTH = 90; // 캔버스 가로(360) / 4
const JUDGE_LINE_Y = 500;
const NOTE_SPEED = 500; 

const LANE_COLORS = ['#ff0055', '#00ffcc', '#00ffcc', '#ff0055'];

let notes = [];
let myScore = 0;
let myCombo = 0;
let isPlaying = false;
let lastTime = performance.now();

// 판정 텍스트 표시용 변수
let feedbackText = "";
let feedbackColor = "";
let feedbackTimer = 0;

const chartData = [
    { lane: 0, time: 1000 }, { lane: 1, time: 1500 },
    { lane: 2, time: 2000 }, { lane: 3, time: 2500 },
    { lane: 1, time: 3000 }, { lane: 2, time: 3000 },
    { lane: 0, time: 3500 }, { lane: 3, time: 4000 },
    { lane: 1, time: 4500 }, { lane: 2, time: 4500 }
];

socket.on('waiting_for_opponent', (data) => {
    document.getElementById('status').innerText = `방 입장완료 (${data.playerCount}/2) - 상대를 기다리는 중...`;
});

socket.on('game_start', (data) => {
    document.getElementById('status').innerText = "🔥 곧 게임이 시작됩니다! 🔥";
    document.getElementById('status').style.color = "#ff0055";
    
    setTimeout(() => {
        document.getElementById('status').innerText = "PLAYING";
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
    document.getElementById('status').innerText = "상대방이 도망갔습니다! 승리!";
    isPlaying = false;
});

function showFeedback(text, color) {
    feedbackText = text;
    feedbackColor = color;
    feedbackTimer = 30; // 약 0.5초(30프레임) 동안 표시
}

window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    const laneIndex = KEYS.indexOf(e.code);
    if (laneIndex === -1) return;

    const targetNote = notes.find(n => n.lane === laneIndex && !n.hit && Math.abs(n.y - JUDGE_LINE_Y) < 120);

    if (targetNote) {
        const diff = Math.abs(targetNote.y - JUDGE_LINE_Y);
        targetNote.hit = true;

        if (diff < 30) {
            myScore += 100;
            myCombo++;
            showFeedback("PERFECT!", "#00ffcc");
        } else if (diff < 80) {
            myScore += 50;
            myCombo++;
            showFeedback("GOOD", "#ffeb3b");
        } else {
            myCombo = 0;
            showFeedback("MISS", "#ff0055");
        }
    } else {
        // 허공에 쳤을 때 (선택사항: 주석 처리하면 페널티 없음)
        // myCombo = 0; 
    }
    syncScore();
});

function syncScore() {
    document.getElementById('my-score').innerText = myScore;
    document.getElementById('my-combo').innerText = myCombo;
    socket.emit('update_score', { score: myScore, combo: myCombo });
}

function gameLoop(now) {
    if (!isPlaying) return;
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 라인 구분선 렌더링
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, canvas.height);
        ctx.stroke();
    }

    // 2. 판정선 렌더링 (네온 글로우)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#66fcf1';
    ctx.fillStyle = '#66fcf1';
    ctx.fillRect(0, JUDGE_LINE_Y, canvas.width, 4);
    ctx.shadowBlur = 0; // 초기화

    // 3. 노트 렌더링
    notes.forEach(note => {
        if (!note.hit) {
            note.y += NOTE_SPEED * deltaTime;

            if (note.y > JUDGE_LINE_Y + 80) {
                note.hit = true;
                myCombo = 0;
                showFeedback("MISS", "#ff0055");
                syncScore();
            }

            const color = LANE_COLORS[note.lane];
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            
            // 모서리가 둥근 노트 느낌 연출
            ctx.fillRect(note.lane * LANE_WIDTH + 10, note.y, LANE_WIDTH - 20, 25);
            ctx.shadowBlur = 0;
        }
    });

    // 4. 판정 텍스트 렌더링 (PERFECT, GOOD, MISS)
    if (feedbackTimer > 0) {
        ctx.font = "bold 32px Orbitron";
        ctx.textAlign = "center";
        ctx.fillStyle = feedbackColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = feedbackColor;
        
        // 텍스트가 위로 살짝 떠오르는 애니메이션 효과
        ctx.fillText(feedbackText, canvas.width / 2, JUDGE_LINE_Y - 50 - (30 - feedbackTimer));
        
        ctx.shadowBlur = 0;
        feedbackTimer--;
    }

    requestAnimationFrame(gameLoop);
}
