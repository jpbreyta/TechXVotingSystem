document.addEventListener('DOMContentLoaded', () => {
    const leaderboardGrid = document.getElementById('leaderboardGrid');

    async function updateScores() {
        const { data: booths } = await window.supabase.from('booths').select('*').order('section_name');
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
                <div class="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl transition-all hover:border-slate-700">
                    <div class="flex justify-between items-end mb-4">
                        <div>
                            <h2 class="text-xl font-black text-white uppercase tracking-tight">${booth.section_name}</h2>
                            <p class="text-slate-500 font-mono text-[10px] uppercase tracking-widest mt-1">Aggregate: ${rawVotes} units</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Weighted Performance (50%)</span>
                            <p class="text-3xl font-black text-blue-500 tracking-tighter">${scaledScore} <span class="text-xs text-blue-400 font-medium tracking-normal">PTS</span></p>
                        </div>
                    </div>
                    <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/50">
                        <div class="bg-gradient-to-r from-blue-700 to-blue-500 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                             style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateScores();

    window.supabase.channel('realtime-votes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        updateScores();
    }).subscribe();
});