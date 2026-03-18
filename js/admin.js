let notyf;

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof Loader !== 'undefined') Loader.init();
    
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
            adminStatus.innerText = `SESSION ACTIVE: ${user.email}`;
            showPanel();
        }
    }

    function showPanel() {
        loginSection.classList.add("hidden");
        adminPanel.classList.remove("hidden");
        loadBooths();
        loadAnalytics();
    }

    checkUser();

    document.getElementById("loginBtn").addEventListener("click", async () => {
        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPass").value;
        if (!email || !password) return notyf.error("Credentials required");
        
        if (typeof Loader !== 'undefined') Loader.show();
        const { error } = await window.supabase.auth.signInWithPassword({ email, password });
        if (typeof Loader !== 'undefined') Loader.hide();
        
        if (error) notyf.error("Auth Error: " + error.message);
        else {
            notyf.success("Access Granted");
            setTimeout(() => location.reload(), 1000);
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", async () => {
        const result = await Swal.fire({
            title: "Sign Out",
            text: "Terminate session?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#2563eb",
            confirmButtonText: "Terminate",
            background: "#020617",
            color: "#ffffff",
        });
        if (result.isConfirmed) {
            if (typeof Loader !== 'undefined') Loader.show();
            await window.supabase.auth.signOut();
            if (typeof Loader !== 'undefined') Loader.hide();
            location.reload();
        }
    });

    document.getElementById("addBoothBtn").addEventListener("click", async () => {
        const nameEl = document.getElementById("newBoothName");
        const projectEl = document.getElementById("newProjectName");
        const clusterEl = document.getElementById("newCluster");

        const name = nameEl.value.trim();
        const project = projectEl.value.trim();
        const cluster = clusterEl.value;

        if (!name || !project) return notyf.error("Section and Project name required");
        
        if (typeof Loader !== 'undefined') Loader.show();
        const { error } = await window.supabase.from("booths").insert([{ 
            section_name: name, 
            project_name: project, 
            cluster: cluster 
        }]);
        if (typeof Loader !== 'undefined') Loader.hide();
        
        if (error) notyf.error("Database Error: " + error.message);
        else {
            notyf.success(`Entry ${name} registered`);
            nameEl.value = "";
            projectEl.value = "";
            loadBooths();
        }
    });

    document.getElementById("uploadBlacklistBtn").addEventListener("click", async () => {
        const inputArea = document.getElementById("blacklistInput");
        const input = inputArea.value.trim();
        if (!input) return notyf.error("No identifiers provided");

        const codes = input.split(/[\n,]+/).map(c => c.trim()).filter(c => c.length > 0);
        const records = codes.map(c => ({ sr_code: c }));

        if (typeof Loader !== 'undefined') Loader.show();
        const { error } = await window.supabase.from("blacklist_sr").upsert(records, { onConflict: 'sr_code' });
        if (typeof Loader !== 'undefined') Loader.hide();

        if (error) notyf.error("Blacklist sync failed: " + error.message);
        else {
            notyf.success(`${records.length} identifiers synchronized`);
            inputArea.value = "";
        }
    });
});

window.switchTab = (tabName) => {
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("text-blue-500", "border-b-2", "border-blue-500", "active");
        btn.classList.add("text-slate-500");
    });

    const targetContent = document.getElementById(`content-${tabName}`);
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.remove("hidden");
    if (targetTab) targetTab.classList.add("text-blue-500", "border-b-2", "border-blue-500", "active");

    if (tabName === "merit") loadMeritEntry();
    if (tabName === "judges" || tabName === "manage") { loadBooths(); loadJudgesList(); }
    if (tabName === "analytics") loadAnalytics();
    if (tabName === "tabulate") loadTabulation();
};

async function loadBooths() {
    const { data } = await window.supabase.from("booths").select("*").order("cluster").order("section_name");
    const list = document.getElementById("boothList");
    if (data && list) {
        list.innerHTML = data.map((b) => `
            <li class="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800">
                <div>
                    <span class="text-[9px] bg-blue-600 px-2 py-0.5 rounded-full font-black mr-2">CLUSTER ${b.cluster}</span>
                    <span class="font-bold text-white text-sm">${b.section_name}</span>
                    <p class="text-[10px] text-slate-500 mt-1 uppercase">${b.project_name || 'No Title'}</p>
                </div>
                <button onclick="deleteBooth('${b.id}', '${b.section_name}')" class="text-[10px] text-red-500 font-black uppercase hover:underline">Remove</button>
            </li>`).join("");
    }
}

