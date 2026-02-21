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
    const {
      data: { user },
    } = await window.supabase.auth.getUser();
    if (user) {
      adminStatus.innerText = `Authenticated: ${user.email}`;
      showPanel();
    }
  }
  checkUser();

  document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPass").value;

    if (!email || !password) {
      notyf.error("Input Error: Credentials required");
      return;
    }

    const { error } = await window.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      notyf.error("Authentication Failed: " + error.message);
    } else {
      notyf.success("Access Granted: Welcome Admin");
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
      notyf.error("Input Error: Section name required");
      return;
    }
    const { error } = await window.supabase
      .from("booths")
      .insert([{ section_name: name }]);
    if (error) notyf.error("Database Error: Entry might exist");
    else {
      notyf.success(`Success: Section ${name} registered`);
      document.getElementById("newBoothName").value = "";
      loadBooths();
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    const result = await Swal.fire({
      title: "Sign Out",
      text: "Terminate admin session?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#1e293b",
      confirmButtonText: "Terminate",
      background: "#0f172a",
      color: "#ffffff",
    });

    if (result.isConfirmed) {
      await window.supabase.auth.signOut();
      notyf.success("Session closed.");
      setTimeout(() => location.reload(), 1000);
    }
  });
});

window.switchTab = (tabName) => {
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("text-blue-500", "border-b-2", "border-blue-500");
    btn.classList.add("text-slate-400");
  });

  const targetContent = document.getElementById(`content-${tabName}`);
  const targetTab = document.getElementById(`tab-${tabName}`);

  if (targetContent) targetContent.classList.remove("hidden");
  if (targetTab)
    targetTab.classList.add("text-blue-500", "border-b-2", "border-blue-500");

  if (tabName === "analytics") loadAnalytics();
  if (tabName === "tabulate") loadTabulation();
};

async function loadBooths() {
  const { data } = await window.supabase
    .from("booths")
    .select("*")
    .order("section_name");
  const list = document.getElementById("boothList");
  if (data) {
    list.innerHTML = data
      .map(
        (b) => `
      <li class="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50 hover:border-slate-600 transition">
        <span class="font-bold text-blue-400">${b.section_name}</span>
        <button onclick="deleteBooth('${b.id}', '${b.section_name}')" class="text-xs text-red-500 font-bold uppercase hover:underline">Remove</button>
      </li>
    `,
      )
      .join("");
  }
}

window.deleteBooth = async (id, name) => {
  const result = await Swal.fire({
    title: "Confirm Deletion",
    text: `Delete ${name}?`,
    icon: "error",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    background: "#0f172a",
    color: "#ffffff",
  });

  if (result.isConfirmed) {
    const { error } = await window.supabase
      .from("booths")
      .delete()
      .eq("id", id);
    if (error) notyf.error("Error deleting entry");
    else {
      notyf.success("Entry removed");
      loadBooths();
    }
  }
};

async function loadAnalytics() {
  const { data: votes, error } = await window.supabase
    .from("votes")
    .select(`sr_code, created_at, ip_address, booths ( section_name )`)
    .order("created_at", { ascending: false });

  if (error) return;

  document.getElementById("totalVotesStat").innerText = votes.length;
  document.getElementById("auditEntriesStat").innerText = votes.length;

  if (votes.length > 0) {
    const counts = {};
    votes.forEach((v) => {
      const name = v.booths?.section_name || "N/A";
      counts[name] = (counts[name] || 0) + 1;
    });
    const leader = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b,
    );
    document.getElementById("leadingSectionStat").innerText = leader;
  }

  const tbody = document.getElementById("auditLogBody");
  tbody.innerHTML = votes
    .map(
      (vote) => `
    <tr class="border-b border-slate-800 hover:bg-slate-800/30 transition">
        <td class="p-4 font-mono text-blue-400">${vote.sr_code}</td>
        <td class="p-4 text-slate-300">${vote.booths?.section_name || "Removed"}</td>
        <td class="p-4 text-slate-500 text-xs">${new Date(vote.created_at).toLocaleString()}</td>
        <td class="p-4 text-xs font-mono text-slate-600">${vote.ip_address}</td>
    </tr>
  `,
    )
    .join("");
}

