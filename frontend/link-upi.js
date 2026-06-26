document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const dropArea = document.getElementById('drop-area');
    const dropzone = document.getElementById('main-dropzone');
    const fileInput = document.getElementById('file-input');
    const mainTitle = document.getElementById('main-title');
    const mainSubtitle = document.getElementById('main-subtitle');
    const actionWrapper = document.getElementById('action-wrapper');
    const progressState = document.getElementById('progress-state');
    
    // 3D Tilt Effect
    dropArea.addEventListener('mousemove', (e) => {
        const rect = dropArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        dropArea.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    dropArea.addEventListener('mouseleave', () => {
        dropArea.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });

    // Ambient Particles
    const particleContainer = document.getElementById('particle-container');
    if (particleContainer) {
        const colors = ['purple', 'cyan'];
        for(let i=0; i<40; i++) {
            const p = document.createElement('div');
            const colorClass = colors[Math.floor(Math.random() * colors.length)];
            p.className = `particle ${colorClass}`;
            p.style.width = Math.random() * 3 + 'px';
            p.style.height = p.style.width;
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = Math.random() * 100 + 'vh';
            p.style.animationDuration = (Math.random() * 15 + 10) + 's';
            p.style.animationDelay = (Math.random() * 5) + 's';
            particleContainer.appendChild(p);
        }
    }
    
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
            if (!isProcessing) dropzone.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, () => {
            dropzone.classList.remove('active');
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

    // Handle Skip
    document.getElementById('btn-skip').addEventListener('click', () => {
        if (isProcessing) return;
        localStorage.setItem('hasDataUploaded', 'false');
        document.getElementById('page-flash').classList.add('active');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 300);
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
        // Hide dropzone, show progress
        document.getElementById('main-dropzone').style.display = 'none';
        
        progressState.classList.add('active');
        simulateParsing();
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
                mainTitle.style.color = "#38bdf8";
                mainSubtitle.textContent = "Your financial data is secured.";

                // Exit flash
                setTimeout(() => {
                    document.getElementById('page-flash').classList.add('active');
                    setTimeout(() => {
                        localStorage.setItem('hasDataUploaded', 'true');
                        window.location.href = 'index.html';
                    }, 300);
                }, 1000);

            }, 2000);

        }, 2000);
    }
});
