const notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'top' } });

window.clampValue = function(input, max) {
    if (parseInt(input.value) > max) {
        input.value = max;
    }
    if (parseInt(input.value) < 0) {
        input.value = 0;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
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

let selectedBoothId = '';
let selectedBoothName = '';

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
    const pendingBooths = boothsRes.data.filter(b => !submittedIds.includes(b.id));
    const container = document.getElementById('judgingGrid');
    
    if (pendingBooths.length === 0) {
        document.getElementById('boothSelectContainer').classList.add('hidden');
        document.getElementById('gradingForm').classList.add('hidden');
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">✓</div>
                <h3 class="text-2xl font-black text-white mb-2">All Booths Graded!</h3>
                <p class="text-slate-500">You've submitted scores for all booths.</p>
            </div>`;
        Loader.hide();
        return;
    }

    document.getElementById('boothSelect').innerHTML = `
        <option value="">Select a booth...</option>
        ${pendingBooths.map(b => `<option value="${b.id}">${b.section_name} (Cluster ${b.cluster})</option>`).join('')}
    `;

    document.getElementById('boothSelectContainer').classList.remove('hidden');
    document.getElementById('gradingForm').classList.add('hidden');
    document.getElementById('scoringSection').classList.add('hidden');
    document.getElementById('submitBtn').classList.add('hidden');
    Loader.hide();
}

window.loadSelectedBooth = async () => {
    const boothId = document.getElementById('boothSelect').value;
    if (!boothId) {
        document.getElementById('gradingForm').classList.add('hidden');
        return;
    }

    const { data: booth } = await window.supabase.from('booths').select('*').eq('id', boothId).single();
    if (!booth) return;

    selectedBoothId = booth.id;
    selectedBoothName = booth.section_name;

    document.getElementById('selectedBoothName').innerText = booth.section_name;
    document.getElementById('selectedBoothInfo').innerText = `Cluster ${booth.cluster} | ID: ${booth.id.split('-')[0]}`;
    document.getElementById('gradingForm').classList.remove('hidden');
    document.getElementById('scoringSection').classList.remove('hidden');
    document.getElementById('submitBtn').classList.remove('hidden');

    document.getElementById('ilo1a').value = '';
    document.getElementById('ilo1b').value = '';
    document.getElementById('ilo1c').value = '';
    document.getElementById('ilo2a').value = '';
    document.getElementById('ilo2b').value = '';
    document.getElementById('ilo2c').value = '';
};

window.submitScore = async () => {
    const ilo1a = parseFloat(document.getElementById('ilo1a').value) || 0;
    const ilo1b = parseFloat(document.getElementById('ilo1b').value) || 0;
    const ilo1c = parseFloat(document.getElementById('ilo1c').value) || 0;
    const ilo2a = parseFloat(document.getElementById('ilo2a').value) || 0;
    const ilo2b = parseFloat(document.getElementById('ilo2b').value) || 0;
    const ilo2c = parseFloat(document.getElementById('ilo2c').value) || 0;
    
    const section1Total = ilo1a + ilo1b + ilo1c;
    const section2Total = ilo2a + ilo2b + ilo2c;
    const grandTotal = section1Total + section2Total;

    if (grandTotal === 0) {
        notyf.error("Input scores first!");
        return;
    }

    if (ilo1a > 20 || ilo1b > 15 || ilo1c > 15 || ilo2a > 20 || ilo2b > 15 || ilo2c > 15 ||
        ilo1a < 0 || ilo1b < 0 || ilo1c < 0 || ilo2a < 0 || ilo2b < 0 || ilo2c < 0) {
        notyf.error("Invalid score range.");
        return;
    }

    const judgeName = localStorage.getItem('active_judge');

    const result = await Swal.fire({
        title: 'Confirm Submission',
        html: `<div class="text-left text-sm p-2">
                <p class="mb-1">Section: <span class="text-blue-400 font-bold">${selectedBoothName}</span></p>
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-700 mt-2">
                    <div class="flex justify-between"><span>Section 1 (ILO 1):</span> <span>${section1Total}/50</span></div>
                    <div class="flex justify-between"><span>Section 2 (ILO 2):</span> <span>${section2Total}/50</span></div>
                    <hr class="my-2 border-slate-600">
                    <div class="flex justify-between font-black text-green-500"><span>TOTAL:</span> <span>${grandTotal}/100</span></div>
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
        const judgeName = localStorage.getItem('active_judge');
        
        const { data: existingScore } = await window.supabase
            .from('judge_scores')
            .select('id')
            .eq('booth_id', selectedBoothId)
            .eq('judge_name', judgeName)
            .single();

        if (existingScore) {
            Loader.hide();
            notyf.error("You have already scored this booth!");
            return;
        }
        
        console.log('Inserting judge score:', {
            booth_id: selectedBoothId,
            judge_name: judgeName,
            ilo_1: section1Total,
            ilo_2: section2Total
        });
        
        const { error, data } = await window.supabase
            .from('judge_scores')
            .insert([{ 
                booth_id: selectedBoothId, 
                judge_name: judgeName, 
                ilo_1: section1Total, 
                ilo_2: section2Total 
            }]);

        console.log('Insert result:', { error, data });
        
        if (error) {
            Loader.hide();
            notyf.error("Database Error: " + error.message);
            console.error('Database error details:', error);
            return;
        }
        
        await syncBoothAverage(selectedBoothId);
        notyf.success(`Recorded!`);
        loadBooths();
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