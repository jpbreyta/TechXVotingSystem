// js/vote.js
document.addEventListener('DOMContentLoaded', async () => {
    const boothSelect = document.getElementById('boothSelect');
    const voteForm = document.getElementById('voteForm');
    const statusMsg = document.getElementById('statusMsg');

    // 1. Load Booths dynamically
    const { data: booths, error } = await window.supabase.from('booths').select('*').order('section_name');
    if (booths) {
        boothSelect.innerHTML = '<option value="" disabled selected>Select Section</option>' +
            booths.map(b => `<option value="${b.id}">${b.section_name}</option>`).join('');
    }

    // 2. Voting Logic
    voteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const srCode = document.getElementById('srCode').value.trim();
        const boothId = boothSelect.value;
        const submitBtn = document.getElementById('submitBtn');

        submitBtn.disabled = true;
        submitBtn.innerText = "Checking...";

        // Step A: Check if Blacklisted (2nd Year)
        const { data: isBlacklisted } = await window.supabase
            .from('blacklist_sr')
            .select('sr_code')
            .eq('sr_code', srCode)
            .single();

        if (isBlacklisted) {
            showStatus("❌ Access Denied: 2nd Year students are not allowed to vote digitally.", "text-red-500");
            submitBtn.disabled = false;
            submitBtn.innerText = "Cast Vote";
            return;
        }

        // Step B: Get IP (Optional but good for tracking)
        let ip = "unknown";
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            ip = data.ip;
        } catch (e) { console.log("IP fetch failed"); }

        // Step C: Submit Vote
        const { error: voteError } = await window.supabase
            .from('votes')
            .insert([{ sr_code: srCode, booth_id: boothId, ip_address: ip }]);

        if (voteError) {
            if (voteError.code === '23505') {
                showStatus("❌ This SR-Code has already voted.", "text-yellow-500");
            } else {
                showStatus("❌ Error casting vote. Please try again.", "text-red-500");
            }
        } else {
            showStatus("✅ Vote casted successfully! Redirecting...", "text-green-500");
            setTimeout(() => window.location.href = 'scores.html', 2000);
        }

        submitBtn.disabled = false;
        submitBtn.innerText = "Cast Vote";
    });

    function showStatus(msg, colorClass) {
        statusMsg.innerText = msg;
        statusMsg.className = `mt-6 text-center text-sm ${colorClass}`;
        statusMsg.classList.remove('hidden');
    }
});