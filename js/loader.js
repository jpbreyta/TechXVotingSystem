const Loader = {
    init() {
        if (document.getElementById('global-loader')) return;
        const loaderHtml = `
            <div id="global-loader" class="hidden fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
                <div class="flex flex-col items-center">
                    <div class="relative w-12 h-12">
                        <div class="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <div class="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                    <p class="mt-4 text-blue-500 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">
                        Please Wait...
                    </p>
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Loader.init());
} else {
    Loader.init();
}