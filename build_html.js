const fs = require('fs');
const logoB64 = fs.readFileSync('ロゴ.PNG').toString('base64');

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>イベントカード</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #eee; }

  .card {
    width: 210mm;
    height: 297mm;
    background: #fff;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 60mm;
    page-break-after: always;
    margin: 0 auto 20px;
  }

  .logo {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 85%;
    opacity: 0.15;
    pointer-events: none;
  }

  .numbers {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 120px;
  }

  .num {
    font-size: 160px;
    font-weight: bold;
    color: #111;
    line-height: 1;
  }

  @media print {
    body { background: #fff; }
    .card { margin: 0; }
  }
</style>
</head>
<body>
<script>
const data = [
  { ans: 8,   pairs: [[3,5],[1,7],[2,6],[4,4],[1,7],[3,5],[2,6]] },
  { ans: 18,  pairs: [[7,11],[9,9],[8,10],[6,12],[5,13],[4,14],[3,15]] },
  { ans: 23,  pairs: [[11,12],[5,18],[9,14],[3,20],[7,16],[15,8],[1,22]] },
  { ans: 37,  pairs: [[19,18],[15,22],[12,25],[10,27],[8,29],[6,31],[4,33]] },
  { ans: 42,  pairs: [[17,25],[20,22],[13,29],[10,32],[8,34],[6,36],[4,38]] },
  { ans: 55,  pairs: [[28,27],[25,30],[22,33],[20,35],[18,37],[15,40],[12,43]] },
  { ans: 64,  pairs: [[27,37],[30,34],[20,44],[15,49],[10,54],[5,59],[1,63]] },
  { ans: 74,  pairs: [[38,36],[35,39],[30,44],[25,49],[20,54],[15,59],[10,64]] },
  { ans: 91,  pairs: [[45,46],[40,51],[35,56],[30,61],[25,66],[20,71],[15,76]] },
  { ans: 112, pairs: [[58,54],[55,57],[50,62],[45,67],[40,72],[35,77],[30,82]] },
  { ans: 133, pairs: [[67,66],[60,73],[55,78],[50,83],[45,88],[40,93],[35,98]] },
  { ans: 147, pairs: [[83,64],[70,77],[50,97],[100,47],[73,74],[60,87],[90,57]] },
  { ans: 156, pairs: [[79,77],[75,81],[70,86],[65,91],[60,96],[55,101],[50,106]] },
  { ans: 176, pairs: [[89,87],[85,91],[80,96],[75,101],[70,106],[65,111],[60,116]] },
  { ans: 189, pairs: [[94,95],[90,99],[85,104],[80,109],[75,114],[70,119],[65,124]] },
  { ans: 200, pairs: [[87,113],[134,66],[149,51],[163,37],[78,122],[121,79],[143,57]] },
];

for (let i = 0; i < data.length; i++) {
  for (let p = 0; p < 7; p++) {
    const [a, b] = data[i].pairs[p];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<img class="logo" src="data:image/png;base64,${logoB64}"><div class="numbers"><span class="num">' + a + '</span><span class="num">' + b + '</span></div>';
    document.body.appendChild(card);
  }
}
<\/script>
</body>
</html>`;

fs.writeFileSync('event_cards.html', html);
console.log('HTMLを生成しました');
