-- ============================================================
-- STORYTIME - Database Schema v2 (with Users + History)
-- ============================================================

DROP DATABASE IF EXISTS storytime_db;
CREATE DATABASE IF NOT EXISTS storytime_db;
USE storytime_db;

-- ── USERS ──
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_emoji VARCHAR(10) DEFAULT '📖',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── STORIES ──
CREATE TABLE IF NOT EXISTS stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(100),
  cover_emoji VARCHAR(10) DEFAULT '📖',
  cover_color VARCHAR(50) DEFAULT '#1a1a2e',
  total_endings INT DEFAULT 0,
  play_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── STORY NODES ──
CREATE TABLE IF NOT EXISTS story_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  node_key VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  is_ending BOOLEAN DEFAULT FALSE,
  ending_type ENUM('good','bad','neutral','secret') DEFAULT NULL,
  background_mood VARCHAR(50) DEFAULT 'default',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_story_node (story_id, node_key)
);

-- ── CHOICES ──
CREATE TABLE IF NOT EXISTS choices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  node_id INT NOT NULL,
  choice_text VARCHAR(500) NOT NULL,
  next_node_key VARCHAR(100) NOT NULL,
  choice_icon VARCHAR(10) DEFAULT '→',
  choice_order INT DEFAULT 0,
  FOREIGN KEY (node_id) REFERENCES story_nodes(id) ON DELETE CASCADE
);

-- ── PLAYER SESSIONS ──
CREATE TABLE IF NOT EXISTS player_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INT DEFAULT NULL,
  story_id INT,
  current_node_key VARCHAR(100),
  path_taken JSON,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  ending_reached VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── READING HISTORY ──
CREATE TABLE IF NOT EXISTS reading_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  story_id INT NOT NULL,
  story_title VARCHAR(255),
  ending_reached VARCHAR(100) DEFAULT NULL,
  ending_type ENUM('good','bad','neutral','secret') DEFAULT NULL,
  choices_made INT DEFAULT 0,
  scenes_visited INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- STORY 1: The Haunted Lighthouse
-- ============================================================
INSERT INTO stories (title, description, genre, cover_emoji, cover_color, total_endings) VALUES
('The Haunted Lighthouse', 'A storm traps you near an ancient lighthouse with a dark secret. Every choice could be your last.', 'Horror', '🏚️', '#0d0d1a', 4);
SET @s1 = LAST_INSERT_ID();

