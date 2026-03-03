const Loader = {
    init() {
        if (document.getElementById('global-loader')) return;
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .animate-spin-slow { animation: spin-slow 2s linear infinite; }
        `;
        document.head.appendChild(style);
        const loaderHtml = `
            <div id="global-loader" class="hidden fixed inset-0 z-[9999] items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
                <div class="flex flex-col items-center">
                    <div class="relative w-16 h-16">
                        <div class="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <div class="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                    <p class="mt-4 text-blue-500 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Please Wait...</p>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', loaderHtml);
    },
    show() {
        const el = document.getElementById('global-loader');
        if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
    },
    hide() {
        const el = document.getElementById('global-loader');
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    }
};

let notyf;

document.addEventListener("DOMContentLoaded", async () => {
    Loader.init();
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
            adminStatus.innerText = `Authenticated: ${user.email}`;
            showPanel();
        }
    }

    function showPanel() {
        loginSection.classList.add("hidden");
        adminPanel.classList.remove("hidden");
        loadBooths();
        loadAnalytics();
        loadJudgesList();
    }

    checkUser();

    document.getElementById("loginBtn").addEventListener("click", async () => {
        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPass").value;
        if (!email || !password) return notyf.error("Input Error: Credentials required");
        
        Loader.show();
        const { error } = await window.supabase.auth.signInWithPassword({ email, password });
        Loader.hide();
        
        if (error) notyf.error("Authentication Failed: " + error.message);
        else {
            notyf.success("Access Granted: Welcome Admin");
            setTimeout(() => location.reload(), 1000);
        }
    });

    document.getElementById("addBoothBtn").addEventListener("click", async () => {
        const name = document.getElementById("newBoothName").value.trim();
        if (!name) return notyf.error("Input Error: Section name required");
        
        Loader.show();
        const { error } = await window.supabase.from("booths").insert([{ section_name: name }]);
        Loader.hide();
        
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
            confirmButtonText: "Terminate",
            background: "#0f172a",
            color: "#ffffff",
        });
        if (result.isConfirmed) {
            Loader.show();
            await window.supabase.auth.signOut();
            Loader.hide();
            notyf.success("Session closed.");
            setTimeout(() => location.reload(), 1000);
        }
    });

    const addJudgeBtn = document.getElementById("addJudgeBtn");
    if (addJudgeBtn) addJudgeBtn.addEventListener("click", addJudge);
});

window.switchTab = (tabName) => {
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("text-blue-500", "border-b-2", "border-blue-500");
        btn.classList.add("text-slate-400");
    });

    const targetContent = document.getElementById(`content-${tabName}`);
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.remove("hidden");
    if (targetTab) targetTab.classList.add("text-blue-500", "border-b-2", "border-blue-500");

    if (tabName === "merit") loadMeritEntry();
    if (tabName === "judges" || tabName === "manage") loadJudgesList();
    if (tabName === "analytics") loadAnalytics();
    if (tabName === "tabulate") loadTabulation();
};

async function loadBooths() {
    const { data } = await window.supabase.from("booths").select("*").order("section_name");
    const list = document.getElementById("boothList");
    if (data && list) {
        list.innerHTML = data.map((b) => `
            <li class="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                <span class="font-bold text-blue-400">${b.section_name}</span>
                <button onclick="deleteBooth('${b.id}', '${b.section_name}')" class="text-xs text-red-500 font-bold uppercase hover:underline">Remove</button>
            </li>`).join("");
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
        Loader.show();
        const { error } = await window.supabase.from("booths").delete().eq("id", id);
        Loader.hide();
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
        const leader = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        document.getElementById("leadingSectionStat").innerText = leader;
    }
    
    const tbody = document.getElementById("auditLogBody");
    if (tbody) {
        tbody.innerHTML = votes.map((vote) => `
            <tr class="border-b border-slate-800 hover:bg-slate-800/30 transition">
                <td class="p-4 font-mono text-blue-400">${vote.sr_code}</td>
                <td class="p-4 text-slate-300">${vote.booths?.section_name || "Removed"}</td>
                <td class="p-4 text-slate-500 text-xs">${new Date(vote.created_at).toLocaleString()}</td>
                <td class="p-4 text-xs font-mono text-slate-600">${vote.ip_address}</td>
            </tr>`).join("");
    }
}