window.deleteBooth = async (id, name) => {
    const result = await Swal.fire({
        title: "Confirm Deletion",
        text: `Permanent removal of ${name}?`,
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        background: "#020617",
        color: "#ffffff",
    });
    if (result.isConfirmed) {
        if (typeof Loader !== 'undefined') Loader.show();
        await window.supabase.from("booths").delete().eq("id", id);
        if (typeof Loader !== 'undefined') Loader.hide();
        loadBooths();
    }
};

async function loadAnalytics() {
    const { data: votes } = await window.supabase.from("votes").select("*").order("created_at", { ascending: false });
    if (!votes) return;
    
    document.getElementById("totalVotesStat").innerText = votes.length;
    
    const clusterCounts = { A: {}, B: {} };
    votes.forEach(v => {
        if (v.cluster && v.booth_id) {
            clusterCounts[v.cluster][v.booth_id] = (clusterCounts[v.cluster][v.booth_id] || 0) + 1;
        }
    });

    const findLeader = (counts) => {
        const entries = Object.entries(counts);
        if (entries.length === 0) return null;
        return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    };

    const { data: boothRef } = await window.supabase.from("booths").select("id, section_name");
    const boothMap = {};
    if (boothRef) boothRef.forEach(b => boothMap[b.id] = b.section_name);

    const leaderA = findLeader(clusterCounts.A);
    const leaderB = findLeader(clusterCounts.B);

    document.getElementById("leadingAStat").innerText = leaderA ? (boothMap[leaderA] || "N/A") : "--";
    document.getElementById("leadingBStat").innerText = leaderB ? (boothMap[leaderB] || "N/A") : "--";
    
    const tbody = document.getElementById("auditLogBody");
    if (tbody) {
        tbody.innerHTML = votes.slice(0, 100).map((vote) => `
            <tr class="border-b border-slate-900 hover:bg-slate-900/50 transition">
                <td class="p-5 font-mono text-blue-500">${vote.sr_code}</td>
                <td class="p-5 text-slate-400">${boothMap[vote.booth_id] || 'N/A'}</td>
                <td class="p-5 font-bold text-[10px]">${vote.cluster} | ${vote.category}</td>
                <td class="p-5 text-slate-600">${vote.ip_address || '0.0.0.0'}</td>
                <td class="p-5 text-right text-slate-500 text-[10px]">${new Date(vote.created_at).toLocaleTimeString()}</td>
            </tr>`).join("");
    }
}

async function loadTabulation() {
    if (typeof Loader !== 'undefined') Loader.show();
    const { data: booths } = await window.supabase.from("booths").select("*");
    const { data: votes } = await window.supabase.from("votes").select("booth_id, cluster");
    
    const voteCounts = { A: {}, B: {} };
    if (votes) {
        votes.forEach(v => {
            if (v.cluster) voteCounts[v.cluster][v.booth_id] = (voteCounts[v.cluster][v.booth_id] || 0) + 1;
        });
    }

    const maxVotes = {
        A: Math.max(...Object.values(voteCounts.A), 0),
        B: Math.max(...Object.values(voteCounts.B), 0)
    };
    
    const calculatedData = (booths || []).map(b => {
        const rawJudgeScore = parseFloat(b.judge_final_score) || 0;
        const finalJudgePoints = rawJudgeScore * 0.4;
        const currentVotes = voteCounts[b.cluster][b.id] || 0;
        const digitalPoints = maxVotes[b.cluster] > 0 ? (currentVotes / maxVotes[b.cluster]) * 50 : 0;
        const meritPoints = Math.min(b.sticker_count || 0, 10);
        const grandTotal = parseFloat((finalJudgePoints + digitalPoints + meritPoints).toFixed(2));

        return { ...b, finalJudgePoints, digitalPoints, meritPoints, grandTotal };
    });

    calculatedData.sort((a, b) => b.grandTotal - a.grandTotal);

    const tbody = document.getElementById("tabulationBody");
    if (tbody) {
        tbody.innerHTML = calculatedData.map((b) => `
            <tr class="hover:bg-slate-900/40 transition border-b border-slate-900">
                <td class="p-6 font-bold text-white uppercase">${b.section_name}</td>
                <td class="p-6 text-[10px] font-black uppercase text-slate-500">CLUSTER ${b.cluster}</td>
                <td class="p-6 text-center text-blue-500 font-mono">${b.finalJudgePoints.toFixed(2)}</td>
                <td class="p-6 text-center text-yellow-500 font-mono">${b.meritPoints.toFixed(1)}</td>
                <td class="p-6 text-center text-blue-400 font-mono">${b.digitalPoints.toFixed(2)}</td>
                <td class="p-6 text-center bg-blue-600/5 font-black text-lg">${b.grandTotal.toFixed(2)}%</td>
            </tr>`).join("");
    }
    if (typeof Loader !== 'undefined') Loader.hide();
}

