import type { Category } from './types';
import type { Rng } from './rng';

export const TEXTS: Record<Exclude<Category, 'custom'>, string[]> = {
  beginner: [
    'The sun is warm and the sky is blue. We like to play in the park.',
    'I have a red ball. My dog runs fast to get it back to me.',
    'She can see a big tree. A small bird sits on the top of it.',
    'We eat rice and fish for lunch. Then we drink cold water.',
    'The cat sleeps on the soft bed all day. It is a calm cat.',
    'Tom and Sam ride the bus to school. They sit by the window.',
    'It is time to go home. Mom has made some hot tea for us.',
    'A little boat floats on the lake. The wind is soft and kind.',
  ],
  intermediate: [
    'Learning to type quickly is a skill that improves with steady practice. Short sessions every day work better than one long session on the weekend.',
    'The train arrived at the station just after noon, and passengers hurried across the platform with bags, umbrellas, and tickets in their hands.',
    'When you read a map carefully, you notice small details like rivers, bridges, and narrow roads that can save you a lot of time on a long journey.',
    'A good breakfast gives you energy for the morning, so try to eat something simple like eggs, fruit, or toast before you start your busy day.',
    'My neighbor grows tomatoes, peppers, and herbs in a tiny garden behind her house, and she always shares the best ones with everyone on our street.',
    'Rain fell softly against the window while we finished our homework, and the whole house smelled like fresh bread and warm cinnamon.',
    'Choosing a book at the library can be difficult, but reading the first page usually tells you whether the story is worth your evening.',
    'The football match was delayed by an hour because of heavy fog, but the fans stayed in their seats and sang until the players finally walked out.',
  ],
  advanced: [
    'Photosynthesis allows green plants to convert sunlight, water, and carbon dioxide into glucose and oxygen, a process that quietly sustains nearly every food chain on our planet.',
    'Although the committee initially rejected the proposal, a revised version that addressed budget concerns, environmental impact, and community feedback was eventually approved by a narrow margin.',
    'The architecture of the old city blends Byzantine arches, Ottoman domes, and modern glass towers, creating a skyline that tells the story of centuries of trade, conquest, and reinvention.',
    'Economists often argue that long-term growth depends less on natural resources than on education, institutions, and the steady accumulation of knowledge across generations.',
    'Meteorologists track pressure systems, ocean temperatures, and wind patterns to forecast storms, yet small changes in the atmosphere can still produce surprising and sometimes dangerous results.',
    'A well-designed experiment isolates a single variable, repeats the measurement many times, and records every result honestly, even when the outcome contradicts the original hypothesis.',
    'Printing, telegraphs, and eventually the internet each reduced the cost of spreading ideas, and each time societies had to rethink how they trust, verify, and debate information.',
    'The marathon runner paced herself carefully through the first half, saving enough strength to surge past exhausted rivals when the final hill finally appeared on the horizon.',
  ],
  professional: [
    'Pursuant to Section 4(b) of the agreement, the Contractor shall deliver all milestones by 31 March 2027; failure to do so may result in a penalty of 2.5% per week, capped at $15,000.',
    'Q3 revenue rose 12.4% year-over-year to $48.7 million, driven by subscription renewals (91% retention) and a 7% increase in average contract value, although operating margins narrowed slightly.',
    'The patient presented with acute dyspnea, tachycardia (118 bpm), and mild hypoxemia; an electrocardiogram, chest radiograph, and D-dimer assay were ordered immediately to rule out pulmonary embolism.',
    "Please be advised that the quarterly compliance review, originally scheduled for Tuesday, has been rescheduled to Thursday at 14:30 to accommodate the auditors' travel arrangements.",
    'Our infrastructure migration will proceed in three phases: assessment, parallel deployment, and cutover; each phase requires sign-off from engineering, security, and finance stakeholders.',
    'In accordance with the memorandum, all vendors must submit invoices, including itemized expenses, purchase-order numbers, and tax identification, within 30 days; incomplete submissions will be returned.',
    "The defendant's motion to dismiss was denied; however, the court granted limited discovery regarding the 2019 amendments, subject to a protective order and a 90-day deadline.",
    'Effective risk management requires identifying threats early, quantifying their likelihood and impact, assigning clear owners, and reviewing mitigation plans at regular, documented intervals.',
  ],
  programming: [
    'const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);',
    'function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }',
    'SELECT name, COUNT(*) AS orders FROM customers JOIN orders USING (id) GROUP BY name HAVING COUNT(*) > 5;',
    'A hash table maps keys to values using a hash function, giving average constant time for lookups, insertions, and deletions.',
    'for (let i = 0; i < arr.length; i++) { if (arr[i] % 2 === 0) evens.push(arr[i]); }',
    'squares = [x ** 2 for x in range(10) if x % 2 == 0]',
    'Recursion solves a problem by breaking it into smaller copies of itself until a simple base case can be answered directly.',
    'git checkout -b feature/login && git add . && git commit -m "Add login form" && git push -u origin feature/login',
    "interface User { id: number; name: string; email?: string; roles: Array<'admin' | 'editor'>; }",
    'const response = await fetch(`/api/users/${id}`); const data = await response.json();',
  ],
  bangla: [
    'আমি প্রতিদিন সকালে ঘুম থেকে উঠে একটু হাঁটতে যাই।',
    'বাংলাদেশ নদীমাতৃক দেশ, এখানে অসংখ্য নদী ও খাল রয়েছে।',
    'বই পড়া আমাদের জ্ঞান বাড়ায় এবং মনকে সতেজ রাখে।',
    'আমার মা প্রতিদিন সকালে সবার জন্য গরম চা ও নাশতা তৈরি করেন।',
    'শীতের সকালে কুয়াশার চাদরে ঢাকা মাঠে শিশুরা খেলা করে।',
    'নিয়মিত অনুশীলন করলে টাইপ করার গতি ও নির্ভুলতা দুটোই বাড়ে।',
    'বর্ষাকালে আকাশ মেঘলা থাকে আর ঝমঝম করে বৃষ্টি পড়ে।',
    'আমাদের স্কুলের মাঠে প্রতি শুক্রবার বিকেলে ফুটবল ম্যাচ হয়।',
  ],
};