async function loadTabulation() {
  const { data: booths } = await window.supabase
    .from("booths")
    .select("*")
    .order("section_name");
  const { data: votes } = await window.supabase
    .from("votes")
    .select("booth_id");

  // 1. Digital Voting Logic (50% Weight - Normalized)
  const voteCounts = {};
  votes.forEach(
    (v) => (voteCounts[v.booth_id] = (voteCounts[v.booth_id] || 0) + 1),
  );

  // Hanapin ang benchmark (Highest unique votes)
  const highestVotes = Math.max(...Object.values(voteCounts), 0);

  const tbody = document.getElementById("tabulationBody");
  if (!tbody) return;

  tbody.innerHTML = booths
    .map((b) => {
      // --- PILLAR 1: JUDGES (40% Weight) ---
      // Ang input sa UI ay dapat 0-100. I-multiply sa 0.40 para makuha ang points.
      const rawJudgeScore = parseFloat(b.judge_score) || 0;
      const finalJudgePoints = rawJudgeScore * 0.4;

      // --- PILLAR 2: DIGITAL (50% Weight - Normalized) ---
      const currentVotes = voteCounts[b.id] || 0;
      const digitalPoints =
        highestVotes > 0 ? (currentVotes / highestVotes) * 50 : 0;

      // --- PILLAR 3: STARS/MERIT (10% Bonus Weight) ---
      // 1 star = 1 point, capped at 10.
      const stickerCount = b.sticker_count || 0;
      const meritPoints = Math.min(stickerCount, 10);

      // --- FINAL CALCULATION ---
      const grandTotal = (
        finalJudgePoints +
        digitalPoints +
        meritPoints
      ).toFixed(2);

      return `
      <tr class="hover:bg-slate-800/30 transition border-b border-slate-800/50">
          <td class="p-4">
            <p class="font-bold text-white uppercase text-xs">${b.section_name}</p>
            <p class="text-[10px] text-slate-500 font-mono">Votes: ${currentVotes} | Stars: ${stickerCount}</p>
          </td>
          <td class="p-4 text-center">
              <input type="number" step="0.1" max="100" placeholder="0-100" value="${rawJudgeScore}" 
                  class="judge-input w-20 bg-slate-950 border border-slate-700 rounded p-1 text-center text-blue-400 font-mono focus:border-blue-500 outline-none" 
                  data-id="${b.id}">
              <p class="text-[9px] text-slate-500 mt-1">Weight: ${finalJudgePoints.toFixed(2)} pts</p>
          </td>
          <td class="p-4 text-center">
            <span class="text-blue-500 font-black text-sm">${digitalPoints.toFixed(2)}</span>
            <p class="text-[9px] text-slate-500 uppercase">Normalized 50%</p>
          </td>
          <td class="p-4 text-center">
            <span class="text-yellow-500 font-black text-sm">${meritPoints.toFixed(1)}</span>
            <p class="text-[9px] text-slate-500 uppercase">Capped 10pts</p>
          </td>
          <td class="p-4 text-center bg-blue-600/5">
              <p class="text-2xl font-black text-white tracking-tighter">${grandTotal}%</p>
              <p class="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Final Grade</p>
          </td>
      </tr>
    `;
    })
    .join("");
}

window.saveJudgeScores = async () => {
  const inputs = document.querySelectorAll(".judge-input");
  const updates = Array.from(inputs).map((input) => ({
    id: input.getAttribute("data-id"),
    judge_score: parseFloat(input.value) || 0,
  }));

  for (const update of updates) {
    await window.supabase
      .from("booths")
      .update({ judge_score: update.judge_score })
      .eq("id", update.id);
  }

  notyf.success("System Update: Scores synchronized");
  loadTabulation();
};
