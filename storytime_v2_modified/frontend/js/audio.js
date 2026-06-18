// ============================================================
// STORYTIME — Audio Engine v2
// Procedural music & SFX using Web Audio API (no external files)
// ============================================================

const audioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let currentTrack = null;
  let isPlaying = false;
  let sfxEnabled = true;
  let currentMood = 'default';
  let analyser = null;
  let oscillators = [];
  let noiseNode = null;
  let initialized = false;

  // ── INIT ──
  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
      musicGain = ctx.createGain();
      musicGain.gain.setValueAtTime(0.5, ctx.currentTime);
      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.7, ctx.currentTime);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
      initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  // ── NOISE GENERATOR ──
  function createNoise(type = 'brown') {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      } else {
        data[i] = white * 0.5;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  // ── REVERB ──
  function createReverb(seconds = 3) {
    const length = ctx.sampleRate * seconds;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  // ── STOP ALL ──
  function stopAll() {
    oscillators.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} });
    oscillators = [];
    if (noiseNode) { try { noiseNode.stop(); noiseNode.disconnect(); } catch(e){} noiseNode = null; }
  }

  // ── MOODS / TRACKS ──

  const tracks = {
    // Haunting ambient — for horror/dark
    haunted: {
      name: '🏚️ The Dark Beyond',
      build(g) {
        const rev = createReverb(6);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 400;

        // Brown noise wind
        const noise = createNoise('brown');
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.04;
        noise.connect(lp); lp.connect(noiseGain); noiseGain.connect(rev); rev.connect(g);
        noise.start(); noiseNode = noise;

        // Drone notes
        const drones = [55, 82.4, 110];
        drones.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const og = ctx.createGain();
          og.gain.setValueAtTime(0, ctx.currentTime);
          og.gain.linearRampToValueAtTime(0.06 - i * 0.015, ctx.currentTime + 4);
          osc.connect(og); og.connect(rev); rev.connect(g);
          osc.start();
          oscillators.push(osc);

          // Slow LFO pitch wobble
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.05 + i * 0.02;
          const lfoG = ctx.createGain(); lfoG.gain.value = freq * 0.003;
          lfo.connect(lfoG); lfoG.connect(osc.frequency);
          lfo.start(); oscillators.push(lfo);
        });

        // Occasional high eerie tone
        function eerieNote() {
          if (!isPlaying) return;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const note = [220, 246.9, 261.6, 293.7][Math.floor(Math.random()*4)];
          osc.frequency.value = note;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0, ctx.currentTime);
          og.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
          og.gain.linearRampToValueAtTime(0, ctx.currentTime + 6);
          osc.connect(og); og.connect(rev); rev.connect(g);
          osc.start(); osc.stop(ctx.currentTime + 7);
          setTimeout(eerieNote, 6000 + Math.random() * 10000);
        }
        setTimeout(eerieNote, 3000);
      }
    },

    // Cyberpunk pulsing ambient
    cyberpunk: {
      name: '🌆 Neon Frequencies',
      build(g) {
        const rev = createReverb(2);
        const comp = ctx.createDynamicsCompressor();
        comp.connect(g);

        // Sub bass pulse
        const bass = ctx.createOscillator();
        bass.type = 'sawtooth'; bass.frequency.value = 55;
        const bassF = ctx.createBiquadFilter();
        bassF.type = 'lowpass'; bassF.frequency.value = 120;
        const bassG = ctx.createGain(); bassG.gain.value = 0.08;
        bass.connect(bassF); bassF.connect(bassG); bassG.connect(comp);
        bass.start(); oscillators.push(bass);

        // LFO on bass
        const bassLFO = ctx.createOscillator();
        bassLFO.frequency.value = 1/8;
        const blfoG = ctx.createGain(); blfoG.gain.value = 10;
        bassLFO.connect(blfoG); blfoG.connect(bass.frequency);
        bassLFO.start(); oscillators.push(bassLFO);

        // Pad layers
        [[220, 'triangle', 0.04], [329.6, 'sine', 0.025], [440, 'sine', 0.02]].forEach(([f, t, amp]) => {
          const osc = ctx.createOscillator();
          osc.type = t; osc.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = amp;
          const lfo = ctx.createOscillator(); lfo.frequency.value = 0.1;
          const lg = ctx.createGain(); lg.gain.value = f * 0.005;
          lfo.connect(lg); lg.connect(osc.frequency);
          osc.connect(og); og.connect(rev); rev.connect(comp);
          osc.start(); lfo.start();
          oscillators.push(osc, lfo);
        });

        // Hi-hat style noise pulse
        let beat = 0;
        function pulse() {
          if (!isPlaying) return;
          if (beat % 2 === 0) {
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
            const src = ctx.createBufferSource(); src.buffer = buf;
            const hg = ctx.createGain(); hg.gain.value = 0.03;
            const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 8000;
            src.connect(hf); hf.connect(hg); hg.connect(comp);
            src.start();
          }
          beat++;
          setTimeout(pulse, 250);
        }
        setTimeout(pulse, 1000);
      }
    },

    // Epic fantasy orchestral ambient
    fantasy: {
      name: '⚔️ Halls of Eldenmoor',
      build(g) {
        const rev = createReverb(5);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 60;
        rev.connect(hp); hp.connect(g);

        // Choir-like pad (multiple detuned oscillators)
        const choirNotes = [130.8, 164.8, 196, 261.6, 329.6];
        choirNotes.forEach((freq, i) => {
          [-0.5, 0, 0.5].forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq + detune;
            const og = ctx.createGain();
            og.gain.setValueAtTime(0, ctx.currentTime);
            og.gain.linearRampToValueAtTime(0.025 - i * 0.003, ctx.currentTime + 5 + i);
            osc.connect(og); og.connect(rev);
            osc.start(); oscillators.push(osc);
          });
        });

        // Slow melodic motif
        const motif = [261.6, 293.7, 329.6, 261.6, 220, 246.9, 261.6];
        let motifIdx = 0;
        function playMotif() {
          if (!isPlaying) return;
          const freq = motif[motifIdx % motif.length];
          const osc = ctx.createOscillator();
          osc.type = 'triangle'; osc.frequency.value = freq * 2;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0, ctx.currentTime);
          og.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
          og.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
          osc.connect(og); og.connect(rev);
          osc.start(); osc.stop(ctx.currentTime + 3);
          motifIdx++;
          setTimeout(playMotif, 2000 + Math.random() * 1000);
        }
        setTimeout(playMotif, 2000);

        // Low rumble
        const noise = createNoise('brown');
        const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 80;
        const ng = ctx.createGain(); ng.gain.value = 0.03;
        noise.connect(nf); nf.connect(ng); ng.connect(g);
        noise.start(); noiseNode = noise;
      }
    },

    // Default calm ambient
    default: {
      name: '📖 The Reading Room',
      build(g) {
        const rev = createReverb(4);
        rev.connect(g);

        // Soft harmonic pad
        [130.8, 196, 261.6, 392].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0, ctx.currentTime);
          og.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 6 + i * 2);
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.07 + i * 0.02;
          const lg = ctx.createGain(); lg.gain.value = freq * 0.002;
          lfo.connect(lg); lg.connect(osc.frequency);
          osc.connect(og); og.connect(rev);
          osc.start(); lfo.start();
          oscillators.push(osc, lfo);
        });
      }
    }
  };

  // mood → track mapping
  const moodTrackMap = {
    stormy: 'haunted', dark: 'haunted', nightmare: 'haunted',
    cyberpunk: 'cyberpunk', underground: 'cyberpunk', corporate: 'cyberpunk',
    fantasy: 'fantasy', 'dark-fantasy': 'fantasy', enchanted: 'fantasy',
    default: 'default'
  };

  // ── PLAY TRACK ──
  function playTrack(trackKey) {
    if (!initialized) return;
    const key = trackKey || 'default';
    if (currentTrack === key && isPlaying) return;
    stopAll();
    currentTrack = key;
    const track = tracks[key] || tracks.default;
    document.getElementById('music-track-name').textContent = track.name;
    try {
      track.build(musicGain);
      isPlaying = true;
      updateUI();
    } catch(e) { console.warn('Track build error:', e); }
  }

  // ── PUBLIC API ──
  function toggle() {
    if (!initialized) init();
    if (ctx.state === 'suspended') ctx.resume();
    if (isPlaying) {
      musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => { stopAll(); isPlaying = false; updateUI(); }, 1000);
    } else {
      musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1);
      playTrack(currentTrack || 'default');
    }
  }

  function setMood(mood) {
    if (!initialized || !isPlaying) return;
    const trackKey = moodTrackMap[mood] || 'default';
    if (trackKey !== currentTrack) playTrack(trackKey);
  }

  function setVolume(vol) {
    if (!masterGain) return;
    masterGain.gain.linearRampToValueAtTime(vol, (ctx?.currentTime || 0) + 0.1);
    // Update slider fill
    const s = document.getElementById('vol-slider');
    if (s) s.style.background = `linear-gradient(90deg,var(--gold) ${vol*100}%,rgba(200,146,74,.25) ${vol*100}%)`;
  }

  function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    const btn = document.getElementById('sfx-toggle');
    if (btn) {
      btn.textContent = sfxEnabled ? 'SFX ●' : 'SFX ○';
      btn.classList.toggle('active', sfxEnabled);
    }
  }

  function updateUI() {
    const waves = document.getElementById('music-waves');
    if (waves) waves.classList.toggle('paused', !isPlaying);
    const btn = document.getElementById('music-toggle');
    if (btn) btn.title = isPlaying ? 'Pause Music' : 'Play Music';
  }

  // ── SFX ──
  function sfx(type) {
    if (!initialized || !sfxEnabled || !ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      switch(type) {
        case 'page': pageTurn(); break;
        case 'choose': chooseSound(); break;
        case 'whoosh': whoosh(); break;
        case 'good': endingGood(); break;
        case 'bad': endingBad(); break;
        case 'secret': endingSecret(); break;
        case 'neutral': endingNeutral(); break;
        case 'hover': hoverTick(); break;
        case 'intro': introChime(); break;
      }
    } catch(e) {}
  }

  function pageTurn() {
    // Soft parchment rustle
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random()*2-1) * Math.sin(Math.PI * i / d.length) * 0.6;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start();
  }

  function chooseSound() {
    // Satisfying low click + chime
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(g); g.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  }

  function whoosh() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
    const g = ctx.createGain(); g.gain.value = 0.15;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start();
  }

  function hoverTick() {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g); g.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }

  function introChime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      const rev = createReverb(2); rev.connect(sfxGain);
      osc.connect(g); g.connect(rev);
      osc.start(t); osc.stop(t + 1.5);
    });
  }

  function endingGood() {
    // Triumphant ascending arpeggio
    [261.6, 329.6, 392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      const rev = createReverb(3); rev.connect(sfxGain);
      osc.connect(g); g.connect(rev);
      osc.start(t); osc.stop(t + 2);
    });
  }

  function endingBad() {
    // Descending dark tones
    [220, 185, 155.6, 130.8, 110].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2);
      const rev = createReverb(4); rev.connect(sfxGain);
      osc.connect(f); f.connect(g); g.connect(rev);
      osc.start(t); osc.stop(t + 2.5);
    });
  }

  function endingSecret() {
    // Mysterious shimmering tones
    [880, 1108.7, 1318.5, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4 + i;
      const lg = ctx.createGain(); lg.gain.value = freq * 0.01;
      lfo.connect(lg); lg.connect(osc.frequency);
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.3;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + 3);
      const rev = createReverb(5); rev.connect(sfxGain);
      osc.connect(g); g.connect(rev);
      osc.start(t); lfo.start(t); osc.stop(t+3.5); lfo.stop(t+3.5);
    });
  }

  function endingNeutral() {
    // Bittersweet unresolved chord
    [261.6, 311.1, 392, 466.2].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
      g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
      const rev = createReverb(4); rev.connect(sfxGain);
      osc.connect(g); g.connect(rev);
      osc.start(); osc.stop(ctx.currentTime + 4.5);
    });
  }

  // ── MYSTERY TRACK (train, noir, suspense) ──
  tracks.mystery = {
    name: '🚂 Midnight Rails',
    build(g) {
      const rev = createReverb(5);
      rev.connect(g);

      // Low rumble like train on tracks
      const noise = createNoise('brown');
      const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 100;
      const ng = ctx.createGain(); ng.gain.value = 0.06;
      noise.connect(nf); nf.connect(ng); ng.connect(g);
      noise.start(); noiseNode = noise;

      // Rhythmic pulse (train beat)
      let tick = 0;
      function trainBeat() {
        if (!isPlaying) return;
        if (tick % 4 === 0) {
          const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.07, ctx.currentTime);
          og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(og); og.connect(g);
          osc.start(); osc.stop(ctx.currentTime + 0.35);
        }
        tick++;
        setTimeout(trainBeat, 300);
      }
      setTimeout(trainBeat, 500);

      // Haunting melodic line (high, sparse)
      const melNotes = [440, 415.3, 392, 440, 466.2, 440, 392];
      let mIdx = 0;
      function melodyNote() {
        if (!isPlaying) return;
        const freq = melNotes[mIdx % melNotes.length];
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, ctx.currentTime);
        og.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.4);
        og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
        osc.connect(og); og.connect(rev);
        osc.start(); osc.stop(ctx.currentTime + 3.5);
        mIdx++;
        setTimeout(melodyNote, 2500 + Math.random() * 1500);
      }
      setTimeout(melodyNote, 2000);
    }
  };

  // ── DEEP/OCEAN TRACK (submarine, abyss) ──
  tracks.deep = {
    name: '🌊 The Abyss',
    build(g) {
      const rev = createReverb(8);
      rev.connect(g);

      // Very deep, slow drone
      [27.5, 36.7, 41.2].forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, ctx.currentTime);
        og.gain.linearRampToValueAtTime(0.09 - i * 0.02, ctx.currentTime + 8);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.02 + i * 0.01;
        const lg = ctx.createGain(); lg.gain.value = freq * 0.01;
        lfo.connect(lg); lg.connect(osc.frequency);
        osc.connect(og); og.connect(rev);
        osc.start(); lfo.start();
        oscillators.push(osc, lfo);
      });

      // Sonar-like ping
      function ping() {
        if (!isPlaying) return;
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 880;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.05, ctx.currentTime);
        og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
        osc.connect(og); og.connect(rev);
        osc.start(); osc.stop(ctx.currentTime + 4.5);
        setTimeout(ping, 8000 + Math.random() * 6000);
      }
      setTimeout(ping, 3000);

      // Bubbles (white noise bursts)
      function bubble() {
        if (!isPlaying) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1-i/d.length);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 600 + Math.random()*800;
        const bg = ctx.createGain(); bg.gain.value = 0.015;
        src.connect(bf); bf.connect(bg); bg.connect(rev);
        src.start();
        setTimeout(bubble, 300 + Math.random() * 2000);
      }
      setTimeout(bubble, 1000);
    }
  };

  // mood → track mapping (extended)
  moodTrackMap['mystery'] = 'mystery';
  moodTrackMap['train']   = 'mystery';
  moodTrackMap['thriller']= 'deep';
  moodTrackMap['ocean']   = 'deep';
  moodTrackMap['deep']    = 'deep';

  // ── RAIN TRACK — soft rain + thunder rumbles ──
  tracks.rain = {
    name: '🌧️ Rainy Evening',
    build(g) {
      const rev = createReverb(3);
      rev.connect(g);

      // Heavy rain — white noise + bandpass
      const rain = createNoise('white');
      const rf   = ctx.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 1200; rf.Q.value = 0.3;
      const rg   = ctx.createGain(); rg.gain.value = 0.12;
      rain.connect(rf); rf.connect(rg); rg.connect(g);
      rain.start(); noiseNode = rain;

      // Soft low rumble (distant thunder)
      const rumble = createNoise('brown');
      const rlp    = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 80;
      const rRumbleG = ctx.createGain(); rRumbleG.gain.value = 0.05;
      rumble.connect(rlp); rlp.connect(rRumbleG); rRumbleG.connect(g);
      rumble.start(); oscillators.push(rumble);

      // Occasional thunder
      function thunder() {
        if (!isPlaying) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2.5, ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          d[i] = (Math.random()*2-1) * Math.exp(-i / (ctx.sampleRate * 0.8)) * 0.6;
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        const tf  = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 200;
        const tg  = ctx.createGain(); tg.gain.value = 0.35;
        src.connect(tf); tf.connect(tg); tg.connect(rev);
        src.start();
        setTimeout(thunder, 12000 + Math.random() * 20000);
      }
      setTimeout(thunder, 6000 + Math.random() * 8000);

      // Soft piano drops (rain-like single notes)
      const pianoNotes = [261.6, 293.7, 329.6, 392, 440];
      function rainDrop() {
        if (!isPlaying) return;
        const freq = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];
        const osc  = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq * 2;
        const og   = ctx.createGain();
        og.gain.setValueAtTime(0.03, ctx.currentTime);
        og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc.connect(og); og.connect(rev);
        osc.start(); osc.stop(ctx.currentTime + 2);
        setTimeout(rainDrop, 800 + Math.random() * 3000);
      }
      setTimeout(rainDrop, 1500);
    }
  };

  // ── TAVERN TRACK — warm cozy medieval inn ──
  tracks.tavern = {
    name: '🍺 Warm Tavern',
    build(g) {
      const rev = createReverb(2);
      rev.connect(g);

      // Warm bass drone (hearth)
      [110, 165, 220].forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
        const og  = ctx.createGain();
        og.gain.setValueAtTime(0, ctx.currentTime);
        og.gain.linearRampToValueAtTime(0.04 - i * 0.01, ctx.currentTime + 4);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12 + i * 0.05;
        const lg  = ctx.createGain(); lg.gain.value = freq * 0.004;
        lfo.connect(lg); lg.connect(osc.frequency);
        osc.connect(og); og.connect(rev);
        osc.start(); lfo.start();
        oscillators.push(osc, lfo);
      });

      // Merry lute-like melody
      const scale = [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3];
      let mIdx = 0;
      const pattern = [0, 2, 4, 5, 4, 2, 0, 3, 5, 4, 2, 1];
      function luteNote() {
        if (!isPlaying) return;
        const freq = scale[pattern[mIdx % pattern.length]];
        const osc  = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq * 2;
        const og   = ctx.createGain();
        og.gain.setValueAtTime(0.06, ctx.currentTime);
        og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(og); og.connect(rev);
        osc.start(); osc.stop(ctx.currentTime + 0.7);
        mIdx++;
        setTimeout(luteNote, 200 + Math.random() * 100);
      }
      setTimeout(luteNote, 1000);

      // Crowd murmur (filtered brown noise)
      const crowd = createNoise('brown');
      const cf    = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 400; cf.Q.value = 0.5;
      const cg    = ctx.createGain(); cg.gain.value = 0.03;
      crowd.connect(cf); cf.connect(cg); cg.connect(g);
      crowd.start(); oscillators.push(crowd);

      // Occasional clinking glasses
      function clink() {
        if (!isPlaying) return;
        const freq = 1400 + Math.random() * 800;
        const osc  = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const og   = ctx.createGain();
        og.gain.setValueAtTime(0.08, ctx.currentTime);
        og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(og); og.connect(rev);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
        setTimeout(clink, 4000 + Math.random() * 8000);
      }
      setTimeout(clink, 3000);
    }
  };

  moodTrackMap['rain']   = 'rain';
  moodTrackMap['tavern'] = 'tavern';
  moodTrackMap['cozy']   = 'tavern';

  // ── MANUAL SONG SELECT (from dropdown) ──
  let manualTrack = null;

  function selectSong(value) {
    if (!initialized) return;
    if (value === 'auto') {
      manualTrack = null;
      return;
    }
    manualTrack = value;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    playTrack(value);
    if (!isPlaying) { isPlaying = true; updateUI(); }
  }

  const origSetMood = setMood;
  function setMoodOverride(mood) {
    if (manualTrack) return; // user chose a song manually — don't override
    origSetMood(mood);
  }

  function startWithUserGesture() {
    if (initialized) return;
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    playTrack('default');
    isPlaying = true;
    updateUI();
    document.getElementById('music-bar')?.classList.remove('hidden');
  }

  return { init, toggle, setMood: setMoodOverride, setVolume, toggleSfx, sfx, startWithUserGesture, moodTrackMap, selectSong };
})();
