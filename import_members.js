const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyCJqp4e8BMkEbOO3ErWXJiz0zx9J3pxl34",
  authDomain: "a-boost.firebaseapp.com",
  projectId: "a-boost",
  storageBucket: "a-boost.firebasestorage.app",
  messagingSenderId: "431608615443",
  appId: "1:431608615443:web:5fb112e76f2d6ef3b7e5e6"
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const NEW_MEMBERS = [
  { name: "吉田絢音", grade: "1年" },
  { name: "外山直紀", grade: "1年" },
  { name: "日下愛梨", grade: "1年" },
  { name: "守重 澪", grade: "1年" },
  { name: "宇佐美由依", grade: "1年" },
  { name: "朝日総司", grade: "1年" },
  { name: "加藤奏汰", grade: "1年" },
  { name: "今井洸羽", grade: "1年" },
  { name: "三津井 昂大", grade: "1年" },
  { name: "山田想来", grade: "1年" },
  { name: "大平朔太郎", grade: "1年" },
  { name: "吉野聖人", grade: "1年" },
  { name: "佐川愛子", grade: "1年" },
  { name: "大野栞奈", grade: "1年" },
  { name: "北村陽太", grade: "1年" },
  { name: "野澤風音", grade: "1年" },
  { name: "外川 慶次郎", grade: "1年" },
  { name: "川﨑 梨音", grade: "1年" },
  { name: "戸田暁道", grade: "1年" },
  { name: "石倉平蔵", grade: "1年" },
  { name: "兼丸 怜穏", grade: "1年" },
  { name: "野田晃希", grade: "1年" },
  { name: "森山翔世", grade: "1年" },
  { name: "堤南菜恵", grade: "1年" },
  { name: "川畑 楓", grade: "1年" },
  { name: "伊藤禅", grade: "1年" },
  { name: "小林啓悟", grade: "2年" },
  { name: "石飛百々華", grade: "2年" },
  { name: "西野沙也加", grade: "2年" },
  { name: "河住 陽茉莉", grade: "2年" },
  { name: "白尾灯子", grade: "2年" },
  { name: "石榑桃大", grade: "2年" },
  { name: "稲辺優人", grade: "2年" },
  { name: "白坂香乃", grade: "2年" },
  { name: "榊原唯衣", grade: "2年" },
  { name: "小林侑矢", grade: "2年" },
  { name: "篠塚宗之介", grade: "2年" },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log('匿名ログイン中...');
  await signInAnonymously(auth);

  const ref = doc(db, 'app', 'data');
  console.log('Firestoreからデータ取得中...');
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data().members || []) : [];
  console.log(`既存メンバー: ${existing.length}名`);

  const names = new Set(existing.map(m => m.name));
  const toAdd = NEW_MEMBERS.filter(m => !names.has(m.name))
    .map(m => ({ id: genId(), name: m.name, grade: m.grade, dept: '', email: '' }));

  console.log(`追加対象: ${toAdd.length}名 / スキップ: ${NEW_MEMBERS.length - toAdd.length}名`);
  if (!toAdd.length) { console.log('追加なし'); process.exit(0); }

  await setDoc(ref, { members: [...existing, ...toAdd] }, { merge: true });

  console.log(`\n✅ ${toAdd.length}名を追加しました`);
  toAdd.forEach(m => console.log(`  + ${m.name}（${m.grade}）`));
  process.exit(0);
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
