document.addEventListener('DOMContentLoaded', async () => {
    const notyf = new Notyf({
        duration: 4000,
        position: { x: 'right', y: 'top' },
        dismissible: true
    });

    const boothContainer = document.getElementById('boothSelect');
    const boothHiddenInput = document.getElementById('boothValue');
    const voteForm = document.getElementById('voteForm');
    const submitBtn = document.getElementById('submitBtn');
    const pickerStatus = document.getElementById('pickerStatus');

    const { data: booths, error } = await window.supabase.from('booths').select('*').order('section_name');
    
    if (booths && booths.length > 0) {
        boothContainer.innerHTML = booths.map(b => `
            <div class="booth-option p-4 rounded-xl bg-slate-700/40 border border-slate-600 cursor-pointer hover:border-slate-400 transition-all duration-200 text-center flex items-center justify-center min-h-[80px]" 
                 data-id="${b.id}">
                <span class="text-[11px] font-black uppercase tracking-tight leading-tight">${b.section_name}</span>
            </div>
        `).join('');

        const options = document.querySelectorAll('.booth-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected', 'border-blue-500', 'bg-blue-500/10'));
                opt.classList.add('selected', 'border-blue-500', 'bg-blue-500/10');
                boothHiddenInput.value = opt.dataset.id;
            });
        });
    } else {
        boothContainer.innerHTML = `
            <div class="col-span-2 py-10 text-center border-2 border-dashed border-slate-700 rounded-2xl">
                <p class="text-red-500 text-xs font-black uppercase tracking-widest mb-2">Voting Unavailable</p>
                <p class="text-slate-500 text-[10px]">No active booths were found in the database.</p>
            </div>
        `;
        pickerStatus.innerText = "System currently inactive";
        submitBtn.disabled = true;
        submitBtn.innerText = "Voting is Closed";
        submitBtn.classList.replace('bg-blue-600', 'bg-slate-700');
    }

    voteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const srCode = document.getElementById('srCode').value.trim();
        const boothId = boothHiddenInput.value;

        const srPattern = /^\d{2}-\d{5}$/;

        if (!srPattern.test(srCode)) {
            notyf.error('Invalid Format: Please use the correct SR-Code pattern (XX-XXXXX)');
            return;
        }

        if(!boothId) {
            notyf.error('Selection Error: Please select a booth from the right panel');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Verifying...";

        if (srCode.startsWith('24-')) {
            notyf.error('Access Denied: Second year students are restricted');
            submitBtn.disabled = false;
            submitBtn.innerText = "Cast Official Vote";
            return;
        }

        const { data: isBlacklisted } = await window.supabase
            .from('blacklist_sr')
            .select('sr_code')
            .eq('sr_code', srCode)
            .single();

        if (isBlacklisted) {
            notyf.error('Access Denied: This SR-Code is restricted');
            submitBtn.disabled = false;
            submitBtn.innerText = "Cast Official Vote";
            return;
        }

        let ip = "unknown";
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            ip = data.ip;
        } catch (err) {}

        const { error: voteError } = await window.supabase
            .from('votes')
            .insert([{ sr_code: srCode, booth_id: boothId, ip_address: ip }]);

        if (voteError) {
            if (voteError.code === '23505') {
                notyf.error('Validation Error: Already voted');
            } else {
                notyf.error('System Error: Unable to process');
            }
        } else {
            notyf.success('Success: Vote recorded');
            setTimeout(() => window.location.href = 'scores.html', 2000);
        }

        submitBtn.disabled = false;
        submitBtn.innerText = "Cast Official Vote";
    });
});