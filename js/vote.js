document.addEventListener('DOMContentLoaded', async () => {
    const notyf = new Notyf({
        duration: 4000,
        position: { x: 'right', y: 'top' },
        dismissible: true
    });

    const boothSelect = document.getElementById('boothSelect');
    const voteForm = document.getElementById('voteForm');

    const { data: booths } = await window.supabase.from('booths').select('*').order('section_name');
    if (booths) {
        boothSelect.innerHTML = '<option value="" disabled selected>Select Section</option>' +
            booths.map(b => `<option value="${b.id}">${b.section_name}</option>`).join('');
    }

    voteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const srCode = document.getElementById('srCode').value.trim();
        const boothId = boothSelect.value;
        const submitBtn = document.getElementById('submitBtn');

        const srPattern = /^\d{2}-\d{5}$/;

        if (!srPattern.test(srCode)) {
            notyf.error('Invalid Format: Please use the correct SR-Code pattern (XX-XXXXX)');
            return;
        }

        if(!boothId) {
            notyf.error('Selection Error: Please select a valid section');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Verifying...";

        if (srCode.startsWith('24-')) {
            notyf.error('Access Denied: Second year students are restricted from digital voting');
            submitBtn.disabled = false;
            submitBtn.innerText = "Cast Vote";
            return;
        }

        const { data: isBlacklisted } = await window.supabase
            .from('blacklist_sr')
            .select('sr_code')
            .eq('sr_code', srCode)
            .single();

        if (isBlacklisted) {
            notyf.error('Access Denied: This SR-Code is in the restricted list');
            submitBtn.disabled = false;
            submitBtn.innerText = "Cast Vote";
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
                notyf.error('Validation Error: This SR-Code has already been used');
            } else {
                notyf.error('System Error: Unable to process transaction');
            }
        } else {
            notyf.success('Success: Your vote has been recorded');
            setTimeout(() => window.location.href = 'scores.html', 2000);
        }

        submitBtn.disabled = false;
        submitBtn.innerText = "Cast Vote";
    });
});