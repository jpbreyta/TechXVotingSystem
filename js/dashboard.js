document.addEventListener('DOMContentLoaded', () => {
    const leaderboardGrid = document.getElementById('leaderboardGrid');

    async function updateScores() {
        const { data: booths } = await window.supabase.from('booths').select('*');
        const { data: votes } = await window.supabase.from('votes').select('booth_id');

        const counts = {};
        votes.forEach(v => counts[v.booth_id] = (counts[v.booth_id] || 0) + 1);

        const voteValues = Object.values(counts);
        const highestVotes = voteValues.length > 0 ? Math.max(...voteValues) : 0;

        leaderboardGrid.innerHTML = booths.map(booth => {
            const rawVotes = counts[booth.id] || 0;
            
            const scaledScore = highestVotes > 0 ? ((rawVotes / highestVotes) * 50).toFixed(2) : "0.00";
            const barWidth = highestVotes > 0 ? (rawVotes / highestVotes) * 100 : 0;

            return `
                <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div class="flex justify-between items-end mb-4">
                        <div>
                            <h2 class="text-2xl font-bold text-white">${booth.section_name}</h2>
                            <p class="text-blue-400 font-mono text-sm">Raw Votes: ${rawVotes}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-slate-400 uppercase tracking-widest">Digital Score (50%)</span>
                            <p class="text-3xl font-black text-blue-500">${scaledScore} <span class="text-sm">pts</span></p>
                        </div>
                    </div>
                    <div class="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
                        <div class="bg-blue-600 h-full transition-all duration-1000" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateScores();

    window.supabase.channel('custom-all-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
        updateScores();
    }).subscribe();
});