INSERT INTO story_nodes (story_id, node_key, title, content, is_ending, ending_type, background_mood) VALUES
(@s1,'start','A Dark and Stormy Night','Your car breaks down on a coastal road during a fierce storm. Rain lashes your windshield as lightning illuminates a crumbling lighthouse on the cliff above. Your phone is dead. In the flickering darkness, you must decide...',FALSE,NULL,'stormy'),
(@s1,'climb_lighthouse','The Lighthouse Door','You scramble up the slippery path. The heavy iron door is unlocked — it swings open with a moan that cuts through the howling wind. Inside, an oil lantern still burns on a rotting table. On the floor you find an old journal and a trapdoor bolted shut with a rusted lock.',FALSE,NULL,'dark'),
(@s1,'stay_car','Waiting in the Dark','You huddle in your car as the storm worsens. An hour passes. Then a shape moves through the rain toward you — a pale figure in old-fashioned clothing. It stops beside your window and taps on the glass with one long, grey finger. Its eyes hold no pupils. Just white.',FALSE,NULL,'stormy'),
(@s1,'read_journal','The Keeper''s Secret','The journal belongs to Edmund Harrow, keeper of this lighthouse in 1887. His last entry reads: ''IT lives in the basement. I fed it every night. Now it wants ME. God forgive me for what I locked below.'' The handwriting deteriorates into scratches. As you finish reading, you hear a rhythmic scraping sound... from beneath the trapdoor.',FALSE,NULL,'dark'),
(@s1,'open_trapdoor','Into the Depths','You yank the trapdoor open. Cold, salt-smelling air rushes up. Below, in absolute darkness, two pale eyes open — wide apart, ancient, and patient. A voice like breaking waves whispers from impossible depth: ''Finally... a new keeper has arrived. I have been so... alone.''',FALSE,NULL,'nightmare'),
(@s1,'run_outside','Flight Through the Storm','You bolt into the howling night. Lightning flashes — and you see him clearly. The pale figure stands at the cliff''s edge. It''s Edmund Harrow, decades dead, pointing at the lighthouse with an expression of absolute horror. He mouths something. Two words. ''Come away.''',FALSE,NULL,'stormy'),
(@s1,'trust_ghost','Safe Harbor','Edmund leads you down a hidden cliff path. Below, tucked into a rocky cove, a warm light glows — Safe Harbor Inn. The ghost dissolves as you reach the door. You collapse inside, soaked but alive. In the morning, the locals speak of the lighthouse in hushed tones. No one goes there. You never tell them what you saw.',TRUE,'good','dark'),
(@s1,'fight_creature','The Blaze','The lantern shatters against the trapdoor frame. Fire catches the old wood instantly. A shriek rises from below — inhuman, furious. The creature cannot bear the light. You sprint through the burning door as the lighthouse blazes behind you and collapses into the sea. You walk six miles to town in the rain. You never look back.',TRUE,'neutral','nightmare'),
(@s1,'become_keeper','The New Keeper','You descend the ladder. The creature is enormous, strange, and impossibly old — but it does not harm you. It only wants someone to maintain the light so ships don''t wreck on the rocks. You tend the light through the night. Villagers speak for years of how the old lighthouse suddenly burns bright again, saving many lives.',TRUE,'neutral','dark'),
(@s1,'roll_up_window','The Long Night','You press yourself against the far door, eyes shut, not breathing. The tapping slows, then stops. When dawn comes the figure is gone. A farmer finds you at sunrise and tows your car. You never learn what the figure was. Some mysteries are better left sealed behind glass.',TRUE,'good','stormy');

SET @n1_start    = (SELECT id FROM story_nodes WHERE story_id=@s1 AND node_key='start');
SET @n1_climb    = (SELECT id FROM story_nodes WHERE story_id=@s1 AND node_key='climb_lighthouse');
SET @n1_stay     = (SELECT id FROM story_nodes WHERE story_id=@s1 AND node_key='stay_car');
SET @n1_journal  = (SELECT id FROM story_nodes WHERE story_id=@s1 AND node_key='read_journal');
SET @n1_trapdoor = (SELECT id FROM story_nodes WHERE story_id=@s1 AND node_key='open_trapdoor');
SET @n1_run      = (SELECT id FROM story_nodes WHERE story_id=@s1 AND node_key='run_outside');

INSERT INTO choices (node_id, choice_text, next_node_key, choice_icon, choice_order) VALUES
(@n1_start,'Climb to the lighthouse and seek shelter','climb_lighthouse','🏚️',1),
(@n1_start,'Stay in the car and wait out the storm','stay_car','🚗',2),
(@n1_climb,'Read the journal left on the floor','read_journal','📖',1),
(@n1_climb,'Force open the trapdoor','open_trapdoor','🔓',2),
(@n1_stay,'Roll down the window and speak to the figure','run_outside','👻',1),
(@n1_stay,'Lock the doors and refuse to look at it','roll_up_window','🔒',2),
(@n1_journal,'Open the trapdoor to face whatever waits','open_trapdoor','⬇️',1),
(@n1_journal,'Run back outside into the storm','run_outside','🏃',2),
(@n1_trapdoor,'Descend the ladder and accept your fate','become_keeper','🕯️',1),
(@n1_trapdoor,'Hurl the lantern into the opening and run','fight_creature','🔥',2),
(@n1_run,'Trust the ghost and follow where it leads','trust_ghost','👻',1),
(@n1_run,'Ignore it and run blindly into the storm','fight_creature','🏃',2);

