async function loadTabulation() {
    const { data: booths } = await window.supabase.from('booths').select('*');
    const { data: votes } = await window.supabase.from('votes').select('booth_id');

    const voteCounts = {};
    votes.forEach(v => voteCounts[v.booth_id] = (voteCounts[v.booth_id] || 0) + 1);

    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const maxStickers = Math.max(...booths.map(b => b.sticker_count), 0);

    const tbody = document.getElementById('tabulationBody');
    tbody.innerHTML = booths.map(b => {
        const vCount = voteCounts[b.id] || 0;
        const sCount = b.sticker_count || 0;

        const digitalScore = maxVotes > 0 ? ((vCount / maxVotes) * 50) : 0;
        const stickerScore = maxStickers > 0 ? ((sCount / maxStickers) * 50) : 0;
        const finalScore = (digitalScore + stickerScore).toFixed(2);

        return `
            <tr class="hover:bg-slate-800/30 transition">
                <td class="p-4 font-bold text-blue-400">${b.section_name}</td>
                <td class="p-4 text-center text-slate-300">${digitalScore.toFixed(2)}%</td>
                <td class="p-4 text-center text-slate-300">${stickerScore.toFixed(2)}%</td>
                <td class="p-4 text-center font-black text-white bg-blue-900/10">${finalScore}%</td>
            </tr>
        `;
    }).join('');
}