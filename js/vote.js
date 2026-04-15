document.addEventListener('DOMContentLoaded', async () => {
  // Check if already voted on this device
  if (sessionStorage.getItem('has_voted')) {
    document.body.innerHTML = `
      <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div class="text-center">
          <svg class="w-20 h-20 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 class="text-3xl font-black text-white uppercase tracking-tight mb-2">Vote Already Cast</h1>
          <p class="text-slate-400 mb-6">You have already voted on this device.</p>
          <p class="text-slate-600 text-sm">Please proceed to your designated area.</p>
        </div>
      </div>
    `;
    return;
  }

  const notyf = new Notyf({
    duration: 4000,
    position: { x: 'right', y: 'top' },
    dismissible: true
  });

  const voteForm = document.getElementById('voteForm');
  const submitBtn = document.getElementById('submitBtn');
  const clusterAContainer = document.getElementById('clusterA');
  const clusterBContainer = document.getElementById('clusterB');

  window.state = {
    A: [],
    B: []
  };

  window.showHelp = () => {
    Swal.fire({
      title: '<span class="text-blue-500 font-black uppercase">How to Vote</span>',
      html: `
        <div class="text-left text-sm space-y-4 text-slate-300">
          <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p class="font-black text-white mb-2">1. Enter Your SR-Code</p>
            <p class="text-slate-400">Enter your student identifier in the format: <span class="text-blue-400 font-mono">YY-XXXXX</span> (e.g., 23-12345)</p>
          </div>
          <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p class="font-black text-white mb-2">2. Vote for Each Cluster</p>
            <p class="text-slate-400">You must select exactly <span class="text-yellow-400 font-black">5 projects</span> per cluster:</p>
            <ul class="mt-2 ml-4 text-slate-400 list-disc">
              <li><span class="text-blue-400">2 Presentation</span> projects (filled slots 1-2)</li>
              <li><span class="text-blue-400">3 Pitching</span> projects (filled slots 3-5)</li>
            </ul>
          </div>
          <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p class="font-black text-white mb-2">3. Submit Your Votes</p>
            <p class="text-slate-400">Click "Cast Official Votes" to submit. Each student can only vote once!</p>
          </div>
          <div class="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30">
            <p class="text-yellow-400 font-bold text-center">One Vote Per Student • Choose Wisely</p>
          </div>
        </div>
      `,
      background: '#0f172a',
      color: '#ffffff',
      confirmButtonText: 'Got it!',
      confirmButtonColor: '#2563eb'
    });
  };

  // Show help on page load
  window.showHelp();

  const loadBooths = async () => {
    const { data: booths, error } = await window.supabase
      .from('booths')
      .select('*')
      .order('section_name', { ascending: true });

    if (error) {
      notyf.error('Error loading booths');
      return;
    }

    renderBooths(booths.filter(b => b.cluster === 'A'), clusterAContainer, 'A');
    renderBooths(booths.filter(b => b.cluster === 'B'), clusterBContainer, 'B');
  };

  const renderBooths = (booths, container, cluster) => {
    if (!container) return;
    container.innerHTML = booths.map(b => `
      <div class="booth-card p-4 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer hover:border-blue-500 transition-all" 
           data-id="${b.id}" data-cluster="${cluster}">
        <p class="text-[10px] text-slate-500 uppercase font-bold mb-1">${b.project_name || 'No Project Name'}</p>
        <h3 class="text-sm font-black uppercase tracking-tight">${b.section_name}</h3>
      </div>
    `).join('');

    container.querySelectorAll('.booth-card').forEach(card => {
      card.addEventListener('click', () => toggleSelection(card, cluster));
    });
  };

  const toggleSelection = (card, cluster) => {
    const boothId = card.dataset.id;
    const index = window.state[cluster].findIndex(v => v.booth_id === boothId);

    if (index > -1) {
      window.state[cluster].splice(index, 1);
      card.classList.remove('selected');
    } else {
      if (window.state[cluster].length >= 5) {
        notyf.error(`Maximum 5 votes for Cluster ${cluster}`);
        return;
      }
      window.state[cluster].push({
        booth_id: boothId,
        type: window.state[cluster].length < 2 ? 'presentation' : 'pitching'
      });
      card.classList.add('selected');
    }
    updateSlotUI(cluster);
    window.dispatchEvent(new Event('voteUpdated'));
  };

  const updateSlotUI = (cluster) => {
    const slots = document.querySelectorAll(`[data-cluster="${cluster}"] .vote-slot`);
    slots.forEach((slot, i) => {
      if (i < window.state[cluster].length) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });
  };

  voteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const srCode = document.getElementById('srCode').value.trim();

    submitBtn.disabled = true;
    submitBtn.innerText = "Authenticating...";

    try {
      const { data: auth, error: authErr } = await window.supabase
        .rpc('validate_voter', { p_sr_code: srCode });

      if (authErr || !auth.valid) {
        notyf.error(auth ? auth.message : 'Verification failed');
        submitBtn.disabled = false;
        submitBtn.innerText = "Cast Official Votes";
        return;
      }

      let ip = "0.0.0.0";
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip;
      } catch (e) {}

      const votesToInsert = [];
      ['A', 'B'].forEach(cluster => {
        window.state[cluster].forEach(v => {
          votesToInsert.push({
            sr_code: srCode,
            booth_id: v.booth_id,
            cluster: cluster,
            category: v.type,
            ip_address: ip
          });
        });
      });

      const { error: voteError } = await window.supabase
        .from('votes')
        .insert(votesToInsert);

      if (voteError) throw voteError;

      // Mark as voted on this device
      sessionStorage.setItem('has_voted', 'true');
      
      notyf.success('Votes cast successfully!');
      
      // Show voted confirmation
      document.body.innerHTML = `
        <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div class="text-center">
            <svg class="w-20 h-20 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 class="text-3xl font-black text-white uppercase tracking-tight mb-2">Vote Submitted!</h1>
            <p class="text-slate-400 mb-6">Your votes have been recorded successfully.</p>
            <p class="text-slate-600 text-sm">Thank you for participating in Tech X 2026!</p>
          </div>
        </div>
      `;

    } catch (err) {
      notyf.error('System Error: Transaction failed');
      submitBtn.disabled = false;
      submitBtn.innerText = "Cast Official Votes";
    }
  });

  loadBooths();
});