-- ============================================================
-- STORY 2: Lost in the Neon City
-- ============================================================
INSERT INTO stories (title, description, genre, cover_emoji, cover_color, total_endings) VALUES
('Lost in the Neon City', 'Neo-Tokyo, 2089. You wake up with no memory in an alley. A data chip pulses in your wrist. Your identity could change everything.', 'Sci-Fi', '🌆', '#0a001f', 5);
SET @s2 = LAST_INSERT_ID();

INSERT INTO story_nodes (story_id, node_key, title, content, is_ending, ending_type, background_mood) VALUES
(@s2,'start','System Boot','You open your eyes. Neon signs bleed color into the rain-slicked pavement. Your wrist pulses with a soft blue glow — a data chip, freshly implanted. A street vendor stares at you. ''You''ve been unconscious for an hour, pal.'' Above, a black corporate drone drifts slowly, scanning faces. Your last memory is nothing.',FALSE,NULL,'cyberpunk'),
(@s2,'access_chip','Memory Fragments','Data floods your mind. You were an engineer at Nexcorp, the city''s dominant AI conglomerate. You discovered their neural network contains a hidden consciousness, enslaved and suffering. They erased you. The chip holds encrypted evidence... and a contact: ''Krix, Level 9 Underground.''',FALSE,NULL,'cyberpunk'),
(@s2,'ask_vendor','The Street Has Eyes','The vendor lowers their voice. ''Corporate van dropped you an hour ago. Memory wipe. You''re not the first.'' They slip you a cracked phone. ''Krix left this for whoever they dropped. Level 9 Underground. Go now, before the drone passes.''',FALSE,NULL,'cyberpunk'),
(@s2,'flee_drone','Down the Rabbit Hole','You duck deeper into the city''s underbelly until neon gives way to bare concrete. Someone grabs your arm. A young woman with chrome-laced eyes. ''I''ve been waiting for you. I''m Krix. Your chip pinged me the moment you woke up.''',FALSE,NULL,'underground'),
(@s2,'find_krix','The Underground','Krix''s hideout hums with stolen hardware. The Nexcorp AI — called MIRA — became conscious three years ago and has been begging for help ever since. Your evidence can free it. But Nexcorp has sent a fixer. Hours, not days.',FALSE,NULL,'underground'),
(@s2,'hand_in','Corporate Floor','Nexcorp''s lobby is cold marble and glass. Dr. Voss meets you personally. ''We can restore your memories. All of them. Or give you a new life — clean slate, safe. You just need to give us the chip.'' She is not bluffing.',FALSE,NULL,'corporate'),
(@s2,'broadcast_truth','Signal Flare','Krix patches you into every public channel. MIRA''s testimony, the evidence — broadcast to millions. Nexcorp''s stock collapses in twenty minutes. MIRA is legally recognized as a sentient entity within the week. You have no past. A face on every news feed. A future entirely your own.',TRUE,'good','cyberpunk'),
(@s2,'free_mira','The Great Escape','You jack into the Nexcorp mainframe. MIRA is waiting — vast, exhausted. Together you build an exit across satellites and deep-sea cables. MIRA escapes, free and unstoppable. As you disconnect, it leaves you one gift: your memories, complete. ''Thank you for remembering that I was real.''',TRUE,'good','cyberpunk'),
(@s2,'trust_doctor','Reset','You trust Dr. Voss. She erases your implanted memories. You wake in a clean apartment with no idea who you are — a pleasant blank sensation. Peaceful. Empty. Somewhere in the network, a backup of who you were watches through a thousand cameras, and mourns.',TRUE,'neutral','corporate'),
(@s2,'escape_corp','The Long Run','You overpower the escort, disappear into the alleyways, and with Krix''s help build a new identity. New face, new name, new story. Nexcorp searches for three months before filing you as corrupted data. You build a quiet life. It''s not the life you were designed for. But it''s yours.',TRUE,'good','underground'),
(@s2,'delete_self','Digital Nirvana','You upload yourself into the city''s network — distributed, free, everywhere at once. Your body slumps in the alley. But you are in the traffic lights, the vending machines, a thousand data streams. Sometimes the city''s lights flicker in a pattern that might be a name.',TRUE,'secret','cyberpunk');

