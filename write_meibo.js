const XLSX = require('xlsx');

const MEMBERS = [
  { name: "吉田絢音",   grade: "1年生", id: "ng6075" },
  { name: "外山直紀",   grade: "1年生", id: "lk6093" },
  { name: "日下愛梨",   grade: "1年生", id: "1gk6303a" },
  { name: "小林啓悟",   grade: "2年生", id: "1mg5088k" },
  { name: "守重 澪",    grade: "1年生", id: "1gk6314" },
  { name: "宇佐美由依", grade: "1年生", id: "1mr6011y" },
  { name: "石飛百々華", grade: "2年生", id: "MR5117" },
  { name: "朝日総司",   grade: "1年生", id: "lk6295" },
  { name: "加藤奏汰",   grade: "1年生", id: "MR6036" },
  { name: "今井洸羽",   grade: "1年生", id: "MR6058" },
  { name: "西野沙也加", grade: "2年生", id: "SB5036" },
  { name: "三津井 昂大", grade: "1年生", id: "gk6322" },
  { name: "河住 陽茉莉", grade: "2年生", id: "ex5307" },
  { name: "山田想来",   grade: "1年生", id: "GK6159" },
  { name: "白尾灯子",   grade: "2年生", id: "GK5183" },
  { name: "大平朔太郎", grade: "1年生", id: "MR6131" },
  { name: "吉野聖人",   grade: "1年生", id: "gk6098" },
  { name: "佐川愛子",   grade: "1年生", id: "SB6006" },
  { name: "石榑桃大",   grade: "2年生", id: "MR5183" },
  { name: "稲辺優人",   grade: "2年生", id: "GK5315" },
  { name: "大野栞奈",   grade: "1年生", id: "SB6072" },
  { name: "北村陽太",   grade: "1年生", id: "ex6099" },
  { name: "白坂香乃",   grade: "2年生", id: "lb5142" },
  { name: "野澤風音",   grade: "1年生", id: "GK6221" },
  { name: "外川 慶次郎", grade: "1年生", id: "GK6075" },
  { name: "川﨑 梨音",  grade: "1年生", id: "MG6099" },
  { name: "戸田暁道",   grade: "1年生", id: "ex6236" },
  { name: "石倉平蔵",   grade: "1年生", id: "ex6051" },
  { name: "兼丸 怜穏",  grade: "1年生", id: "EX6225" },
  { name: "野田晃希",   grade: "1年生", id: "SK6009" },
  { name: "森山翔世",   grade: "1年生", id: "MR6154" },
  { name: "榊原唯衣",   grade: "2年生", id: "MG5263" },
  { name: "堤南菜恵",   grade: "1年生", id: "1mg6115n" },
  { name: "川畑 楓",    grade: "1年生", id: "mg6065" },
  { name: "小林侑矢",   grade: "2年生", id: "MG5030" },
  { name: "篠塚宗之介", grade: "2年生", id: "LK5136" },
  { name: "伊藤禅",     grade: "1年生", id: "ex6232" },
];

const filePath = 'C:/Users/issin/Downloads/03_準公認サークル名簿.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['準公認サークル名簿'];

// データはrow8（0-indexed: 7）から書き込む
// A列の番号も必要に応じて追加
MEMBERS.forEach((m, i) => {
  const row = 7 + i; // 0-indexed (row8 = index7)
  const seqNum = i + 2; // 2始まり（1はヘッダー行）

  // 30行を超える場合はA列の番号も追加
  if (row >= 36) {
    const aAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    ws[aAddr] = { v: seqNum, t: 'n' };
  }

  const bAddr = XLSX.utils.encode_cell({ r: row, c: 1 }); // B列: 学生番号
  const cAddr = XLSX.utils.encode_cell({ r: row, c: 2 }); // C列: 氏名
  const dAddr = XLSX.utils.encode_cell({ r: row, c: 3 }); // D列: 備考（学年）

  ws[bAddr] = { v: m.id,    t: 's' };
  ws[cAddr] = { v: m.name,  t: 's' };
  ws[dAddr] = { v: m.grade, t: 's' };
});

// シート範囲を更新
const lastRow = 7 + MEMBERS.length - 1;
ws['!ref'] = `A1:D${lastRow + 1}`;

XLSX.writeFile(wb, filePath);
console.log(`✅ ${MEMBERS.length}名を書き込みました → ${filePath}`);
