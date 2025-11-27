document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.add('hidden');
    }

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggleButton = document.getElementById('toggle-sidebar');
        if (window.innerWidth <= 768 && sidebar && !sidebar.contains(e.target)) {
            // Only check toggleButton if it exists
            if (toggleButton && (e.target === toggleButton || toggleButton.contains(e.target))) {
                return;
            }
            sidebar.classList.add('hidden');
        }
    });

    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            // Double tap detected
            const target = e.target;
            if (target.classList.contains('dragged-element')) {
                // Simulate dblclick for dragged elements
                const event = new Event('dblclick');
                target.dispatchEvent(event);
            }
        }
        lastTap = currentTime;
    });
});