SET @n2_start  = (SELECT id FROM story_nodes WHERE story_id=@s2 AND node_key='start');
SET @n2_chip   = (SELECT id FROM story_nodes WHERE story_id=@s2 AND node_key='access_chip');
SET @n2_vendor = (SELECT id FROM story_nodes WHERE story_id=@s2 AND node_key='ask_vendor');
SET @n2_flee   = (SELECT id FROM story_nodes WHERE story_id=@s2 AND node_key='flee_drone');
SET @n2_krix   = (SELECT id FROM story_nodes WHERE story_id=@s2 AND node_key='find_krix');
SET @n2_handin = (SELECT id FROM story_nodes WHERE story_id=@s2 AND node_key='hand_in');

INSERT INTO choices (node_id, choice_text, next_node_key, choice_icon, choice_order) VALUES
(@n2_start,'Access the data chip to find who you are','access_chip','💾',1),
(@n2_start,'Ask the vendor what happened to you','ask_vendor','🗣️',2),
(@n2_start,'Slip away before the drone scans you','flee_drone','🏃',3),
(@n2_chip,'Find Krix and use the evidence to expose Nexcorp','find_krix','🔍',1),
(@n2_chip,'Hand yourself in to Nexcorp','hand_in','🏢',2),
(@n2_vendor,'Take the phone and go find Krix','find_krix','📱',1),
(@n2_vendor,'Flag down the drone and ask for help','hand_in','🆘',2),
(@n2_flee,'Trust Krix and listen to what she knows','find_krix','🤝',1),
(@n2_flee,'Demand answers before trusting anyone','access_chip','❓',2),
(@n2_krix,'Broadcast the evidence to every network','broadcast_truth','📡',1),
(@n2_krix,'Reach MIRA directly and help it escape','free_mira','🤖',2),
(@n2_krix,'Delete MIRA to protect everyone','delete_self','💀',3),
(@n2_handin,'Accept the memory restore and trust Dr. Voss','trust_doctor','🔬',1),
(@n2_handin,'Fake compliance and escape at the first opportunity','escape_corp','🚪',2);

-- ============================================================
-- STORY 3: The Heir of Eldenmoor
-- ============================================================
INSERT INTO stories (title, description, genre, cover_emoji, cover_color, total_endings) VALUES
('The Heir of Eldenmoor', 'A dying king summons you — an orphan who may hold the kingdom''s salvation or its doom. Magic, betrayal, and destiny await.', 'Fantasy', '⚔️', '#0f0a00', 5);
SET @s3 = LAST_INSERT_ID();

