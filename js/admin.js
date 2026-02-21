let notyf;

document.addEventListener("DOMContentLoaded", async () => {
  notyf = new Notyf({
    duration: 3000,
    position: { x: "right", y: "top" },
    dismissible: true,
  });

  const loginSection = document.getElementById("loginSection");
  const adminPanel = document.getElementById("adminPanel");
  const adminStatus = document.getElementById("adminStatus");

  async function checkUser() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
      adminStatus.innerText = `Logged in as: ${user.email}`;
      showPanel();
    }
  }
  checkUser();

  document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPass").value;

    if (!email || !password) {
      notyf.error("Error: Please enter both email and password");
      return;
    }

    const { error } = await window.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      notyf.error("Login Failed: " + error.message);
    } else {
      notyf.success("Welcome back, Admin!");
      setTimeout(() => location.reload(), 1000);
    }
  });

  function showPanel() {
    loginSection.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    loadBooths();
    loadAnalytics();
  }

  document.getElementById("addBoothBtn").addEventListener("click", async () => {
    const name = document.getElementById("newBoothName").value.trim();
    if (!name) {
      notyf.error("Error: Section name is required");
      return;
    }
    const { error } = await window.supabase.from("booths").insert([{ section_name: name }]);
    if (error) notyf.error("Error: This record might already exist");
    else {
      notyf.success(`Section ${name} added successfully`);
      document.getElementById("newBoothName").value = "";
      loadBooths();
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    const result = await Swal.fire({
      title: "Sign Out",
      text: "Are you sure you want to end your admin session?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#1e293b",
      confirmButtonText: "Yes, Logout",
      background: "#0f172a",
      color: "#ffffff"
    });

    if (result.isConfirmed) {
      await window.supabase.auth.signOut();
      notyf.success("Session closed.");
      setTimeout(() => location.reload(), 1000);
    }
  });
});

window.switchTab = (tabName) => {
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('text-blue-500', 'border-b-2', 'border-blue-500');
    btn.classList.add('text-slate-400');
  });
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  document.getElementById(`tab-${tabName}`).classList.add('text-blue-500', 'border-b-2', 'border-blue-500');

  if(tabName === 'analytics') loadAnalytics(); 
};

async function loadBooths() {
  const { data } = await window.supabase.from("booths").select("*").order("section_name");
  const list = document.getElementById("boothList");
  if (data) {
    list.innerHTML = data.map(b => `
      <li class="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50 hover:border-slate-600">
        <span class="font-bold text-blue-400">${b.section_name}</span>
        <button onclick="deleteBooth('${b.id}', '${b.section_name}')" class="text-xs text-red-500 font-bold uppercase">Delete</button>
      </li>
    `).join("");
  }
}

window.deleteBooth = async (id, name) => {
  if (confirm(`Are you sure you want to delete ${name}?`)) {
    const { error } = await window.supabase.from("booths").delete().eq("id", id);
    if (error) notyf.error("Error deleting booth");
    else {
      notyf.success("Booth deleted successfully");
      loadBooths();
    }
  }
};

async function loadAnalytics() {
    const { data: votes, error } = await window.supabase
        .from('votes')
        .select(`
            sr_code,
            created_at,
            ip_address,
            booths ( section_name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById('totalVotesStat').innerText = votes.length;
    document.getElementById('auditEntriesStat').innerText = votes.length;

    if (votes.length > 0) {
        const counts = {};
        votes.forEach(v => {
            const name = v.booths?.section_name || 'N/A';
            counts[name] = (counts[name] || 0) + 1;
        });
        const leader = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        document.getElementById('leadingSectionStat').innerText = leader;
    }

    const tbody = document.getElementById('auditLogBody');
    tbody.innerHTML = votes.map(vote => `
        <tr class="border-b border-slate-800 hover:bg-slate-800/30 transition">
            <td class="p-4 font-mono text-blue-400">${vote.sr_code}</td>
            <td class="p-4 text-slate-300">${vote.booths?.section_name || 'Deleted Booth'}</td>
            <td class="p-4 text-slate-500 text-xs">${new Date(vote.created_at).toLocaleString()}</td>
            <td class="p-4 text-xs font-mono text-slate-600">${vote.ip_address}</td>
        </tr>
    `).join('');
}