async function loadMeritEntry() {
    const { data: booths } = await window.supabase.from("booths").select("*").order("cluster").order("section_name");
    const meritGrid = document.getElementById("meritGrid");
    if (booths && meritGrid) {
        meritGrid.innerHTML = booths.map((b) => {
            const currentStars = b.sticker_count || 0;
            let starsHTML = "";
            for (let i = 1; i <= 10; i++) {
                starsHTML += `<span onclick="setStars('${b.id}', ${i})" class="cursor-pointer text-xl transition hover:scale-125 star-item-${b.id}" data-value="${i}">${i <= currentStars ? "⭐" : "☆"}</span>`;
            }
            return `
                <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest flex justify-between">
                        ${b.section_name} <span id="count-${b.id}" class="text-yellow-500">${currentStars}/10</span>
                    </p>
                    <div class="flex justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">${starsHTML}</div>
                    <input type="hidden" id="input-${b.id}" class="merit-input" data-id="${b.id}" value="${currentStars}">
                </div>`;
        }).join("");
    }
}

window.setStars = (boothId, value) => {
    const input = document.getElementById(`input-${boothId}`);
    const countDisplay = document.getElementById(`count-${boothId}`);
    const starSpans = document.querySelectorAll(`.star-item-${boothId}`);
    input.value = value;
    countDisplay.innerText = `${value}/10`;
    starSpans.forEach((span, index) => { span.innerText = index < value ? "⭐" : "☆"; });
};

window.saveMeritScores = async () => {
    const inputs = document.querySelectorAll(".merit-input");
    if (typeof Loader !== 'undefined') Loader.show();
    const updates = Array.from(inputs).map((input) => 
        window.supabase.from("booths").update({ sticker_count: parseInt(input.value) || 0 }).eq("id", input.getAttribute("data-id"))
    );
    await Promise.all(updates);
    if (typeof Loader !== 'undefined') Loader.hide();
    notyf.success("Sticker totals synchronized");
    loadMeritEntry();
};

async function loadJudgesList() {
    const { data } = await window.supabase.from("judges").select("*").order("name");
    const list = document.getElementById("judgeList");
    if (data && list) {
        list.innerHTML = data.map(j => `
            <li class="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800">
                <div>
                    <p class="font-black text-blue-500 text-xs uppercase tracking-tight">${j.name}</p>
                    <p class="text-[9px] text-slate-600 font-mono mt-1">ACCESS KEY: ${j.access_code}</p>
                </div>
                <button onclick="deleteJudge('${j.id}')" class="text-[10px] text-red-500 font-black hover:underline uppercase">Revoke</button>
            </li>`).join("");
    }
}

async function addJudge() {
    const nameEl = document.getElementById("newJudgeName");
    const codeEl = document.getElementById("newJudgeCode");
    const name = nameEl.value.trim();
    const code = codeEl.value.trim();
    
    if (!name || !code) return notyf.error("Judge name and code required");
    
    if (typeof Loader !== 'undefined') Loader.show();
    const { error } = await window.supabase.from("judges").insert([{ name, access_code: code }]);
    if (typeof Loader !== 'undefined') Loader.hide();
    
    if (error) notyf.error("Error: " + error.message);
    else {
        notyf.success("Judge added");
        nameEl.value = "";
        codeEl.value = "";
        loadJudgesList();
    }
}

window.deleteJudge = async (id) => {
    if (typeof Loader !== 'undefined') Loader.show();
    await window.supabase.from("judges").delete().eq("id", id);
    if (typeof Loader !== 'undefined') Loader.hide();
    loadJudgesList();
};