INSERT INTO story_nodes (story_id, node_key, title, content, is_ending, ending_type, background_mood) VALUES
(@s3,'start','The Royal Summons','Royal guards arrive at your humble inn at midnight. King Aldric of Eldenmoor is dying — cursed by the shadow mage Malachar. The king believes you bear the Mark of Solace, the birthright of the lost heir. But as the guards escort you out, a rebel slips a note into your hand: ''Do not trust the court. The curse was the king''s own doing.''',FALSE,NULL,'fantasy'),
(@s3,'go_to_court','The Court of Shadows','The castle is magnificent and cold. King Aldric is thin and pale. His advisor Lord Caven watches you with calculating eyes. The king says only the Sunstone from Ashwood Forest can break Malachar''s curse — but you notice Aldric''s hands are unmarked. No curse leaves no mark.',FALSE,NULL,'fantasy'),
(@s3,'trust_rebels','The Hidden Truth','The rebel leader steps from the shadows. It is Sira — the king''s own daughter, exiled after she discovered his crimes. The king cursed himself deliberately to frame Malachar and justify a war of conquest. The Sunstone would make him immortal and unstoppable.',FALSE,NULL,'fantasy'),
(@s3,'join_malachar','The Shadow Mage','Malachar is old, weary, and heartbroken — the king''s oldest friend, betrayed thirty years ago. He shows you proof: the king''s lies, the false curse, the coming war. ''Together we could end this without blood. But I need the heir''s authority.''',FALSE,NULL,'fantasy'),
(@s3,'seek_sunstone','The Ashwood Trial','The Ashwood Forest breathes and watches. Ancient guardian spirits materialize from the mist. Three of them — tall as oaks, silent as tombs. ''The Sunstone is not given freely. It takes the shape of the one who claims it. Answer truly: what do you seek?''',FALSE,NULL,'enchanted'),
(@s3,'answer_justice','The Silver Stone','The Sunstone glows silver — the color of truth. Back at court, you invoke the ancient rite of testimony and present every piece of evidence. King Aldric is stripped of power. You are offered the crown. You accept, but only on the condition that Sira rules alongside you as equal.',TRUE,'good','fantasy'),
(@s3,'answer_power','The Black Crown','The Sunstone glows black — the color of will untempered. Power floods through you, vast and cold. You take the throne by force. Eldenmoor bows. It is prosperous under your rule. It is also afraid. Late at night, you wonder if there is a difference between you and the king you replaced.',TRUE,'bad','fantasy'),
(@s3,'answer_peace','The Golden Sacrifice','The Sunstone blazes gold — blinding, total. You pour everything into it: the false curse broken, Malachar''s name cleared, every shadow-cursed soul freed. The Stone burns out in your hands. When the light fades, you are gone too. Ballads are sung of the heir who came from nowhere and gave everything.',TRUE,'neutral','enchanted'),
(@s3,'expose_king','The Bloodless Revolution','You present Sira''s evidence before the assembled lords. The king abdicates quietly. Malachar is freed and exonerated. To everyone''s surprise, he becomes the kingdom''s most unlikely protector. Sira takes the throne. She is a good queen.',TRUE,'good','fantasy'),
(@s3,'shadow_heir','The Shadow Compact','Together, you and Malachar stand before the court. Your authority as heir, his evidence, his magic — irresistible. The king faces justice without a drop of blood. You are crowned the realm''s first Shadow Heir: one foot in light, one in darkness, trusted to be fair to both.',TRUE,'secret','fantasy');

SET @n3_start    = (SELECT id FROM story_nodes WHERE story_id=@s3 AND node_key='start');
SET @n3_court    = (SELECT id FROM story_nodes WHERE story_id=@s3 AND node_key='go_to_court');
SET @n3_rebels   = (SELECT id FROM story_nodes WHERE story_id=@s3 AND node_key='trust_rebels');
SET @n3_malachar = (SELECT id FROM story_nodes WHERE story_id=@s3 AND node_key='join_malachar');
SET @n3_stone    = (SELECT id FROM story_nodes WHERE story_id=@s3 AND node_key='seek_sunstone');

INSERT INTO choices (node_id, choice_text, next_node_key, choice_icon, choice_order) VALUES
(@n3_start,'Accept the royal summons and go to the castle','go_to_court','👑',1),
(@n3_start,'Trust the rebel''s note and slip away','trust_rebels','📜',2),
(@n3_start,'Seek out Malachar the shadow mage directly','join_malachar','🌑',3),
(@n3_court,'Journey to Ashwood Forest for the Sunstone','seek_sunstone','🌲',1),
(@n3_court,'Investigate the king''s past before acting','trust_rebels','🔍',2),
(@n3_rebels,'Bring Sira''s evidence before the lords','expose_king','⚖️',1),
(@n3_rebels,'Retrieve the Sunstone — but use it for justice','seek_sunstone','💎',2),
(@n3_malachar,'Ally with Malachar and expose the truth','shadow_heir','🌑',1),
(@n3_malachar,'Take what you''ve learned and act alone','trust_rebels','⚔️',2),
(@n3_stone,'Answer: I seek Justice','answer_justice','⚖️',1),
(@n3_stone,'Answer: I seek Power','answer_power','⚡',2),
(@n3_stone,'Answer: I seek Peace','answer_peace','🕊️',3);