async function loadTabulation() {
    Loader.show();
    const { data: booths } = await window.supabase.from("booths").select("*");
    const { data: votes } = await window.supabase.from("votes").select("booth_id");
    
    const voteCounts = {};
    votes.forEach((v) => (voteCounts[v.booth_id] = (voteCounts[v.booth_id] || 0) + 1));
    const highestVotes = Math.max(...Object.values(voteCounts), 0);
    
    // Calculate all scores first for ranking
    const calculatedData = booths.map(b => {
        const rawJudgeScore = parseFloat(b.judge_final_score) || 0;
        const finalJudgePoints = rawJudgeScore * 0.4;
        const currentVotes = voteCounts[b.id] || 0;
        const digitalPoints = highestVotes > 0 ? (currentVotes / highestVotes) * 50 : 0;
        const stickerCount = b.sticker_count || 0;
        const meritPoints = Math.min(stickerCount, 10);
        const grandTotal = parseFloat((finalJudgePoints + digitalPoints + meritPoints).toFixed(2));

        return { ...b, rawJudgeScore, finalJudgePoints, currentVotes, digitalPoints, meritPoints, grandTotal };
    });

    // Sort by Grand Total Descending
    calculatedData.sort((a, b) => b.grandTotal - a.grandTotal);

    const tbody = document.getElementById("tabulationBody");
    if (!tbody) { Loader.hide(); return; }

    tbody.innerHTML = calculatedData.map((b, index) => {
        let rankBadge = `<span class="text-slate-500">#${index + 1}</span>`;
        if (index === 0) rankBadge = `<span class="bg-yellow-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">🏆 TOP 1</span>`;
        if (index === 1) rankBadge = `<span class="bg-slate-300 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">🥈 TOP 2</span>`;
        if (index === 2) rankBadge = `<span class="bg-orange-400 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">🥉 TOP 3</span>`;

        return `
            <tr class="hover:bg-slate-800/30 transition border-b border-slate-800/50">
                <td class="p-4">
                    <div class="mb-1">${rankBadge}</div>
                    <p class="font-bold text-white uppercase text-xs">${b.section_name}</p>
                    <p class="text-[10px] text-slate-500 font-mono">Votes: ${b.currentVotes} | Stars: ${b.sticker_count}</p>
                </td>
                <td class="p-4 text-center">
                    <span class="text-blue-400 font-mono font-bold">${b.rawJudgeScore.toFixed(1)}</span>
                    <p class="text-[9px] text-slate-500 mt-1">Weight: ${b.finalJudgePoints.toFixed(2)}</p>
                </td>
                <td class="p-4 text-center">
                    <span class="text-blue-500 font-black text-sm">${b.digitalPoints.toFixed(2)}</span>
                </td>
                <td class="p-4 text-center">
                    <span class="text-yellow-500 font-black text-sm">${b.meritPoints.toFixed(1)}</span>
                </td>
                <td class="p-4 text-center bg-blue-600/5">
                    <p class="text-2xl font-black text-white tracking-tighter">${b.grandTotal.toFixed(2)}%</p>
                </td>
            </tr>`;
    }).join("");
    Loader.hide();
}

async function loadMeritEntry() {
    const { data: booths } = await window.supabase.from("booths").select("*").order("section_name");
    const meritGrid = document.getElementById("meritGrid");
    if (booths && meritGrid) {
        meritGrid.innerHTML = booths.map((b) => {
            const currentStars = b.sticker_count || 0;
            let starsHTML = "";
            for (let i = 1; i <= 10; i++) {
                starsHTML += `<span onclick="setStars('${b.id}', ${i})" class="cursor-pointer text-2xl transition-all duration-200 hover:scale-125 star-item-${b.id}" data-value="${i}">${i <= currentStars ? "⭐" : "☆"}</span>`;
            }
            return `
                <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition shadow-lg">
                    <p class="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex justify-between">${b.section_name} <span id="count-${b.id}" class="text-yellow-500">${currentStars}/10</span></p>
                    <div class="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">${starsHTML}</div>
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
    Loader.show();
    const updates = Array.from(inputs).map((input) => 
        window.supabase.from("booths").update({ sticker_count: parseInt(input.value) || 0 }).eq("id", input.getAttribute("data-id"))
    );
    try {
        await Promise.all(updates);
        Loader.hide();
        notyf.success("Merit Points Synchronized!");
        loadMeritEntry();
    } catch (err) {
        Loader.hide();
        notyf.error("Sync Failed!");
    }
};

async function addJudge() {
    const name = document.getElementById("newJudgeName").value.trim();
    const code = document.getElementById("newJudgeCode").value.trim();
    if (!name || !code) return notyf.error("Input Error: Name and Code required");
    
    Loader.show();
    const { error } = await window.supabase.from("judges").insert([{ name, access_code: code }]);
    Loader.hide();
    
    if (error) notyf.error("Database Error: Judge might already exist");
    else {
        notyf.success(`Judge ${name} registered successfully`);
        document.getElementById("newJudgeName").value = "";
        document.getElementById("newJudgeCode").value = "";
        loadJudgesList();
    }
}

async function loadJudgesList() {
    const { data } = await window.supabase.from("judges").select("*").order("name");
    const list = document.getElementById("judgeList");
    if (data && list) {
        list.innerHTML = data.map(j => `
            <li class="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                <div>
                    <p class="font-bold text-blue-400 text-xs uppercase">${j.name}</p>
                    <p class="text-[9px] text-slate-500 font-mono">Code: ${j.access_code}</p>
                </div>
                <button onclick="deleteJudge('${j.id}', '${j.name}')" class="text-[10px] text-red-500 font-bold hover:underline uppercase tracking-tighter">Remove</button>
            </li>`).join("");
    }
}

window.deleteJudge = async (id, name) => {
    const result = await Swal.fire({
        title: "Remove Judge?",
        text: `Access for ${name} will be revoked.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        background: "#0f172a",
        color: "#ffffff"
    });
    if (result.isConfirmed) {
        Loader.show();
        await window.supabase.from("judges").delete().eq("id", id);
        Loader.hide();
        notyf.success("Judge removed");
        loadJudgesList();
    }
};