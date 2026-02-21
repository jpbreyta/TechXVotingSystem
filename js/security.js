(function () {
    'use strict';

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === "F12") {
            e.preventDefault();
            return false;
        }

        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
            e.preventDefault();
            return false;
        }

        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }

        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }
    });

    setInterval(() => {
        const startTime = performance.now();
        debugger; 
        const endTime = performance.now();

        if (endTime - startTime > 100) {
            document.body.innerHTML = 
                '<div style="background:#020617; color:#ef4444; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif; flex-direction:column; text-align:center; padding:20px;">' +
                '<h1 style="font-size:3rem; font-weight:900;">SECURITY BREACH</h1>' +
                '<p style="color:#94a3b8;">Developer Tools detected. Please close the console to continue.</p>' +
                '<button onclick="location.reload()" style="margin-top:20px; background:#2563eb; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">Reload Page</button>' +
                '</div>';
        }
    }, 1000);

    setInterval(() => {
        console.clear();
        console.log("%cTECH X SECURITY SYSTEM", "color: #3b82f6; font-size: 30px; font-weight: bold; -webkit-text-stroke: 1px black;");
        console.log("%cUnauthorized access to console is strictly prohibited.", "color: red; font-size: 14px;");
    }, 2000);

})();