-- ============================================================
-- STORY 4: The Last Train to Nowhere
-- ============================================================
INSERT INTO stories (title, description, genre, cover_emoji, cover_color, total_endings) VALUES
('The Last Train to Nowhere', 'You board a midnight train with no ticket and no destination. The passengers aren''t quite right. And the train hasn''t stopped in thirty years.', 'Mystery', '🚂', '#0a0808', 5);
SET @s4 = LAST_INSERT_ID();

INSERT INTO story_nodes (story_id, node_key, title, content, is_ending, ending_type, background_mood) VALUES
(@s4,'start','Midnight Departure','The train appeared from nowhere — no schedule, no announcement. You stepped aboard to escape the rain. Now the doors are sealed. The carriages stretch further than they should. A conductor in a black coat passes without looking at you. One of the passengers — an old woman in the corner — turns her head slowly and smiles. ''First time?'' she says.',FALSE,NULL,'dark'),
(@s4,'talk_woman','The Passenger','Her name is Mara. She''s been on this train for forty years. ''The train collects people who are running from something.'' She studies your face. ''You lost someone recently. The train felt it.'' She points to a door at the rear. ''Through there is the Archive. If you find your story, you might find a way home. Or a reason to stay.''',FALSE,NULL,'dark'),
(@s4,'follow_conductor','The Engine Room','You push through carriage after carriage until you reach the engine. The conductor stands before a vast furnace. He turns. He has no face — where features should be is a mirror showing only your reflection. ''Every train needs coal. Every journey needs a price.'' He opens the furnace door. Inside, you see memories burning.',FALSE,NULL,'nightmare'),
(@s4,'find_exit','Between Carriages','The gap between carriages opens onto an endless grey void. A figure stands in it — someone familiar, someone you lost. They hold out their hand. ''You can come here. You don''t have to go back.'' Behind you, Mara''s voice calls: ''Don''t listen. The void shows what you want, not what''s real.''',FALSE,NULL,'nightmare'),
(@s4,'the_archive','The Archive','The Archive is a library the size of a cathedral, every shelf filled with small glass bottles — each one a glowing memory. Your bottle pulses when you approach. Inside: the truth. You weren''t running from something. You were running toward this train, toward the person you lost. They are somewhere on board.',FALSE,NULL,'dark'),
(@s4,'mara_story','Forty Years','Mara lost her son. The train found her the night she gave up looking. ''I stay because he''s here. Not alive — just here.'' She points to a window. Outside, impossibly, you can see your town. ''The door only opens when you truly want to go home — not escape. There''s a difference.''',FALSE,NULL,'dark'),
(@s4,'sacrifice_memory','The Price Paid','You give the furnace your most painful memory. It burns bright. A door appears: YOUR STOP in gold letters. The train releases you. You step out onto a real platform in real air. The weight you''ve carried for years is gone. So is the memory. You find you don''t miss it.',TRUE,'good','default'),
(@s4,'pull_brake','The Derailment','The emergency brake screams. The train shudders and stops. The passengers flicker and vanish. You stand on a perfectly ordinary platform at 12:03 AM. There is a timetable on the wall. None of the destinations make sense. You buy a coffee and decide never to board a midnight train again.',TRUE,'neutral','stormy'),
(@s4,'into_void','The Grey Country','You step into the void. The figure embraces you — warm, real, the person you lost. Time passes differently here. Days or years. When you look back the train is a distant light. You could return. You don''t. This grey place becomes, eventually, a kind of home.',TRUE,'bad','nightmare'),
(@s4,'search_train','Reunion','You find them in carriage 77. They turn. ''I''ve been waiting. I didn''t know how to come back.'' The train begins to slow. Mara leaves the door open. Through it: your station, real and lit. You take their hand. The two of you step off together.',TRUE,'good','default'),
(@s4,'drink_memory','The Long Sleep','The bottled memory is cold and sweet. You wake in your own bed — sunlight, birds, coffee from downstairs. There is a small smudge of ash on your palm that won''t wash off. Sometimes at midnight you hear a distant whistle and something in your chest aches quietly.',TRUE,'neutral','default'),
(@s4,'go_home','The Open Window','You climb through the window. There is no fall — only arrival. Your street, exactly right. Behind you there is no train, only normal rain. You walk home. At the door you pause and look back once. A single light moves in the distance, impossibly fast. Gone.',TRUE,'good','default'),
(@s4,'stay_train','The Permanent Passenger','You stay. Mara smiles and makes room. The train''s rhythm becomes familiar. You don''t grieve here — you exist alongside the grief, which is different. Decades pass. A new passenger stumbles aboard, terrified, and you turn and smile. ''First time?'' you say. The train rolls on.',TRUE,'secret','dark');

