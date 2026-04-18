document.addEventListener('DOMContentLoaded', () => {
    const leaderboardGrid = document.getElementById('leaderboardGrid');

    async function updateScores() {
        try {
            const { data: booths, error: boothsError } = await window.supabase.from('booths').select('*').order('section_name');
            if (boothsError) {
                console.error('Error fetching booths:', boothsError);
                return;
            }

            const { data: votes, error: votesError } = await window.supabase.from('votes').select('booth_id');
            if (votesError) {
                console.error('Error fetching votes:', votesError);
                return;
            }

            if (!booths || !votes) return;

            const voteCounts = {};
            votes.forEach(v => voteCounts[v.booth_id] = (voteCounts[v.booth_id] || 0) + 1);

            const clusterCounts = { A: {}, B: {} };
            votes.forEach(v => {
                const booth = booths.find(b => b.id === v.booth_id);
                if (booth && booth.cluster && clusterCounts[booth.cluster]) {
                    clusterCounts[booth.cluster][v.booth_id] = (clusterCounts[booth.cluster][v.booth_id] || 0) + 1;
                }
            });

            const clusterMaxVotes = {
                A: Math.max(...Object.values(clusterCounts.A), 0),
                B: Math.max(...Object.values(clusterCounts.B), 0)
            };

            const calculatedScores = booths.map(b => {
                const rawJudgeScore = parseFloat(b.judge_final_score) || 0;
                const finalJudgePoints = rawJudgeScore * 0.4;
                const currentVotes = voteCounts[b.id] || 0;
                const maxInCluster = clusterMaxVotes[b.cluster] || 0;
                const digitalPoints = maxInCluster > 0 ? (currentVotes / maxInCluster) * 50 : 0;
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

            const clusterA = calculatedScores.filter(b => b.cluster === 'A').sort((a, b) => b.grandTotal - a.grandTotal);
            const clusterB = calculatedScores.filter(b => b.cluster === 'B').sort((a, b) => b.grandTotal - a.grandTotal);

            function renderCluster(clusterData) {
                return clusterData.map((s, index) => {
                    let boxBorder = 'border-slate-800 bg-slate-900/40';
                    let rankBg = 'text-slate-500';
                    
                    if (index === 0) {
                        boxBorder = 'border-yellow-500/40 bg-yellow-500/5';
                        rankBg = 'text-yellow-500';
                    } else if (index === 1) {
                        rankBg = 'text-slate-300';
                    } else if (index === 2) {
                        rankBg = 'text-orange-400';
                    }

                    return `
                        <div class="relative overflow-hidden border ${boxBorder} p-4 rounded-lg flex flex-col gap-3 transition-all duration-300 hover:border-slate-600">
                            <div class="flex items-center gap-3">
                                <p class="text-2xl font-black ${rankBg} w-8">#${index + 1}</p>
                                <div class="flex flex-col">
                                    <span class="text-base font-black text-white uppercase">${s.section_name}</span>
                                    <span class="text-xs text-blue-400">${s.project_name || ''}</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex gap-4">
                                    <div class="bg-slate-800/50 px-3 py-1.5 rounded">
                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Judge</p>
                                        <p class="text-lg font-black text-yellow-400">${s.finalJudgePoints.toFixed(1)}</p>
                                    </div>
                                    <div class="bg-slate-800/50 px-3 py-1.5 rounded">
                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Digital</p>
                                        <p class="text-lg font-black text-blue-400">${s.digitalPoints.toFixed(1)}</p>
                                    </div>
                                    <div class="bg-slate-800/50 px-3 py-1.5 rounded">
                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Stickers</p>
                                        <p class="text-lg font-black text-green-400">${s.meritPoints}</p>
                                    </div>
                                    <div class="bg-slate-800/50 px-3 py-1.5 rounded">
                                        <p class="text-[10px] text-slate-400 uppercase font-bold">Votes</p>
                                        <p class="text-lg font-black text-purple-400">${s.currentVotes}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-2xl font-black text-white">${s.grandTotal.toFixed(1)}%</p>
                                    <p class="text-[10px] text-slate-500 uppercase font-bold">Total</p>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            }

            leaderboardGrid.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h2 class="text-xl font-black text-yellow-400 uppercase tracking-tight mb-3 flex items-center gap-2">
                            <span class="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded text-sm">Cluster A</span>
                        </h2>
                        <div class="grid grid-cols-1 gap-3">
                            ${renderCluster(clusterA)}
                        </div>
                    </div>
                    <div>
                        <h2 class="text-xl font-black text-blue-400 uppercase tracking-tight mb-3 flex items-center gap-2">
                            <span class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-sm">Cluster B</span>
                        </h2>
                        <div class="grid grid-cols-1 gap-3">
                            ${renderCluster(clusterB)}
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Error in updateScores:', err);
        }
    }

    // Initial load
    updateScores().catch(err => console.error('Initial load error:', err));

    // Real-time listeners
    const channel = window.supabase.channel('realtime-analytics')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        console.log('Vote change detected');
        updateScores();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'booths' }, () => {
        console.log('Booth change detected');
        updateScores();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_scores' }, () => {
        console.log('Judge score change detected');
        updateScores();
    })
    .subscribe((status) => {
        console.log('Realtime status:', status);
    });

    // Auto-refresh fallback every 10 seconds
    setInterval(() => {
        console.log('Polling update...');
        updateScores();
    }, 10000);
});