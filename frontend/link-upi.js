document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const dropArea = document.getElementById('drop-area');
    const dropOverlay = document.getElementById('drop-overlay');
    const fileInput = document.getElementById('file-input');
    
    const vaultDoor = document.getElementById('vault-door');
    const vaultInterior = document.getElementById('vault-interior');
    
    const mainTitle = document.getElementById('main-title');
    const mainSubtitle = document.getElementById('main-subtitle');
    const actionWrapper = document.getElementById('action-wrapper');
    const progressState = document.getElementById('progress-state');
    
    let isProcessing = false;

    // Drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight dropzone
    ['dragenter', 'dragover'].forEach(eventName => {
        document.body.addEventListener(eventName, () => {
            if (!isProcessing) dropOverlay.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, () => {
            dropOverlay.classList.remove('active');
        }, false);
    });

    // Handle Drop
    document.body.addEventListener('drop', (e) => {
        if (isProcessing) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    // Handle Click Selection
    fileInput.addEventListener('change', (e) => {
        if (isProcessing) return;
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please upload a valid CSV file.');
            return;
        }

        isProcessing = true;
        
        // Hide actions, update title
        actionWrapper.style.display = 'none';
        mainTitle.textContent = "Processing File";
        mainSubtitle.textContent = file.name;

        // Sequence Step 1: Spin vault wheel to unlock
        vaultDoor.classList.add('unlocking');

        setTimeout(() => {
            // Sequence Step 2: Open vault door
            vaultDoor.classList.remove('unlocking');
            vaultDoor.classList.add('open');
            vaultInterior.classList.add('open');

            // Wait a moment for visual effect of file going in (simulated by timeout)
            setTimeout(() => {
                // Sequence Step 3: Close vault door
                vaultDoor.classList.remove('open');
                vaultInterior.classList.remove('open');

                setTimeout(() => {
                    // Sequence Step 4: Show progress UI
                    progressState.classList.add('active');
                    simulateParsing();
                }, 1000); // Wait for door to close
            }, 1500); // Time door stays open
        }, 1000); // Time wheel spins
    }

    function simulateParsing() {
        const icon2 = document.getElementById('icon-step2');
        const text2 = document.getElementById('text-step2');
        const icon3 = document.getElementById('icon-step3');
        const text3 = document.getElementById('text-step3');

        // Step 2 completes
        setTimeout(() => {
            icon2.classList.remove('loading');
            icon2.classList.add('done');
            icon2.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
            text2.textContent = "Transactions extracted";
            lucide.createIcons();

            // Step 3 starts
            icon3.classList.add('loading');
            icon3.innerHTML = '<i data-lucide="loader-2" style="width: 14px; height: 14px;"></i>';
            text3.textContent = "Mapping matrices...";
            lucide.createIcons();

            // Step 3 completes
            setTimeout(() => {
                icon3.classList.remove('loading');
                icon3.classList.add('done');
                icon3.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
                text3.textContent = "Sync Complete";
                lucide.createIcons();

                mainTitle.textContent = "Success";
                mainTitle.style.color = "var(--success)";
                mainSubtitle.textContent = "Your financial data is secured.";

                // Exit flash
                setTimeout(() => {
                    document.getElementById('page-flash').classList.add('active');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 300);
                }, 1000);

            }, 2000);

        }, 2000);
    }
});