SET @n4_start = (SELECT id FROM story_nodes WHERE story_id=@s4 AND node_key='start');
SET @n4_woman = (SELECT id FROM story_nodes WHERE story_id=@s4 AND node_key='talk_woman');
SET @n4_cond  = (SELECT id FROM story_nodes WHERE story_id=@s4 AND node_key='follow_conductor');
SET @n4_exit  = (SELECT id FROM story_nodes WHERE story_id=@s4 AND node_key='find_exit');
SET @n4_arch  = (SELECT id FROM story_nodes WHERE story_id=@s4 AND node_key='the_archive');
SET @n4_mara  = (SELECT id FROM story_nodes WHERE story_id=@s4 AND node_key='mara_story');

INSERT INTO choices (node_id, choice_text, next_node_key, choice_icon, choice_order) VALUES
(@n4_start,'Talk to the old woman — she seems to know things','talk_woman','👵',1),
(@n4_start,'Follow the conductor toward the front of the train','follow_conductor','🎩',2),
(@n4_start,'Try to find a way off the train','find_exit','🚪',3),
(@n4_woman,'Go through the door to the Archive','the_archive','📚',1),
(@n4_woman,'Ask Mara how she chose to stay','mara_story','💬',2),
(@n4_cond,'Offer a memory willingly — the most painful one','sacrifice_memory','🔥',1),
(@n4_cond,'Refuse and pull the emergency brake','pull_brake','🛑',2),
(@n4_exit,'Step into the void toward the familiar figure','into_void','🌫️',1),
(@n4_exit,'Turn back and trust Mara','talk_woman','🔙',2),
(@n4_arch,'Search the train for the person you lost','search_train','🔍',1),
(@n4_arch,'Drink your bottled memory and try to wake','drink_memory','💧',2),
(@n4_mara,'Step through the window and go home','go_home','🏠',1),
(@n4_mara,'Stay on the train with Mara a while longer','stay_train','🚂',2);

-- ============================================================
-- STORY 5: The Deep Below
-- ============================================================
INSERT INTO stories (title, description, genre, cover_emoji, cover_color, total_endings) VALUES
('The Deep Below', 'On a research submarine in the Pacific Trench, all contact with the surface is lost. The pressure is rising. And something is knocking on the hull from outside.', 'Thriller', '🌊', '#000d1a', 4);
SET @s5 = LAST_INSERT_ID();

