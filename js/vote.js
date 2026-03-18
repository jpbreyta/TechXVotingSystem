document.addEventListener('DOMContentLoaded', async () => {
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

      notyf.success('Votes cast successfully');
      setTimeout(() => window.location.href = 'scores.html', 2000);

    } catch (err) {
      notyf.error('System Error: Transaction failed');
      submitBtn.disabled = false;
      submitBtn.innerText = "Cast Official Votes";
    }
  });

  loadBooths();
});