const RECENT_KEY = 'typeracer.recent.v1';
const RECENT_MAX = 6;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(-RECENT_MAX))); } catch { /* ignore */ }
}

export const cleanCustomText = (t: string) => t.replace(/\s+/g, ' ').trim().slice(0, 1000);

export interface ProviderOptions { customText?: string; shortOnly?: boolean; persist?: boolean }

/**
 * Returns a function that yields the next passage. Recently used passages are skipped
 * (also across races via localStorage) so the same text does not come up repeatedly.
 */
export function createPassageProvider(category: Category, rng: Rng, opts: ProviderOptions = {}): () => string {
  if (category === 'custom') {
    const text = cleanCustomText(opts.customText || '') || 'Type your own text here to practice.';
    return () => text;
  }
  let pool = TEXTS[category].slice();
  if (opts.shortOnly) {
    const sorted = pool.slice().sort((a, b) => a.length - b.length);
    pool = sorted.slice(0, Math.max(3, Math.ceil(sorted.length / 2)));
  }
  const recent: string[] = opts.persist === false ? [] : loadRecent();
  return () => {
    let fresh = pool.filter((p) => !recent.includes(p));
    if (fresh.length === 0) { for (const p of pool) { const i = recent.indexOf(p); if (i >= 0) recent.splice(i, 1); } fresh = pool; }
    const pick = fresh[Math.floor(rng() * fresh.length)];
    recent.push(pick);
    while (recent.length > Math.min(RECENT_MAX, pool.length - 1)) recent.shift();
    if (opts.persist !== false) saveRecent(recent);
    return pick;
  };
}
