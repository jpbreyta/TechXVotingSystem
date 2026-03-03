const notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    
    document.getElementById('boothSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.booth-card');
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    });
});

async function checkSession() {
    const activeJudge = localStorage.getItem('active_judge');
    if (activeJudge) {
        showPortal(activeJudge);
    }
}

async function verifyJudge() {
    const name = document.getElementById('inputJudgeName').value.trim();
    const code = document.getElementById('inputJudgeCode').value.trim();

    if (!name || !code) {
        notyf.error("Pakilagay ang pangalan at code, Boss!");
        return;
    }

    Loader.show();
    const { data, error } = await window.supabase
        .from('judges')
        .select('*')
        .eq('name', name)
        .eq('access_code', code)
        .single();

    Loader.hide();

    if (data) {
        localStorage.setItem('active_judge', data.name);
        notyf.success(`Welcome, ${data.name}!`);
        showPortal(data.name);
    } else {
        notyf.error("Invalid Credentials.");
    }
}

function showPortal(judgeName) {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('judgeInfo').classList.remove('hidden');
    document.getElementById('judgeDisplay').innerText = `Judge: ${judgeName}`;
    loadBooths();
}

async function loadBooths() {
    Loader.show();
    const judgeName = localStorage.getItem('active_judge');
    
    const [boothsRes, scoresRes] = await Promise.all([
        window.supabase.from('booths').select('*').order('section_name', { ascending: true }),
        window.supabase.from('judge_scores').select('booth_id').eq('judge_name', judgeName)
    ]);

    if (boothsRes.error) {
        notyf.error("Error fetching booths");
        Loader.hide();
        return;
    }

    const submittedIds = scoresRes.data?.map(s => s.booth_id) || [];
    const grid = document.getElementById('judgingGrid');
    
    grid.innerHTML = boothsRes.data.map(booth => {
        const isDone = submittedIds.includes(booth.id);
        return `
        <div class="booth-card bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl transition-all ${isDone ? 'opacity-40 pointer-events-none' : ''}" data-booth-id="${booth.id}">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="text-2xl font-black text-white">${booth.section_name}</h3>
                    <p class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">ID: ${booth.id.split('-')[0]}</p>
                </div>
                <div class="${isDone ? 'bg-green-600/20 text-green-500' : 'bg-blue-600/10 text-blue-500'} px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    ${isDone ? 'Finalized' : 'Pending'}
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="space-y-2">
                    <label class="text-[10px] uppercase font-black text-slate-500 ml-1">ILO 1 (50%)</label>
                    <input type="number" id="ilo1-${booth.id}" min="0" max="50" placeholder="0-50" ${isDone ? 'disabled' : ''}
                        class="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-center text-xl font-mono focus:ring-2 focus:ring-blue-600 outline-none transition">
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] uppercase font-black text-slate-500 ml-1">ILO 2 (50%)</label>
                    <input type="number" id="ilo2-${booth.id}" min="0" max="50" placeholder="0-50" ${isDone ? 'disabled' : ''}
                        class="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-center text-xl font-mono focus:ring-2 focus:ring-blue-600 outline-none transition">
                </div>
            </div>

            <button onclick="commitJudgeScore('${booth.id}', '${booth.section_name}')" 
                ${isDone ? 'disabled' : ''}
                class="w-full ${isDone ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-950 hover:bg-blue-500 hover:text-white'} py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95">
                ${isDone ? 'Submitted' : 'Submit Score'}
            </button>
        </div>
    `}).join('');
    Loader.hide();
}

window.commitJudgeScore = async (boothId, sectionName) => {
    const ilo1 = parseFloat(document.getElementById(`ilo1-${boothId}`).value);
    const ilo2 = parseFloat(document.getElementById(`ilo2-${boothId}`).value);
    
    if (isNaN(ilo1) || isNaN(ilo2)) {
        notyf.error("Input scores first!");
        return;
    }

    if (ilo1 > 50 || ilo2 > 50 || ilo1 < 0 || ilo2 < 0) {
        notyf.error("Score range: 0-50 only.");
        return;
    }

    const total = ilo1 + ilo2;
    const judgeName = localStorage.getItem('active_judge');

    const result = await Swal.fire({
        title: 'Confirm Submission',
        html: `<div class="text-left text-sm p-2">
                <p class="mb-1">Section: <span class="text-blue-400 font-bold">${sectionName}</span></p>
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-700 mt-2">
                    <div class="flex justify-between"><span>ILO 1:</span> <span>${ilo1}</span></div>
                    <div class="flex justify-between"><span>ILO 2:</span> <span>${ilo2}</span></div>
                    <hr class="my-2 border-slate-600">
                    <div class="flex justify-between font-black text-green-500"><span>TOTAL:</span> <span>${total}%</span></div>
                </div>
               </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Submit',
        background: '#0f172a',
        color: '#ffffff',
        confirmButtonColor: '#2563eb'
    });

    if (result.isConfirmed) {
        Loader.show();
        const { error } = await window.supabase
            .from('judge_scores')
            .insert([{ booth_id: boothId, judge_name: judgeName, ilo_1: ilo1, ilo_2: ilo2 }]);

        if (!error) {
            await syncBoothAverage(boothId);
            notyf.success(`Recorded!`);
            loadBooths();
        } else {
            Loader.hide();
            notyf.error("Database Error.");
        }
    }
};

async function syncBoothAverage(boothId) {
    const { data: scores } = await window.supabase
        .from('judge_scores')
        .select('ilo_1, ilo_2')
        .eq('booth_id', boothId);

    if (scores && scores.length > 0) {
        const totalRaw = scores.reduce((acc, s) => acc + (s.ilo_1 + s.ilo_2), 0);
        const averageScore = totalRaw / scores.length;

        await window.supabase
            .from('booths')
            .update({ judge_final_score: averageScore })
            .eq('id', boothId);
    }
}

function logout() {
    localStorage.removeItem('active_judge');
    location.reload();
}