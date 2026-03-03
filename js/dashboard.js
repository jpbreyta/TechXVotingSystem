document.addEventListener('DOMContentLoaded', () => {
    const leaderboardGrid = document.getElementById('leaderboardGrid');

    const Loader = {
        init() {
            if (document.getElementById('global-loader')) return;
            const loaderHtml = `
                <div id="global-loader" class="hidden fixed inset-0 z-[9999] items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
                    <div class="flex flex-col items-center">
                        <div class="relative w-24 h-24">
                            <img src="logo.png" alt="Tech X" class="w-full h-full object-contain animate-pulse">
                            <div class="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                        <p class="mt-4 text-blue-500 font-black uppercase tracking-[0.2em] text-[10px] animate-bounce">Updating Leaderboard...</p>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', loaderHtml);
        },
        show() {
            const el = document.getElementById('global-loader');
            if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
        },
        hide() {
            const el = document.getElementById('global-loader');
            if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
        }
    };

    Loader.init();

    async function updateScores() {
        const { data: booths } = await window.supabase.from('booths').select('*').order('section_name');
        const { data: votes } = await window.supabase.from('votes').select('booth_id');

        if (!booths || !votes) return;

        const voteCounts = {};
        votes.forEach(v => voteCounts[v.booth_id] = (voteCounts[v.booth_id] || 0) + 1);
        const highestVotes = Math.max(...Object.values(voteCounts), 0);

        const calculatedScores = booths.map(b => {
            // Updated to use judge_final_score from our new auto-average logic
            const rawJudgeScore = parseFloat(b.judge_final_score) || 0;
            const finalJudgePoints = rawJudgeScore * 0.4;
            const currentVotes = voteCounts[b.id] || 0;
            const digitalPoints = highestVotes > 0 ? (currentVotes / highestVotes) * 50 : 0;
            const stickerCount = b.sticker_count || 0;
            const meritPoints = Math.min(stickerCount, 10);
            const grandTotal = parseFloat((finalJudgePoints + digitalPoints + meritPoints).toFixed(2));

            return {
                ...b,
                currentVotes,
                digitalPoints,
                meritPoints,
                finalJudgePoints,
                grandTotal
            };
        });

        calculatedScores.sort((a, b) => b.grandTotal - a.grandTotal);

        leaderboardGrid.innerHTML = calculatedScores.map((s, index) => {
            let rankBadge = '';
            let boxBorder = 'border-slate-800 bg-slate-900/40';
            
            if (index === 0) {
                rankBadge = '<span class="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase mb-2 block w-fit">Current Leader</span>';
                boxBorder = 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]';
            } else if (index === 1) {
                rankBadge = '<span class="bg-slate-300 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase mb-2 block w-fit">2nd Place</span>';
            } else if (index === 2) {
                rankBadge = '<span class="bg-orange-400 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase mb-2 block w-fit">3rd Place</span>';
            }

            return `
                <div class="relative overflow-hidden border ${boxBorder} p-6 rounded-2xl flex flex-col transition-all duration-300 hover:border-slate-600">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex flex-col">
                            ${rankBadge}
                            <h2 class="text-xl font-black text-white uppercase tracking-tight leading-tight">${s.section_name}</h2>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-black text-blue-500 tracking-tighter">${s.grandTotal.toFixed(2)}<span class="text-[10px] ml-0.5">%</span></p>
                        </div>
                    </div>
                    <div class="space-y-3 mt-auto">
                        <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/50">
                            <div class="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                                 style="width: ${s.grandTotal}%"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2 border-t border-slate-800/50 pt-3 mt-2">
                            <div class="text-center">
                                <p class="text-[8px] text-slate-500 uppercase font-bold">Judges (40%)</p>
                                <p class="text-xs font-mono text-slate-300">${s.finalJudgePoints.toFixed(1)}</p>
                            </div>
                            <div class="text-center border-x border-slate-800/50">
                                <p class="text-[8px] text-slate-500 uppercase font-bold">Digital (50%)</p>
                                <p class="text-xs font-mono text-slate-300">${s.digitalPoints.toFixed(1)}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-[8px] text-slate-500 uppercase font-bold">Stars (10%)</p>
                                <p class="text-xs font-mono text-slate-300">${s.meritPoints}</p>
                            </div>
                        </div>
                    </div>
                    <div class="absolute -bottom-2 -right-1 opacity-[0.03] text-7xl font-black italic">
                        #${index + 1}
                    </div>
                </div>`;
        }).join('');
    }

    updateScores();

    // Real-time listeners
    window.supabase.channel('realtime-analytics')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, updateScores)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'booths' }, updateScores)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_scores' }, updateScores)
    .subscribe();
});