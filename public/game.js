const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');

// 게임 설정
const KEYS = ['d', 'f', 'j', 'k'];
const COLUMN_WIDTH = canvas.width / 4;
const TARGET_Y = 500; // 판정선 위치
const NOTE_SPEED = 400; // 노드가 내려오는 속도 (px/sec)

let audioCtx;
let audioBuffer;
let audioSource;
let startTime = 0;
let beatmap = [];
let notes = [];
let score = 0;
let isPlaying = false;

// 키 입력 이벤트
const keyState = { d: false, f: false, j: false, k: false };

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (KEYS.includes(key) && !keyState[key]) {
    keyState[key] = true;
    checkHit(KEYS.indexOf(key));
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (KEYS.includes(key)) {
    keyState[key] = false;
  }
});

// 초기화 및 파일 로드
startBtn.addEventListener('click', async () => {
  startBtn.style.display = 'none';
  
  // 1. Web Audio API Context 생성 (사용자 클릭 시점에 생성해야 함)
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // 2. 음원 및 채보 다운로드
  const [audioRes, mapRes] = await Promise.all([
    fetch('/assets/song.mp3'),
    fetch('/assets/beatmap.json')
  ]);

  const audioData = await audioRes.arrayBuffer();
  audioBuffer = await audioCtx.decodeAudioData(audioData);
  
  const mapData = await mapRes.json();
  beatmap = mapData.notes;
  
  // 게임 시작
  startGame();
});

function startGame() {
  score = 0;
  notes = JSON.parse(JSON.stringify(beatmap)); // 복사본 사용
  
  audioSource = audioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(audioCtx.destination);

  startTime = audioCtx.currentTime;
  audioSource.start(0);
  isPlaying = true;

  requestAnimationFrame(update);
}

// 판정 체크 로직
function checkHit(columnIndex) {
  if (!isPlaying) return;

  const currentTime = audioCtx.currentTime - startTime;
  
  // 판정선 근처에 있는 해당 라인의 가장 가까운 노트 탐색
  const targetNoteIndex = notes.findIndex(
    note => note.key === columnIndex && !note.hit
  );

  if (targetNoteIndex !== -1) {
    const note = notes[targetNoteIndex];
    const timeDiff = Math.abs(currentTime - note.time);

    // 판정 범위 (초 단위)
    if (timeDiff < 0.1) { // Perfect
      score += 100;
      note.hit = true;
    } else if (timeDiff < 0.2) { // Good
      score += 50;
      note.hit = true;
    }
    scoreEl.innerText = `Score: ${score}`;
  }
}

// 메인 프레임 업데이트 루프
function update() {
  if (!isPlaying) return;

  const currentTime = audioCtx.currentTime - startTime;

  // 화면 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 라인 및 판정선 그리기
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = '#333';
    ctx.strokeRect(i * COLUMN_WIDTH, 0, COLUMN_WIDTH, canvas.height);
  }
  ctx.fillStyle = 'red';
  ctx.fillRect(0, TARGET_Y, canvas.width, 5); // 판정선

  // 노트 그리기
  notes.forEach(note => {
    if (note.hit) return;

    // 노트의 Y 좌표 계산 = 판정선 - (노트시간 - 현재시간) * 속도
    const timeRemaining = note.time - currentTime;
    const noteY = TARGET_Y - (timeRemaining * NOTE_SPEED);

    // 화면 범위 안에 있을 때만 그리기
    if (noteY > -20 && noteY < canvas.height) {
      ctx.fillStyle = ['#00ffff', '#00ff00', '#ffff00', '#ff00ff'][note.key];
      ctx.fillRect(note.key * COLUMN_WIDTH + 5, noteY, COLUMN_WIDTH - 10, 20);
    }
  });

  requestAnimationFrame(update);
}
