// Rule-based "AI": keyword scoring -> category, department, priority.
const RULES = {
  Pothole: { dept: 'Roads & Highways', words: ['pothole', 'road', 'crack', 'asphalt', 'pit', 'speed breaker', 'highway', 'bridge'] },
  Garbage: { dept: 'Sanitation & Waste Management', words: ['garbage', 'trash', 'waste', 'dump', 'litter', 'dustbin', 'smell', 'stink', 'rubbish'] },
  Streetlight: { dept: 'Electricity Board', words: ['streetlight', 'street light', 'lamp', 'light', 'dark', 'electric', 'pole', 'wire', 'transformer'] },
  Drainage: { dept: 'Water & Drainage', words: ['drain', 'drainage', 'sewage', 'sewer', 'manhole', 'overflow', 'flood', 'waterlogging', 'clog', 'pipe', 'water leak'] },
  Other: { dept: 'General Administration', words: [] }
};
const HIGH = ['accident', 'danger', 'dangerous', 'injury', 'injured', 'death', 'live wire', 'open manhole', 'flood', 'fire', 'collapse', 'urgent', 'emergency', 'child', 'school', 'hospital', 'disease', 'overflow'];
const MED = ['broken', 'damaged', 'blocked', 'clogged', 'leak', 'days', 'week', 'not working', 'many', 'foul'];
const BASE = { Pothole: 1, Drainage: 1, Streetlight: 0, Garbage: 0, Other: 0 };

function classify(text = '') {
  const t = text.toLowerCase();
  let best = 'Other', top = 0;
  for (const [cat, r] of Object.entries(RULES)) {
    const score = r.words.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);
    if (score > top) { top = score; best = cat; }
  }
  const h = HIGH.filter(w => t.includes(w)).length, m = MED.filter(w => t.includes(w)).length;
  const score = h * 2 + m + BASE[best];
  const priority = score >= 3 ? 'High' : score >= 1 ? 'Medium' : 'Low';
  return { category: best, department: RULES[best].dept, priority, confidence: top ? Math.min(0.95, 0.5 + top * 0.15) : 0.3 };
}
const departments = Object.values(RULES).map(r => r.dept);
module.exports = { classify, departments, categories: Object.keys(RULES) };
