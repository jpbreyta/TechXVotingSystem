document.addEventListener("DOMContentLoaded", async () => {
  const notyf = new Notyf({
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

    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password,
    });

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
  }

  document.getElementById("addBoothBtn").addEventListener("click", async () => {
    const name = document.getElementById("newBoothName").value.trim();

    if (!name) {
      notyf.error("Error: Section name is required");
      return;
    }

    const { error } = await window.supabase
      .from("booths")
      .insert([{ section_name: name }]);

    if (error) {
      notyf.error("Error: This record might already exist");
    } else {
      notyf.success(`Section ${name} added successfully`);
      document.getElementById("newBoothName").value = "";
      loadBooths();
    }
  });

  async function loadBooths() {
    const { data, error } = await window.supabase
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
                    <button onclick="deleteBooth('${b.id}', '${b.section_name}')" class="text-xs text-red-500 hover:text-red-400 font-bold uppercase">Delete</button>
                </li>
            `,
        )
        .join("");
    }
  }

  window.deleteBooth = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const { error } = await window.supabase
        .from("booths")
        .delete()
        .eq("id", id);
      if (error) notyf.error("Error deleting booth");
      else {
        notyf.success("Booth deleted successfully");
        loadBooths();
      }
    }
  };

  document
    .getElementById("uploadBlacklistBtn")
    .addEventListener("click", async () => {
      const rawInput = document.getElementById("blacklistInput").value;
      const codes = rawInput
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c !== "");

      if (codes.length === 0) {
        notyf.error("Error: Please provide SR-codes");
        return;
      }

      const btn = document.getElementById("uploadBlacklistBtn");
      btn.innerText = "UPDATING...";
      btn.disabled = true;

      const inserts = codes.map((c) => ({ sr_code: c }));
      const { error } = await window.supabase
        .from("blacklist_sr")
        .upsert(inserts);

      if (error) {
        notyf.error("Error uploading blacklist: " + error.message);
      } else {
        notyf.success(`Success: ${codes.length} SR-Codes updated`);
        document.getElementById("blacklistInput").value = "";
      }

      btn.innerText = "UPDATE BLACKLIST";
      btn.disabled = false;
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
      cancelButtonText: "Cancel",
      background: "#0f172a", 
      color: "#ffffff", 
      iconColor: "#3b82f6", 
    });

    if (result.isConfirmed) {
      try {
        await window.supabase.auth.signOut();

        notyf.success("Session closed. Redirecting to login...");

        setTimeout(() => {
          location.reload();
        }, 1500);
      } catch (error) {
        notyf.error("Error logging out. Please try again.");
      }
    }
  });
});
