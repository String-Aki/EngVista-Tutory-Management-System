export const RANKS = [
  { id: "rank_1", name: "Initiate", min: 0, desc: "Unlocked on first ID scan.", color: "from-slate-400 to-slate-500", bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-600", icon: "Book", emoji: "📚" },
  { id: "rank_2", name: "Scholar", min: 300, desc: "Reached 300 Points.", color: "from-blue-400 to-blue-600", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", icon: "Microscope", emoji: "🔬" },
  { id: "rank_3", name: "Achiever", min: 900, desc: "Reached 900 Points.", color: "from-emerald-400 to-emerald-600", bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", icon: "Star", emoji: "⭐" },
  { id: "rank_4", name: "Elite", min: 2000, desc: "Reached 2,000 Points.", color: "from-indigo-500 to-indigo-700", bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-700", icon: "Medal", emoji: "🏅" },
  { id: "rank_5", name: "Legend", min: 5000, desc: "Reached 5,000 Points.", color: "from-amber-400 to-orange-500", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", icon: "Trophy", emoji: "🏆" },
];

export const ACHIEVEMENTS = [
  { id: "player_one", name: "Player One", desc: "First to check in for the day.", icon: "🕹️", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-600" },
  { id: "warp_speed", name: "Warp Speed", desc: "Checked in early 5 classes in a row.", icon: "🚀", bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-600" },
  { id: "fully_charged", name: "Fully Charged", desc: "Perfect attendance for 3 months.", icon: "🔋", bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-600" },
  { id: "glitch_free", name: "Glitch-Free", desc: "10 classes attended without an absence.", icon: "🛡️", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-600" },
  { id: "brain_blast", name: "Brain Blast", desc: "Awarded for exceptional performance.", icon: "💡", bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-600" },
  { id: "perfect_exam", name: "Flawless Victory", desc: "Score 100% on any major examination.", icon: "🎯", bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-600" },
];

export function calculateRank(totalXp: number) {
  let currentRankIndex = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (totalXp >= RANKS[i].min) {
      currentRankIndex = i;
    } else {
      break; 
    }
  }

  const currentRank = RANKS[currentRankIndex];
  const nextRank = RANKS[currentRankIndex + 1]; 

  let progressPercentage = 100;
  let xpToNext = 0;

  if (nextRank) {
    const xpIntoCurrentLevel = totalXp - currentRank.min;
    const xpRequiredForNext = nextRank.min - currentRank.min;
    progressPercentage = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpRequiredForNext) * 100));
    xpToNext = nextRank.min - totalXp;
  }

  return {
    level: currentRankIndex + 1,
    rankName: currentRank.name,
    icon: currentRank.icon,
    emoji: currentRank.emoji,
    progressPercentage,
    xpToNext,
    isMaxRank: !nextRank
  };
}