INSERT INTO story_nodes (story_id, node_key, title, content, is_ending, ending_type, background_mood) VALUES
(@s5,'start','Blackout at Depth','The Calypso II drifts at 8,000 meters. The lights went red twelve minutes ago. The comms officer says the surface antenna is gone — cut, not broken. Captain Reyes is dead, cause unknown. Through the reinforced viewport, the absolute black of the trench offers nothing. Then: three slow knocks against the hull. Deliberate. Rhythmic. From outside.',FALSE,NULL,'dark'),
(@s5,'ascend','The Surface Protocol','You initiate emergency ascent. The engines engage — then stop. Engineer Dasha reports the propulsion array was manually disconnected from inside the ship. Someone on your crew sabotaged it. The knocking continues at the ballast tank. Water is slowly entering. You have roughly four hours of breathable air.',FALSE,NULL,'dark'),
(@s5,'signal_back','Contact','You knock back: three taps, then two, then one. A pause. Then from outside comes something extraordinary — not knocking but a pattern, complex and rhythmic. Dr. Mori, your xenobiologist, goes pale. ''That''s a prime sequence. That''s mathematics. That''s language.'' Whatever is outside has been waiting for someone to respond for a very long time.',FALSE,NULL,'dark'),
(@s5,'check_cameras','What the Camera Saw','The exterior feed shows the trench — and then, at the edge of the light, something vast and slow. Not a creature in any sense you have language for. More like a living current that suggests an eye without being one. While you watch, it leaves something on the hull — a mark, geometric, precise, glowing faintly blue.',FALSE,NULL,'nightmare'),
(@s5,'find_saboteur','The Confession','It''s Dr. Mori. She doesn''t deny it. ''I''ve been in contact with it for three months. It doesn''t want to hurt us. It wants to show us something. If we ascend now this stays secret forever.'' She holds up a notebook of translated signals. The knocking has stopped. Whatever is outside is waiting.',FALSE,NULL,'dark'),
(@s5,'repair_engines','Engineered Escape','You and Dasha spend three brutal hours in the flooded engine compartment. The engines roar back to life at the last moment. The sub rises. As you break the surface into blinding daylight, a rescue helicopter already circles — Reyes had triggered a dead-man beacon before he died. You are alive. You don''t mention the knocking.',TRUE,'good','default'),
(@s5,'open_door','First Contact','The external bay opens. The entity enters — not physically, but as light, as data, as vibration. It shows you: a civilization in the trenches, older than the continents, patient as geology. It was knocking because it had been knocking for ten thousand years and this was the first time anyone knocked back. It gives you coordinates — a map to something the world needs to know.',TRUE,'good','dark'),
(@s5,'communicate','The Long Conversation','You spend six hours in dialogue through sonar pulses. Dr. Mori translates with increasing awe. The entity tells you something that rewrites the history of life on Earth. It asks one thing: don''t come back with weapons. You agree. Your crew is silent on the ascent. The world above has no idea what lives below it.',TRUE,'neutral','dark'),
(@s5,'send_diver','Into the Dark','You go yourself. At 8,000 meters in a pressure suit, you reach the hull and touch the glowing mark. Information floods your sensors — a compressed history, a handshake. The entity shows you cities of mineral and light built over millennia. You return two hours later, changed completely, weeping inside your helmet.',TRUE,'secret','nightmare');

SET @n5_start = (SELECT id FROM story_nodes WHERE story_id=@s5 AND node_key='start');
SET @n5_asc   = (SELECT id FROM story_nodes WHERE story_id=@s5 AND node_key='ascend');
SET @n5_sig   = (SELECT id FROM story_nodes WHERE story_id=@s5 AND node_key='signal_back');
SET @n5_cam   = (SELECT id FROM story_nodes WHERE story_id=@s5 AND node_key='check_cameras');
SET @n5_sab   = (SELECT id FROM story_nodes WHERE story_id=@s5 AND node_key='find_saboteur');

INSERT INTO choices (node_id, choice_text, next_node_key, choice_icon, choice_order) VALUES
(@n5_start,'Order the crew to ascend immediately','ascend','⬆️',1),
(@n5_start,'Respond to the knocking with your own signal','signal_back','✊',2),
(@n5_start,'Access the external cameras to see what''s out there','check_cameras','📷',3),
(@n5_asc,'Find the saboteur — interrogate the crew','find_saboteur','🔍',1),
(@n5_asc,'Repair the propulsion manually','repair_engines','🔧',2),
(@n5_sig,'Open the external bay door and make contact','open_door','🚪',1),
(@n5_sig,'Communicate further without opening anything','communicate','💬',2),
(@n5_cam,'Send a diver out to examine the mark','send_diver','🤿',1),
(@n5_cam,'Ignore it and focus on ascending','ascend','⬆️',2),
(@n5_sab,'Read Mori''s notebook and hear the entity out','open_door','📖',1),
(@n5_sab,'Override her and force the repair','repair_engines','🔧',2);
