document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration (Keep as is) ---
    const songs = {
        'David Guetta - Titanium': 'songA',
        'Doechii - Anxiety': 'songB',
        'Ed Sheeran - Shape of You': 'songC',
        'Charlie Puth - We Dont Talk Anymore': 'songD'
    };
    const stemTypes = ['vocals', 'drums', 'bass', 'instruments'];
    const audioFolderPath = 'public/audio/';
    const fadeDuration = 0.05;

    // --- DOM Elements (Keep as is) ---
    const songSelect = document.getElementById('song-select');
    const loadingIndicator = document.getElementById('loading-indicator');
    const controlsContainer = document.getElementById('controls');
    const stemButtonsContainer = document.querySelector('.stem-buttons');
    const stemButtons = {
        vocals: document.getElementById('vocals-btn'),
        drums: document.getElementById('drums-btn'),
        bass: document.getElementById('bass-btn'),
        instruments: document.getElementById('instruments-btn'),
    };
    const fullMixBtn = document.getElementById('full-mix-btn');
    const errorMessage = document.getElementById('error-message');
    const statusDisplay = document.getElementById('status');
    const timeDisplay = document.getElementById('current-time');

    // --- Web Audio API State (Keep as is) ---
    let audioContext;
    let stemBuffers = {};
    let stemSources = {};
    let stemGains = {};
    let isPlaying = false;
    let isLoaded = false;
    let playbackStartTime = 0;
    let updateInterval = null;

    // --- Initialization (Keep as is) ---
    function init() {
        populateSongSelect();
        setupEventListeners();
        resetUI();
    }

    function populateSongSelect() { // Keep as is
        for (const displayName in songs) {
            const option = document.createElement('option');
            option.value = songs[displayName];
            option.textContent = displayName;
            songSelect.appendChild(option);
        }
    }

    function setupEventListeners() { // Keep as is
        songSelect.addEventListener('change', handleSongSelection);
        stemButtonsContainer.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (button && button.dataset.stem) {
                handleStemButtonClick(button.dataset.stem);
            }
        });
        fullMixBtn.addEventListener('click', handleFullMixClick);
        document.addEventListener('keydown', handleKeyPress);
    }

    // --- Audio Loading (Keep as is) ---
    async function handleSongSelection() { // Keep as is
        const songFolderName = songSelect.value;
        if (!songFolderName) {
            resetPlayer();
            resetUI();
            return;
        }

        resetPlayer();
        showLoading(true);
        clearError();
        disableControls();

        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const loadPromises = stemTypes.map(stem => loadAudio(songFolderName, stem));
            const loadedBuffers = await Promise.all(loadPromises);

            stemTypes.forEach((stem, index) => {
                stemBuffers[stem] = loadedBuffers[index];
            });

            isLoaded = true;
            enableControls();
            updateStatus('Ready');
            console.log(`Song "${getSongDisplayName(songFolderName)}" loaded successfully.`);

        } catch (error) {
            console.error("Error loading song:", error);
            showError(`Failed to load song "${getSongDisplayName(songFolderName)}". ${error.message}`);
            resetPlayer();
        } finally {
            showLoading(false);
        }
    }

    async function loadAudio(songFolderName, stemType) { // Keep as is
       const url = `${audioFolderPath}${songFolderName}/${stemType}.mp3`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${stemType}.mp3`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error fetching or decoding ${url}:`, error);
            throw new Error(`Could not load/decode ${stemType}. Check file path and format.`);
        }
    }

    // --- Playback Control Logic (MODIFIED) ---

    function handleFullMixClick() { // Keep mostly as is
        if (!isLoaded || !audioContext) return;

        if (!isPlaying) {
            startPlayback(stemTypes); // Start fresh with all stems
        } else {
            let anyStemMuted = false;
            stemTypes.forEach(stem => {
                if (!isStemActive(stem)) {
                    fadeStemGain(stem, true); // Fade in
                    anyStemMuted = true;
                }
            });
            // Explicitly update UI status if changes were made
            if (anyStemMuted) {
                updateAllStemButtonsUI(); // Update buttons first
                updateStatusDisplay(); // Then update status text
            }
        }
    }

    function handleStemButtonClick(stemName) { // Keep mostly as is
        if (!isLoaded || !audioContext || !stemBuffers[stemName]) return;

        const button = stemButtons[stemName];
        const currentlyActive = isStemActive(stemName);

        if (!isPlaying) {
            // --- Start playback from beginning with this stem ---
            startPlayback([stemName]); // Pass only this stem as initially active
        } else {
            // --- Toggle stem gain while playback clock is running ---
            if (currentlyActive) {
                fadeStemGain(stemName, false); // Deactivate: Fade out
                if (getActiveStemCount() === 0) {
                    stopPlayback(); // Stop if last stem muted
                } else {
                    updateStatusDisplay(); // Update status if other stems remain
                }
            } else {
                fadeStemGain(stemName, true); // Activate: Fade in
                updateStatusDisplay(); // Update status after activation
            }
        }
        // No need for updateStatusDisplay here, it's handled within branches or start/stop
    }


    function startPlayback(initialActiveStems = []) {
        if (isPlaying || !isLoaded || !audioContext) return;

        console.log("Starting playback with active stems:", initialActiveStems);
        // *** REMOVED softStop call from here ***

        playbackStartTime = audioContext.currentTime;
        let sourcesCreated = 0;

        stemTypes.forEach(stem => {
            if (!stemBuffers[stem]) {
                console.warn(`Buffer for ${stem} not loaded, skipping.`);
                return;
            }

            // Create Gain Node (ensure previous ones are cleared if necessary - handled in resetPlayer/stopPlayback)
            const gainNode = audioContext.createGain();
            const isActive = initialActiveStems.includes(stem);
            gainNode.gain.setValueAtTime(isActive ? 1 : 0, audioContext.currentTime); // Set initial gain accurately
            gainNode.connect(audioContext.destination);
            stemGains[stem] = gainNode;

            // Create Buffer Source
            const source = audioContext.createBufferSource();
            source.buffer = stemBuffers[stem];
            source.connect(gainNode);
            source.onended = () => {
                console.log(`${stem} source ended.`);
                // Only delete the source ref on end, check if all ended
                delete stemSources[stem];
                checkIfAllSourcesEnded();
            };

            source.start(playbackStartTime, 0);
            stemSources[stem] = source; // Store source node *after* starting
            sourcesCreated++;
        });

        if (sourcesCreated > 0) {
            isPlaying = true;
            document.body.classList.add('playing');
            // *** CRITICAL ORDER: Update UI first, then status ***
            updateAllStemButtonsUI(initialActiveStems); // Pass initial stems for accurate UI setup
            startTimer();
            updateStatusDisplay(); // Now calculate status based on correct UI state
            console.log("Playback started.");
        } else {
            console.warn("No sources could be created. Playback not started.");
            resetPlayer();
        }
    }

    function stopPlayback(naturalEnd = false, softStop = false) { // Keep mostly as is
        if (!isPlaying && Object.keys(stemSources).length === 0 && Object.keys(stemGains).length === 0) return;

        console.log(`Stopping playback... (Natural End: ${naturalEnd}, Soft Stop: ${softStop})`);
        const wasPlaying = isPlaying; // Track if we were actually playing
        isPlaying = false;
        document.body.classList.remove('playing');
        stopTimer();

        stemTypes.forEach(stem => {
            if (stemSources[stem]) {
                try {
                    stemSources[stem].onended = null;
                    stemSources[stem].stop();
                    stemSources[stem].disconnect();
                } catch (e) { /* Ignore */ }
                delete stemSources[stem];
            }
            // Only clear gains if not a soft stop
             if (!softStop && stemGains[stem]) {
                 stemGains[stem].disconnect();
                 delete stemGains[stem];
             }
        });

         playbackStartTime = 0;

        // Only reset UI/Status if not a soft stop AND playback was actually running
        if (!softStop && wasPlaying) {
            updateAllStemButtonsUI([]); // Clear all active states visually
             if (naturalEnd) {
                 updateStatus('Finished');
                 resetTimerDisplay();
             } else {
                 updateStatus('Stopped');
             }
        } else if (!softStop) {
            // If it wasn't playing but stop was called (e.g. during reset), ensure UI is clean
             updateAllStemButtonsUI([]);
             updateStatus(isLoaded ? 'Ready' : 'Idle'); // Reflect loaded state if applicable
        }

        console.log("Playback stopped. Resources cleaned (as needed).");
    }

     function checkIfAllSourcesEnded() { // Keep as is
        // If manually stopped, isPlaying will be false, so exit
        if (!isPlaying) return;

        // Check if any source *still exists* in our tracking object
        const anySourceRemaining = Object.keys(stemSources).length > 0;

        if (!anySourceRemaining) {
             console.log("All sources appear to have ended naturally.");
             // Use timeout to allow final audio processing before state change
             setTimeout(() => stopPlayback(true), 50); // Slight delay for safety
        }
        if (!wasPlaying && !softStop) {
            document.body.classList.remove('playing'); // <<< ADD for safety
        }
    
    }


    // --- Gain & UI Helpers (MODIFIED) ---

    function fadeStemGain(stemName, activate) { // Keep as is
        const gainNode = stemGains[stemName];
        const button = stemButtons[stemName];
        if (!gainNode || !button) return;

        const targetGain = activate ? 1 : 0;
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + fadeDuration);

        button.classList.toggle('active', activate);
        button.setAttribute('aria-pressed', activate ? 'true' : 'false');
    }

    function isStemActive(stemName) { // Keep as is (relies on classList)
        const button = stemButtons[stemName];
        return button && button.classList.contains('active');
    }

    function getActiveStemCount() { // Keep as is
        return stemTypes.reduce((count, stem) => {
            return count + (isStemActive(stem) ? 1 : 0);
        }, 0);
    }

    // *** MODIFIED: Accept optional explicit list ***
    function updateAllStemButtonsUI(explicitlyActiveStems = null) {
        stemTypes.forEach(stem => {
            const button = stemButtons[stem];
            if (!button) return;

            let isActive;
            if (explicitlyActiveStems !== null) {
                // If a list is provided (e.g., during startPlayback), use it directly
                isActive = explicitlyActiveStems.includes(stem);
            } else {
                // Otherwise (e.g., during stop, or general update), rely on isPlaying and button class
                isActive = isPlaying && button.classList.contains('active');
            }

            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function updateStatusDisplay() { // Keep as is
         if (!isLoaded) {
            updateStatus("Idle");
        } else if (isPlaying) {
            const activeCount = getActiveStemCount();
             // This condition should ideally not be met if stopPlayback works correctly
            if (activeCount === 0 && Object.keys(stemSources).length > 0) {
                 updateStatus("Playing (Silent - Ending...)"); // More accurate status if sources are running but muted
            } else if (activeCount === stemTypes.length) {
                updateStatus("Playing (Full Mix)");
            } else {
                 updateStatus(`Playing (${activeCount} Stem${activeCount !== 1 ? 's' : ''})`);
            }
        } else {
            updateStatus(isLoaded ? "Ready" : "Idle");
        }
    }

    function resetPlayer() { // Keep mostly as is
        console.log("Resetting player state...");
        stopPlayback(false, false); // Full stop, ensure gains are cleared
        stemBuffers = {};
        isLoaded = false;
        // isPlaying should already be false from stopPlayback
        playbackStartTime = 0;
        resetTimerDisplay();
        // updateStatus('Idle'); // Status will be updated by resetUI
    }

    function resetUI() { // Keep mostly as is
        disableControls();
        document.body.classList.remove('playing');
        updateAllStemButtonsUI([]); // Ensure buttons visually reset
        clearError();
        showLoading(false);
        resetTimerDisplay();
        updateStatus('Idle');
        songSelect.value = '';
    }

    function disableControls() { // Keep as is
        controlsContainer.classList.add('controls-disabled');
        Object.values(stemButtons).forEach(btn => btn.disabled = true);
        fullMixBtn.disabled = true;
    }

    function enableControls() { // Keep as is
        controlsContainer.classList.remove('controls-disabled');
        Object.values(stemButtons).forEach(btn => btn.disabled = false);
        fullMixBtn.disabled = false;
    }

    function showLoading(isLoading) { // Keep as is
        loadingIndicator.style.display = isLoading ? 'inline' : 'none';
    }

    function showError(message) { // Keep as is
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function clearError() { // Keep as is
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }

     // *** MODIFIED: Removed setTimeout ***
     function updateStatus(text) {
         statusDisplay.textContent = `Status: ${text}`;
    }


    // --- Timer (Keep as is) ---
    function startTimer() { // Keep as is
        stopTimer();
        updateTimerDisplay();
        updateInterval = setInterval(updateTimerDisplay, 500);
    }

    function stopTimer() { // Keep as is
        clearInterval(updateInterval);
        updateInterval = null;
    }

    function updateTimerDisplay() { // Keep as is
        if (!isPlaying || !audioContext || playbackStartTime === 0) {
            return;
        }
        const elapsedTime = audioContext.currentTime - playbackStartTime;
        const displayTime = Math.max(0, elapsedTime);
        timeDisplay.textContent = `Time: ${formatTime(displayTime)}`;
    }

    function resetTimerDisplay() { // Keep as is
         timeDisplay.textContent = 'Time: 0:00';
    }

    function formatTime(seconds) { // Keep as is
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // --- Keyboard Handling (Keep as is) ---
    function handleKeyPress(event) { // Keep as is
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
        if (controlsContainer.classList.contains('controls-disabled')) return;

        const key = event.key.toLowerCase();
        let targetButton = null;
        let action = 'toggle';

        switch (key) {
            case 'v': targetButton = stemButtons.vocals; break;
            case 'd': targetButton = stemButtons.drums; break;
            case 'b': targetButton = stemButtons.bass; break;
            case 'i': targetButton = stemButtons.instruments; break;
            case 'f': targetButton = fullMixBtn; action = 'fullMix'; break;
            default: return;
        }

        if (targetButton && !targetButton.disabled) {
            event.preventDefault();
             if (action === 'toggle') {
                handleStemButtonClick(targetButton.dataset.stem);
             } else if (action === 'fullMix') {
                handleFullMixClick();
             }
            targetButton.style.transform = 'scale(0.97)';
            setTimeout(() => { targetButton.style.transform = 'scale(1)'; }, 100);
        }
    }

    // --- Utility (Keep as is) ---
    function getSongDisplayName(folderName) { // Keep as is
        for (const displayName in songs) {
            if (songs[displayName] === folderName) return displayName;
        }
        return folderName;
    }

    // --- Start the App ---
    init();
});