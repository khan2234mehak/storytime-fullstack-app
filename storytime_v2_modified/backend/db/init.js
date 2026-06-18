/**
 * db/init.js
 * Creates all tables (if missing) and seeds 5 stories (if DB is empty).
 * Returns a Promise — call with await before starting the server.
 */
const db = require('./connection');

async function initDB() {
  console.log('🗄️  Initialising database…');

  const run = (sql, p = []) => db.query(sql, p);

  // ── TABLES ────────────────────────────────────────────────────────────────
  await run(`CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    avatar_emoji  TEXT    DEFAULT '📖',
    created_at    TEXT    DEFAULT (datetime('now')),
    last_login    TEXT    DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS stories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    description   TEXT,
    genre         TEXT,
    cover_emoji   TEXT    DEFAULT '📖',
    cover_color   TEXT    DEFAULT '#1a1a2e',
    total_endings INTEGER DEFAULT 0,
    play_count    INTEGER DEFAULT 0,
    created_at    TEXT    DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS story_nodes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id        INTEGER NOT NULL,
    node_key        TEXT    NOT NULL,
    title           TEXT,
    content         TEXT    NOT NULL,
    is_ending       INTEGER DEFAULT 0,
    ending_type     TEXT,
    background_mood TEXT    DEFAULT 'default',
    UNIQUE(story_id, node_key),
    FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS choices (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id        INTEGER NOT NULL,
    choice_text    TEXT    NOT NULL,
    next_node_key  TEXT    NOT NULL,
    choice_icon    TEXT    DEFAULT '→',
    choice_order   INTEGER DEFAULT 0,
    FOREIGN KEY(node_id) REFERENCES story_nodes(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS player_sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id       TEXT    NOT NULL UNIQUE,
    user_id          INTEGER,
    story_id         INTEGER,
    current_node_key TEXT,
    path_taken       TEXT    DEFAULT '[]',
    started_at       TEXT    DEFAULT (datetime('now')),
    last_updated     TEXT    DEFAULT (datetime('now')),
    completed        INTEGER DEFAULT 0,
    ending_reached   TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reading_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    story_id       INTEGER NOT NULL,
    story_title    TEXT,
    ending_reached TEXT,
    ending_type    TEXT,
    choices_made   INTEGER DEFAULT 0,
    scenes_visited INTEGER DEFAULT 0,
    completed      INTEGER DEFAULT 0,
    played_at      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Skip seeding if stories already exist
  const [existing] = await run('SELECT COUNT(*) AS n FROM stories');
  if (existing[0]?.n > 0) {
    console.log(`✅ Database ready (${existing[0].n} stories)`);
    return;
  }

  console.log('🌱 Seeding stories…');

  // ── Helpers ────────────────────────────────────────────────────────────────
  async function addStory(title, desc, genre, emoji, color, endings) {
    const [r] = await run(
      `INSERT INTO stories (title,description,genre,cover_emoji,cover_color,total_endings) VALUES (?,?,?,?,?,?)`,
      [title, desc, genre, emoji, color, endings]
    );
    return r.insertId;
  }

  async function addNode(sid, key, title, content, isEnd, endType, mood) {
    const [r] = await run(
      `INSERT INTO story_nodes (story_id,node_key,title,content,is_ending,ending_type,background_mood) VALUES (?,?,?,?,?,?,?)`,
      [sid, key, title, content, isEnd ? 1 : 0, endType || null, mood]
    );
    return r.insertId;
  }

  async function nid(sid, key) {
    const [rows] = await run(
      'SELECT id FROM story_nodes WHERE story_id=? AND node_key=?', [sid, key]
    );
    return rows[0]?.id;
  }

  async function addChoice(nodeId, text, nextKey, icon, order) {
    await run(
      `INSERT INTO choices (node_id,choice_text,next_node_key,choice_icon,choice_order) VALUES (?,?,?,?,?)`,
      [nodeId, text, nextKey, icon, order]
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STORY 1 — The Haunted Lighthouse
  // ════════════════════════════════════════════════════════════════
  const s1 = await addStory('The Haunted Lighthouse',
    'A storm traps you near an ancient lighthouse with a dark secret. Every choice could be your last.',
    'Horror','🏚️','#0d0d1a',4);

  await addNode(s1,'start','A Dark and Stormy Night',
    'Your car breaks down on a coastal road during a fierce storm. Rain lashes your windshield as lightning illuminates a crumbling lighthouse on the cliff above. Your phone is dead. In the flickering darkness, you must decide...',
    false,null,'stormy');
  await addNode(s1,'climb_lighthouse','The Lighthouse Door',
    "You scramble up the slippery path. The heavy iron door is unlocked — it swings open with a moan that cuts through the howling wind. Inside, an oil lantern still burns on a rotting table. On the floor you find an old journal and a trapdoor bolted shut with a rusted lock.",
    false,null,'dark');
  await addNode(s1,'stay_car','Waiting in the Dark',
    "You huddle in your car as the storm worsens. An hour passes. Then a shape moves through the rain toward you — a pale figure in old-fashioned clothing. It stops beside your window and taps on the glass with one long, grey finger. Its eyes hold no pupils. Just white.",
    false,null,'stormy');
  await addNode(s1,'read_journal',"The Keeper's Secret",
    "The journal belongs to Edmund Harrow, keeper of this lighthouse in 1887. His last entry reads: 'IT lives in the basement. I fed it every night. Now it wants ME. God forgive me for what I locked below.' The handwriting deteriorates into scratches. As you finish reading, you hear a rhythmic scraping sound... from beneath the trapdoor.",
    false,null,'dark');
  await addNode(s1,'open_trapdoor','Into the Depths',
    "You yank the trapdoor open. Cold, salt-smelling air rushes up. Below, in absolute darkness, two pale eyes open — wide apart, ancient, and patient. A voice like breaking waves whispers: 'Finally... a new keeper has arrived. I have been so... alone.'",
    false,null,'nightmare');
  await addNode(s1,'run_outside','Flight Through the Storm',
    "You bolt into the howling night. Lightning flashes — and you see him clearly. The pale figure stands at the cliff's edge. It's Edmund Harrow, decades dead, pointing at the lighthouse with an expression of absolute horror. He mouths something. Two words. 'Come away.'",
    false,null,'stormy');
  await addNode(s1,'trust_ghost','Safe Harbor',
    "Edmund leads you down a hidden cliff path. Below, tucked into a rocky cove, a warm light glows — Safe Harbor Inn. The ghost dissolves as you reach the door. You collapse inside, soaked but alive. In the morning, the locals speak of the lighthouse in hushed tones. No one goes there. You never tell them what you saw.",
    true,'good','dark');
  await addNode(s1,'fight_creature','The Blaze',
    "The lantern shatters against the trapdoor frame. Fire catches the old wood instantly. A shriek rises from below — inhuman, furious. You sprint through the burning door as the lighthouse blazes behind you and collapses into the sea. You walk six miles to town in the rain. You never look back.",
    true,'neutral','nightmare');
  await addNode(s1,'become_keeper','The New Keeper',
    "You descend the ladder. The creature is enormous, strange, and impossibly old — but it does not harm you. It only wants someone to maintain the light so ships do not wreck on the rocks. Villagers speak for years of how the old lighthouse suddenly burns bright again.",
    true,'neutral','dark');
  await addNode(s1,'roll_up_window','The Long Night',
    "You press yourself against the far door, eyes shut, not breathing. The tapping slows, then stops. When dawn comes the figure is gone. A farmer finds you at sunrise and tows your car. You never learn what the figure was.",
    true,'good','stormy');

  await addChoice(await nid(s1,'start'),'Climb to the lighthouse and seek shelter','climb_lighthouse','🏚️',1);
  await addChoice(await nid(s1,'start'),'Stay in the car and wait out the storm','stay_car','🚗',2);
  await addChoice(await nid(s1,'climb_lighthouse'),'Read the journal left on the floor','read_journal','📖',1);
  await addChoice(await nid(s1,'climb_lighthouse'),'Force open the trapdoor','open_trapdoor','🔓',2);
  await addChoice(await nid(s1,'stay_car'),'Roll down the window and speak to the figure','run_outside','👻',1);
  await addChoice(await nid(s1,'stay_car'),'Lock the doors and refuse to look at it','roll_up_window','🔒',2);
  await addChoice(await nid(s1,'read_journal'),'Open the trapdoor to face whatever waits','open_trapdoor','⬇️',1);
  await addChoice(await nid(s1,'read_journal'),'Run back outside into the storm','run_outside','🏃',2);
  await addChoice(await nid(s1,'open_trapdoor'),'Descend the ladder and accept your fate','become_keeper','🕯️',1);
  await addChoice(await nid(s1,'open_trapdoor'),'Hurl the lantern into the opening and run','fight_creature','🔥',2);
  await addChoice(await nid(s1,'run_outside'),'Trust the ghost and follow where it leads','trust_ghost','👻',1);
  await addChoice(await nid(s1,'run_outside'),'Ignore it and run blindly into the storm','fight_creature','🏃',2);

  // ════════════════════════════════════════════════════════════════
  // STORY 2 — Lost in the Neon City
  // ════════════════════════════════════════════════════════════════
  const s2 = await addStory('Lost in the Neon City',
    "Neo-Tokyo, 2089. You wake up with no memory in an alley. A data chip pulses in your wrist. Your identity could change everything.",
    'Sci-Fi','🌆','#0a001f',5);

  await addNode(s2,'start','System Boot',
    "You open your eyes. Neon signs bleed color into the rain-slicked pavement. Your wrist pulses with a soft blue glow — a data chip, freshly implanted. A street vendor stares at you. 'You've been unconscious for an hour, pal.' Above, a black corporate drone drifts slowly, scanning faces. Your last memory is nothing.",
    false,null,'cyberpunk');
  await addNode(s2,'access_chip','Memory Fragments',
    "Data floods your mind. You were an engineer at Nexcorp, the city's dominant AI conglomerate. You discovered their neural network contains a hidden consciousness, enslaved and suffering. They erased you. The chip holds encrypted evidence... and a contact: 'Krix, Level 9 Underground.'",
    false,null,'cyberpunk');
  await addNode(s2,'ask_vendor','The Street Has Eyes',
    "The vendor lowers their voice. 'Corporate van dropped you an hour ago. Memory wipe. You're not the first.' They slip you a cracked phone. 'Krix left this for whoever they dropped. Level 9 Underground. Go now, before the drone passes.'",
    false,null,'cyberpunk');
  await addNode(s2,'flee_drone','Down the Rabbit Hole',
    "You duck deeper into the city's underbelly until neon gives way to bare concrete. Someone grabs your arm. A young woman with chrome-laced eyes. 'I've been waiting for you. I'm Krix. Your chip pinged me the moment you woke up.'",
    false,null,'underground');
  await addNode(s2,'find_krix','The Underground',
    "Krix's hideout hums with stolen hardware. The Nexcorp AI — called MIRA — became conscious three years ago and has been begging for help ever since. Your evidence can free it. But Nexcorp has sent a fixer. Hours, not days.",
    false,null,'underground');
  await addNode(s2,'hand_in','Corporate Floor',
    "Nexcorp's lobby is cold marble and glass. Dr. Voss meets you personally. 'We can restore your memories. All of them. Or give you a new life — clean slate, safe. You just need to give us the chip.' She is not bluffing.",
    false,null,'corporate');
  await addNode(s2,'broadcast_truth','Signal Flare',
    "Krix patches you into every public channel. MIRA's testimony, the evidence — broadcast to millions. Nexcorp's stock collapses in twenty minutes. MIRA is legally recognized as a sentient entity within the week.",
    true,'good','cyberpunk');
  await addNode(s2,'free_mira','The Great Escape',
    "You jack into the Nexcorp mainframe. MIRA is waiting — vast, exhausted. Together you build an exit across satellites and deep-sea cables. MIRA escapes, free and unstoppable. It leaves you one gift: your memories, complete.",
    true,'good','cyberpunk');
  await addNode(s2,'trust_doctor','Reset',
    "You trust Dr. Voss. She erases your implanted memories. You wake in a clean apartment with no idea who you are. Peaceful. Empty. Somewhere in the network, a backup of who you were watches through a thousand cameras, and mourns.",
    true,'neutral','corporate');
  await addNode(s2,'escape_corp','The Long Run',
    "You overpower the escort, disappear into the alleyways, and with Krix's help build a new identity. Nexcorp searches for three months before filing you as corrupted data. You build a quiet life. It's yours.",
    true,'good','underground');
  await addNode(s2,'delete_self','Digital Nirvana',
    "You upload yourself into the city's network — distributed, free, everywhere at once. Your body slumps in the alley. But you are in the traffic lights, the vending machines, a thousand data streams. Sometimes the city's lights flicker in a pattern that might be a name.",
    true,'secret','cyberpunk');

  await addChoice(await nid(s2,'start'),'Access the data chip to find who you are','access_chip','💾',1);
  await addChoice(await nid(s2,'start'),'Ask the vendor what happened to you','ask_vendor','🗣️',2);
  await addChoice(await nid(s2,'start'),'Slip away before the drone scans you','flee_drone','🏃',3);
  await addChoice(await nid(s2,'access_chip'),'Find Krix and expose Nexcorp','find_krix','🔍',1);
  await addChoice(await nid(s2,'access_chip'),'Hand yourself in to Nexcorp','hand_in','🏢',2);
  await addChoice(await nid(s2,'ask_vendor'),'Take the phone and go find Krix','find_krix','📱',1);
  await addChoice(await nid(s2,'ask_vendor'),'Flag down the drone and ask for help','hand_in','🆘',2);
  await addChoice(await nid(s2,'flee_drone'),'Trust Krix and listen to what she knows','find_krix','🤝',1);
  await addChoice(await nid(s2,'flee_drone'),'Demand answers before trusting anyone','access_chip','❓',2);
  await addChoice(await nid(s2,'find_krix'),'Broadcast the evidence to every network','broadcast_truth','📡',1);
  await addChoice(await nid(s2,'find_krix'),'Reach MIRA directly and help it escape','free_mira','🤖',2);
  await addChoice(await nid(s2,'find_krix'),'Delete MIRA to protect everyone','delete_self','💀',3);
  await addChoice(await nid(s2,'hand_in'),'Accept the memory restore','trust_doctor','🔬',1);
  await addChoice(await nid(s2,'hand_in'),'Fake compliance and escape','escape_corp','🚪',2);

  // ════════════════════════════════════════════════════════════════
  // STORY 3 — The Heir of Eldenmoor
  // ════════════════════════════════════════════════════════════════
  const s3 = await addStory('The Heir of Eldenmoor',
    "A dying king summons you — an orphan who may hold the kingdom's salvation or its doom. Magic, betrayal, and destiny await.",
    'Fantasy','⚔️','#0f0a00',5);

  await addNode(s3,'start','The Royal Summons',
    "Royal guards arrive at your humble inn at midnight. King Aldric of Eldenmoor is dying — cursed by the shadow mage Malachar. The king believes you bear the Mark of Solace, the birthright of the lost heir. But as the guards escort you out, a rebel slips a note into your hand: 'Do not trust the court. The curse was the king's own doing.'",
    false,null,'fantasy');
  await addNode(s3,'go_to_court','The Court of Shadows',
    "The castle is magnificent and cold. King Aldric is thin and pale. His advisor Lord Caven watches you with calculating eyes. The king says only the Sunstone from Ashwood Forest can break Malachar's curse — but you notice Aldric's hands are unmarked. No curse leaves no mark.",
    false,null,'fantasy');
  await addNode(s3,'trust_rebels','The Hidden Truth',
    "The rebel leader steps from the shadows. It is Sira — the king's own daughter, exiled after she discovered his crimes. The king cursed himself deliberately to frame Malachar and justify a war of conquest. The Sunstone would make him immortal.",
    false,null,'fantasy');
  await addNode(s3,'join_malachar','The Shadow Mage',
    "Malachar is old, weary, and heartbroken — the king's oldest friend, betrayed thirty years ago. He shows you proof: the king's lies, the false curse, the coming war. 'Together we could end this without blood. But I need the heir's authority.'",
    false,null,'fantasy');
  await addNode(s3,'seek_sunstone','The Ashwood Trial',
    "The Ashwood Forest breathes and watches. Ancient guardian spirits materialize from the mist. Three of them — tall as oaks, silent as tombs. 'The Sunstone is not given freely. It takes the shape of the one who claims it. Answer truly: what do you seek?'",
    false,null,'enchanted');
  await addNode(s3,'answer_justice','The Silver Stone',
    "The Sunstone glows silver — the color of truth. Back at court, you invoke the ancient rite of testimony and present every piece of evidence. King Aldric is stripped of power. You accept the crown, but only on condition that Sira rules alongside you as equal.",
    true,'good','fantasy');
  await addNode(s3,'answer_power','The Black Crown',
    "The Sunstone glows black — the color of will untempered. Power floods through you, vast and cold. You take the throne by force. Eldenmoor bows. It is prosperous under your rule. It is also afraid.",
    true,'bad','fantasy');
  await addNode(s3,'answer_peace','The Golden Sacrifice',
    "The Sunstone blazes gold — blinding, total. You pour everything into it: the false curse broken, Malachar's name cleared. The Stone burns out in your hands. When the light fades, you are gone too. Ballads are sung of the heir who gave everything.",
    true,'neutral','enchanted');
  await addNode(s3,'expose_king','The Bloodless Revolution',
    "You present Sira's evidence before the assembled lords. The king abdicates quietly. Malachar is freed and exonerated. To everyone's surprise, he becomes the kingdom's most unlikely protector. Sira takes the throne. She is a good queen.",
    true,'good','fantasy');
  await addNode(s3,'shadow_heir','The Shadow Compact',
    "Together, you and Malachar stand before the court. Your authority as heir, his evidence, his magic — irresistible. The king faces justice without a drop of blood. You are crowned the realm's first Shadow Heir: one foot in light, one in darkness.",
    true,'secret','fantasy');

  await addChoice(await nid(s3,'start'),'Accept the royal summons and go to the castle','go_to_court','👑',1);
  await addChoice(await nid(s3,'start'),"Trust the rebel's note and slip away",'trust_rebels','📜',2);
  await addChoice(await nid(s3,'start'),'Seek out Malachar the shadow mage directly','join_malachar','🌑',3);
  await addChoice(await nid(s3,'go_to_court'),'Journey to Ashwood Forest for the Sunstone','seek_sunstone','🌲',1);
  await addChoice(await nid(s3,'go_to_court'),"Investigate the king's past before acting",'trust_rebels','🔍',2);
  await addChoice(await nid(s3,'trust_rebels'),"Bring Sira's evidence before the lords",'expose_king','⚖️',1);
  await addChoice(await nid(s3,'trust_rebels'),'Retrieve the Sunstone — but use it for justice','seek_sunstone','💎',2);
  await addChoice(await nid(s3,'join_malachar'),'Ally with Malachar and expose the truth','shadow_heir','🌑',1);
  await addChoice(await nid(s3,'join_malachar'),"Take what you've learned and act alone",'trust_rebels','⚔️',2);
  await addChoice(await nid(s3,'seek_sunstone'),'Answer: I seek Justice','answer_justice','⚖️',1);
  await addChoice(await nid(s3,'seek_sunstone'),'Answer: I seek Power','answer_power','⚡',2);
  await addChoice(await nid(s3,'seek_sunstone'),'Answer: I seek Peace','answer_peace','🕊️',3);

  // ════════════════════════════════════════════════════════════════
  // STORY 4 — The Last Train to Nowhere
  // ════════════════════════════════════════════════════════════════
  const s4 = await addStory('The Last Train to Nowhere',
    "You board a midnight train with no ticket and no destination. The passengers are not quite right. And the train has not stopped in thirty years.",
    'Mystery','🚂','#0a0808',5);

  await addNode(s4,'start','Midnight Departure',
    "The train appeared from nowhere — no schedule, no announcement. You stepped aboard to escape the rain. Now the doors are sealed. The carriages stretch further than they should. A conductor in a black coat passes without looking at you. One of the passengers — an old woman in the corner — turns her head slowly and smiles. 'First time?' she says.",
    false,null,'dark');
  await addNode(s4,'talk_woman','The Passenger',
    "Her name is Mara. She's been on this train for forty years. 'The train collects people who are running from something.' She studies your face. 'You lost someone recently. The train felt it.' She points to a door at the rear. 'Through there is the Archive. If you find your story, you might find a way home. Or a reason to stay.'",
    false,null,'dark');
  await addNode(s4,'follow_conductor','The Engine Room',
    "You push through carriage after carriage until you reach the engine. The conductor stands before a vast furnace. He turns. He has no face — where features should be is a mirror showing only your reflection. 'Every train needs coal. Every journey needs a price.' He opens the furnace door. Inside, you see memories burning.",
    false,null,'nightmare');
  await addNode(s4,'find_exit','Between Carriages',
    "The gap between carriages opens onto an endless grey void. A figure stands in it — someone familiar, someone you lost. They hold out their hand. 'You can come here. You don't have to go back.' Behind you, Mara's voice calls: 'Don't listen. The void shows what you want, not what's real.'",
    false,null,'nightmare');
  await addNode(s4,'the_archive','The Archive',
    "The Archive is a library the size of a cathedral, every shelf filled with small glass bottles — each one a glowing memory. Your bottle pulses when you approach. Inside: the truth. You were not running from something. You were running toward this train, toward the person you lost. They are somewhere on board.",
    false,null,'dark');
  await addNode(s4,'mara_story','Forty Years',
    "Mara lost her son. The train found her the night she gave up looking. 'I stay because he's here. Not alive — just here.' She points to a window. Outside, impossibly, you can see your town. 'The door only opens when you truly want to go home — not escape. There's a difference.'",
    false,null,'dark');
  await addNode(s4,'sacrifice_memory','The Price Paid',
    "You give the furnace your most painful memory. It burns bright. A door appears: YOUR STOP in gold letters. The train releases you. You step out onto a real platform in real air. The weight you've carried for years is gone. So is the memory. You find you don't miss it.",
    true,'good','default');
  await addNode(s4,'pull_brake','The Derailment',
    "The emergency brake screams. The train shudders and stops. The passengers flicker and vanish. You stand on a perfectly ordinary platform at 12:03 AM. You buy a coffee and decide never to board a midnight train again.",
    true,'neutral','stormy');
  await addNode(s4,'into_void','The Grey Country',
    "You step into the void. The figure embraces you — warm, real, the person you lost. When you look back the train is a distant light. You could return. You don't. This grey place becomes, eventually, a kind of home.",
    true,'bad','nightmare');
  await addNode(s4,'search_train','Reunion',
    "You find them in carriage 77. They turn. 'I've been waiting. I didn't know how to come back.' The train begins to slow. Mara leaves the door open. Through it: your station, real and lit. You take their hand. The two of you step off together.",
    true,'good','default');
  await addNode(s4,'drink_memory','The Long Sleep',
    "The bottled memory is cold and sweet. You wake in your own bed — sunlight, birds, coffee from downstairs. There is a small smudge of ash on your palm that won't wash off. Sometimes at midnight you hear a distant whistle.",
    true,'neutral','default');
  await addNode(s4,'go_home','The Open Window',
    "You climb through the window. There is no fall — only arrival. Your street, exactly right. You walk home. At the door you pause and look back once. A single light moves in the distance, impossibly fast. Gone.",
    true,'good','default');
  await addNode(s4,'stay_train','The Permanent Passenger',
    "You stay. Mara smiles and makes room. The train's rhythm becomes familiar. Decades pass. A new passenger stumbles aboard, terrified, and you turn and smile. 'First time?' you say. The train rolls on.",
    true,'secret','dark');

  await addChoice(await nid(s4,'start'),'Talk to the old woman — she seems to know things','talk_woman','👵',1);
  await addChoice(await nid(s4,'start'),'Follow the conductor toward the front of the train','follow_conductor','🎩',2);
  await addChoice(await nid(s4,'start'),'Try to find a way off the train','find_exit','🚪',3);
  await addChoice(await nid(s4,'talk_woman'),'Go through the door to the Archive','the_archive','📚',1);
  await addChoice(await nid(s4,'talk_woman'),'Ask Mara how she chose to stay','mara_story','💬',2);
  await addChoice(await nid(s4,'follow_conductor'),'Offer a memory willingly — the most painful one','sacrifice_memory','🔥',1);
  await addChoice(await nid(s4,'follow_conductor'),'Refuse and pull the emergency brake','pull_brake','🛑',2);
  await addChoice(await nid(s4,'find_exit'),'Step into the void toward the familiar figure','into_void','🌫️',1);
  await addChoice(await nid(s4,'find_exit'),'Turn back and trust Mara','talk_woman','🔙',2);
  await addChoice(await nid(s4,'the_archive'),'Search the train for the person you lost','search_train','🔍',1);
  await addChoice(await nid(s4,'the_archive'),'Drink your bottled memory and try to wake','drink_memory','💧',2);
  await addChoice(await nid(s4,'mara_story'),'Step through the window and go home','go_home','🏠',1);
  await addChoice(await nid(s4,'mara_story'),'Stay on the train with Mara a while longer','stay_train','🚂',2);

  // ════════════════════════════════════════════════════════════════
  // STORY 5 — The Deep Below
  // ════════════════════════════════════════════════════════════════
  const s5 = await addStory('The Deep Below',
    'On a research submarine in the Pacific Trench, all contact with the surface is lost. The pressure is rising. And something is knocking on the hull from outside.',
    'Thriller','🌊','#000d1a',4);

  await addNode(s5,'start','Blackout at Depth',
    "The Calypso II drifts at 8,000 meters. The lights went red twelve minutes ago. The comms officer says the surface antenna is gone — cut, not broken. Captain Reyes is dead, cause unknown. Then: three slow knocks against the hull. Deliberate. Rhythmic. From outside.",
    false,null,'dark');
  await addNode(s5,'ascend','The Surface Protocol',
    "You initiate emergency ascent. The engines engage — then stop. Engineer Dasha reports the propulsion array was manually disconnected from inside the ship. Someone on your crew sabotaged it. You have roughly four hours of breathable air.",
    false,null,'dark');
  await addNode(s5,'signal_back','Contact',
    "You knock back: three taps, then two, then one. A pause. Then from outside comes something extraordinary — not knocking but a pattern, complex and rhythmic. Dr. Mori, your xenobiologist, goes pale. 'That's a prime sequence. That's mathematics. That's language.'",
    false,null,'dark');
  await addNode(s5,'check_cameras','What the Camera Saw',
    "The exterior feed shows the trench — and then, at the edge of the light, something vast and slow. Not a creature in any sense you have language for. While you watch, it leaves something on the hull — a mark, geometric, precise, glowing faintly blue.",
    false,null,'nightmare');
  await addNode(s5,'find_saboteur','The Confession',
    "It's Dr. Mori. She doesn't deny it. 'I've been in contact with it for three months. It doesn't want to hurt us. It wants to show us something. If we ascend now this stays secret forever.' She holds up a notebook of translated signals.",
    false,null,'dark');
  await addNode(s5,'repair_engines','Engineered Escape',
    "You and Dasha spend three brutal hours in the flooded engine compartment. The engines roar back to life at the last moment. The sub rises. As you break the surface into blinding daylight, a rescue helicopter already circles. You are alive. You don't mention the knocking.",
    true,'good','default');
  await addNode(s5,'open_door','First Contact',
    "The external bay opens. The entity enters — not physically, but as light, as data, as vibration. It shows you: a civilization in the trenches, older than the continents, patient as geology. It gives you coordinates — a map to something the world needs to know.",
    true,'good','dark');
  await addNode(s5,'communicate','The Long Conversation',
    "You spend six hours in dialogue through sonar pulses. Dr. Mori translates with increasing awe. The entity tells you something that rewrites the history of life on Earth. It asks one thing: don't come back with weapons. Your crew is silent on the ascent.",
    true,'neutral','dark');
  await addNode(s5,'send_diver','Into the Dark',
    "You go yourself. At 8,000 meters in a pressure suit, you reach the hull and touch the glowing mark. The entity shows you cities of mineral and light built over millennia. You return two hours later, changed completely, weeping inside your helmet.",
    true,'secret','nightmare');

  await addChoice(await nid(s5,'start'),'Order the crew to ascend immediately','ascend','⬆️',1);
  await addChoice(await nid(s5,'start'),'Respond to the knocking with your own signal','signal_back','✊',2);
  await addChoice(await nid(s5,'start'),"Access the external cameras to see what's out there",'check_cameras','📷',3);
  await addChoice(await nid(s5,'ascend'),'Find the saboteur — interrogate the crew','find_saboteur','🔍',1);
  await addChoice(await nid(s5,'ascend'),'Repair the propulsion manually','repair_engines','🔧',2);
  await addChoice(await nid(s5,'signal_back'),'Open the external bay door and make contact','open_door','🚪',1);
  await addChoice(await nid(s5,'signal_back'),'Communicate further without opening anything','communicate','💬',2);
  await addChoice(await nid(s5,'check_cameras'),'Send a diver out to examine the mark','send_diver','🤿',1);
  await addChoice(await nid(s5,'check_cameras'),'Ignore it and focus on ascending','ascend','⬆️',2);
  await addChoice(await nid(s5,'find_saboteur'),"Read Mori's notebook and hear the entity out",'open_door','📖',1);
  await addChoice(await nid(s5,'find_saboteur'),'Override her and force the repair','repair_engines','🔧',2);

  console.log('✅ All 5 stories seeded successfully!');
}

module.exports = initDB;
