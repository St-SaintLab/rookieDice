window.DiceAudio = (function () {

    const cache = new Map();
    const activeWinAudios = new Set();

    const sources = {
        roll: '/sounds/dice-roll.mp3',
        win: '/sounds/win-fanfare.mp3'
    };

    function getAudio(key) {
        if (!cache.has(key)) {
            const audio = new Audio(sources[key]);
            audio.preload = 'auto';
            cache.set(key, audio);
        }

        const original = cache.get(key);
        const clone = original.cloneNode(true);
        clone.volume = key === 'win' ? 0.8 : 0.6;

        return clone;
    }

    async function play(key) {
        try {
            const audio = getAudio(key);

            if (key === 'win') {
                activeWinAudios.add(audio);
                audio.addEventListener('ended', () => activeWinAudios.delete(audio), { once: true });
            }

            await audio.play();
        } catch {
            // Audio playback is best-effort.
        }
    }

    function stopWin() {
        for (const audio of activeWinAudios) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch {
                // Best-effort cleanup.
            }
        }

        activeWinAudios.clear();
    }

    return {
        playRoll: () => play('roll'),
        playWin: () => play('win'),
        stopWin,
        setPaused: (_paused) => Promise.resolve()
    };

})();