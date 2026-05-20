/**
 * AudioManager - Manages game sound effects using Phaser's sound system
 */
import { state } from '../utils/StateManager.js';

class AudioManager {
  constructor() {
    this.scene = null;
    this.masterVolume = 1.0;
    this.sfxVolume = 1.0;
    this.musicVolume = 1.0;
    this.volume = 1.0; // Fallback compatibility
    this.muted = false;
    this.initialized = false;
    this.playerGender = null;
    // VO cooldown tracking to prevent overlapping
    this._voLastPlayed = 0;
    this._voCooldownMs = 8000; // 8 second cooldown between VO lines
  }

  /**
   * Initialize with a Phaser scene
   * @param {Phaser.Scene} scene 
   */
  init(scene) {
    this.scene = scene;
    this.initialized = true;
    this.updateVolume();
  }

  /**
   * Update volume from state settings
   */
  updateVolume() {
    const s = state.get('settings');
    let master = 0.8;
    let music = 0.8;
    let sfx = 0.9;
    
    if (s && s.audio) {
      master = s.audio.master !== undefined ? s.audio.master : 0.8;
      music = s.audio.music !== undefined ? s.audio.music : 0.8;
      sfx = s.audio.sfx !== undefined ? s.audio.sfx : 0.9;
      this.muted = s.audio.muted || false;
    }
    
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.volume = master * sfx; // Keep this.volume as fallback
    
    // Update Phaser sound volume if scene exists
    if (this.scene && this.scene.sound) {
      try { this.scene.sound.volume = this.muted ? 0 : this.masterVolume; } catch (_) {}
      if (this.currentMusic) {
        try {
          this.currentMusic.setVolume(this.muted ? 0 : this.musicVolume * 0.25); // Lower BGM for clearer VO
        } catch (e) {
          console.warn('[AudioManager] currentMusic reference was dead, clearing it.');
          this.currentMusic = null;
        }
      }
    }
  }

  /**
   * Load player voice over files based on gender
   * @param {Phaser.Scene} scene - The game scene to load into
   * @param {string} gender - 'male' or 'female'
   */
  loadPlayerVO(scene, gender) {
    const voBasePath = '/assets/audio';

    if (gender === 'male') {
      // Male VO files - organized by chapter relevance
      scene.load.audio('vo_male_mananaggal_ex1', `${voBasePath}/Male VO/mananagngal ex1.mp3`);
      scene.load.audio('vo_male_bungisngis_ex1', `${voBasePath}/Male VO/bungisngis ex1.mp3`);
      scene.load.audio('vo_male_kataw_ex1', `${voBasePath}/Male VO/kataw ex1.mp3`);
      scene.load.audio('vo_male_ang_sabi', `${voBasePath}/Male VO/ang sabi ng mamatanda.mp3`);
      scene.load.audio('vo_male_bulaklak', `${voBasePath}/Male VO/bulaklak.mp3`);
      scene.load.audio('vo_male_hindi_laging', `${voBasePath}/Male VO/hindi laging ukang halimaw.mp3`);
      scene.load.audio('vo_male_may_dumaan', `${voBasePath}/Male VO/may dumaaan na hindi tao.mp3`);
      scene.load.audio('vo_male_wag_titingala', `${voBasePath}/Male VO/wag kang titingala.mp3`);
      scene.load.audio('vo_male_wag_sagutin', `${voBasePath}/Male VO/wag sagutin ang boses.mp3`);
    } else if (gender === 'female') {
      // Female VO files - organized by chapter relevance
      scene.load.audio('vo_female_mananaggal_ay', `${voBasePath}/Female VO/ang manananggal daw ay.mp3`);
      scene.load.audio('vo_female_mananaggal_sa', `${voBasePath}/Female VO/ang manananggal sa.mp3`);
      scene.load.audio('vo_female_bungisngis', `${voBasePath}/Female VO/ang bungisngis daw.mp3`);
      scene.load.audio('vo_female_kumanta_tubig', `${voBasePath}/Female VO/kapag may kumanta sa tubig.mp3`);
      scene.load.audio('vo_female_akala', `${voBasePath}/Female VO/akala namin.mp3`);
      scene.load.audio('vo_female_ang_aswang', `${voBasePath}/Female VO/ang aswang daw.mp3`);
      scene.load.audio('vo_female_ang_sabi_matatanda', `${voBasePath}/Female VO/ang sabi ng matatanda.mp3`);
      scene.load.audio('vo_female_ang_sabi_nila', `${voBasePath}/Female VO/ang sabi nila.mp3`);
      scene.load.audio('vo_female_sabi_sayo_baryo', `${voBasePath}/Female VO/ang sabi sabi sa baryo.mp3`);
      scene.load.audio('vo_female_at_ngayong_gabi', `${voBasePath}/Female VO/at ngayong gabi.mp3`);
      scene.load.audio('vo_female_may_dumadaan', `${voBasePath}/Female VO/may dumadaan na hindi tao.mp3`);
      scene.load.audio('vo_female_may_mga_gabing', `${voBasePath}/Female VO/may mga gabing.mp3`);
      scene.load.audio('vo_female_may_mga_pangalan', `${voBasePath}/Female VO/may mga pangalan.mp3`);
    }

    // Store gender for later use
    this.playerGender = gender;
  }

  /**
   * Play a random player voice over line
   * @param {number} chapterId - The current chapter (1, 2, or 3)
   * @param {Object} options - Playback options
   * @param {number} options.volume - Volume (0-1), default 1.0
   * @param {boolean} options.forceGeneric - Force generic line instead of chapter-specific
   * @param {boolean} options.bypassCooldown - Skip the cooldown check (for important moments like death)
   */
  playRandomPlayerVO(chapterId, options = {}) {
    if (!this.playerGender) return;

    // Check cooldown to prevent VO overlap (unless bypassed)
    const now = Date.now();
    if (!options.bypassCooldown && now - this._voLastPlayed < this._voCooldownMs) {
      return; // Still in cooldown, skip this VO
    }

    const volume = options.volume !== undefined ? options.volume : 1.0; // Higher default volume for clarity
    const forceGeneric = options.forceGeneric || false;

    let voKeys = [];

    if (this.playerGender === 'male') {
      // Chapter-specific lines (30% chance unless forced generic)
      if (!forceGeneric && Math.random() < 0.3) {
        if (chapterId === 1) {
          voKeys = ['vo_male_mananaggal_ex1'];
        } else if (chapterId === 2) {
          voKeys = ['vo_male_bungisngis_ex1'];
        } else if (chapterId === 3) {
          voKeys = ['vo_male_kataw_ex1'];
        }
      }

      // Generic lines (used if no chapter-specific or 70% of the time)
      if (voKeys.length === 0) {
        voKeys = [
          'vo_male_ang_sabi',
          'vo_male_bulaklak',
          'vo_male_hindi_laging',
          'vo_male_may_dumaan',
          'vo_male_wag_titingala',
          'vo_male_wag_sagutin'
        ];
      }
    } else {
      // Female VO
      // Chapter-specific lines (30% chance unless forced generic)
      if (!forceGeneric && Math.random() < 0.3) {
        if (chapterId === 1) {
          voKeys = ['vo_female_mananaggal_ay', 'vo_female_mananaggal_sa'];
        } else if (chapterId === 2) {
          voKeys = ['vo_female_bungisngis'];
        } else if (chapterId === 3) {
          voKeys = ['vo_female_kumanta_tubig'];
        }
      }

      // Generic lines
      if (voKeys.length === 0) {
        voKeys = [
          'vo_female_akala',
          'vo_female_ang_aswang',
          'vo_female_ang_sabi_matatanda',
          'vo_female_ang_sabi_nila',
          'vo_female_sabi_sayo_baryo',
          'vo_female_at_ngayong_gabi',
          'vo_female_may_dumadaan',
          'vo_female_may_mga_gabing',
          'vo_female_may_mga_pangalan'
        ];
      }
    }

    // Pick random line from available keys
    const randomKey = voKeys[Math.floor(Math.random() * voKeys.length)];

    if (this.scene && this.scene.cache.audio.exists(randomKey)) {
      this.play(randomKey, { volume });
      // Update last played time to enforce cooldown
      this._voLastPlayed = Date.now();
    }
  }

  /**
   * Load chapter-specific SFX based on chapter ID
   * @param {Phaser.Scene} scene - The game scene to load into
   * @param {number} chapterId - Chapter ID (1, 2, or 3)
   */
  loadChapterSFX(scene, chapterId) {
    const basePath = '/assets/audio/sd';
    const bgmPath = '/assets/audio';
    
    // Load background music
    if (scene.isEndless || scene.isInfMode || chapterId === 4) {
      scene.load.audio('bg_music', `${bgmPath}/bg-inf.mp3`);
    } else if (chapterId === 1) {
      scene.load.audio('bg_music', `${bgmPath}/chapter-1-bg.mp3`);
    } else if (chapterId === 2) {
      scene.load.audio('bg_music', `${bgmPath}/chapter-2-bg.mp3`);
    } else if (chapterId === 3) {
      scene.load.audio('bg_music', `${bgmPath}/chapter-3-bg.mp3`);
    }

    // Shared loot SFX (all chapters)
    // Bawang (Garlic/Lives Up) - magical buff sounds
    scene.load.audio('bawang_spawn', `${basePath}/MAGAngl_BUFF-Buff Drop_HY_PC-001.ogg`);
    scene.load.audio('bawang_pickup', `${basePath}/DSGNSynth_BUFF-Bubbly Buff_HY_PC-003.ogg`);
    // Chest loot - treasure/power-up sounds
    scene.load.audio('chest_spawn', `${basePath}/DSGNSynth_BUFF-Bonus Max Shield_HY_PC-001.ogg`);
    scene.load.audio('chest_pickup', `${basePath}/DSGNSynth_BUFF-Bonus Max Shield_HY_PC-003.ogg`);

    // Chapter 1: Blood/Gore/Dark (Manananggal) — also chapter 4 (INF mode)
    if (chapterId === 1 || chapterId === 4) {
      scene.load.audio('ch1_blood_crunch', `${basePath}/DSGNImpt_EXPLOSION-Cruncher_HY_PC-001.ogg`);
      scene.load.audio('ch1_blood_splat', `${basePath}/DSGNImpt_EXPLOSION-Crunching_HY_PC-001.ogg`);
      scene.load.audio('ch1_gore_pierce', `${basePath}/DSGNMisc_HIT-Gore Pierce_HY_PC-001.ogg`);
      scene.load.audio('ch1_crunchy_burst', `${basePath}/DSGNMisc_SKILL IMPACT-Crunchy Burst_HY_PC-001.ogg`);
      scene.load.audio('ch1_dark_hit', `${basePath}/DSGNImpt_MELEE-Hollow Punch_HY_PC-001.ogg`);
      scene.load.audio('ch1_eye_spawn', `${basePath}/DSGNMisc_CAST-Slime Ball_HY_PC-001.ogg`);
      scene.load.audio('ch1_hand_slam', `${basePath}/DSGNImpt_EXPLOSION-Thud_HY_PC-001.ogg`);
      // Attack-specific SFX
      scene.load.audio('ch1_splatter_drop', `${basePath}/DSGNMisc_CAST-Slime Ball_HY_PC-002.ogg`);
      scene.load.audio('ch1_splatter_burst', `${basePath}/DSGNMisc_PROJECTILE-Water Bolt_HY_PC-005.ogg`);
      scene.load.audio('ch1_eye_whoosh', `${basePath}/DSGNMisc_MOVEMENT-Whoosh Sweep_HY_PC-001.ogg`);
      scene.load.audio('ch1_eye_land', `${basePath}/DSGNImpt_EXPLOSION-Crunching_HY_PC-005.ogg`);
      scene.load.audio('ch1_volley_shoot', `${basePath}/DSGNMisc_MOVEMENT-Watery Laser_HY_PC-003.ogg`);
      scene.load.audio('ch1_volley_burst', `${basePath}/DSGNMisc_PROJECTILE-Water Bolt_HY_PC-005.ogg`);
      scene.load.audio('ch1_vortex_spawn', `${basePath}/DSGNMisc_MOVEMENT-Mecha Large Takeoff_HY_PC-001.ogg`);
      scene.load.audio('ch1_vortex_pull', `${basePath}/DSGNMisc_MOVEMENT-Noise Sweeper_HY_PC-001.ogg`);
      // Ultimate attack SFX
      scene.load.audio('ch1_ultimate', `${bgmPath}/chapter1_ultimate.mp3`);
    }
    
    // Chapter 2: Nature/Plant (Bungisngis) - COMPREHENSIVE SFX SET
    if (chapterId === 2) {
      // Bee Swarm - Flying/movement sounds
      scene.load.audio('ch2_bee_swarm', `${basePath}/DSGNMisc_MOVEMENT-Bats Flying_HY_PC-001.ogg`);
      scene.load.audio('ch2_bee_swarm_2', `${basePath}/DSGNMisc_MOVEMENT-Bats Flying_HY_PC-002.ogg`);
      scene.load.audio('ch2_bee_swarm_3', `${basePath}/DSGNMisc_MOVEMENT-Bats Flying_HY_PC-003.ogg`);

      // Bubbly/Nature projectiles
      scene.load.audio('ch2_bubbly_shot', `${basePath}/DSGNMisc_PROJECTILE-Bubbly Wubbly_HY_PC-001.ogg`);
      scene.load.audio('ch2_bubbly_shot_2', `${basePath}/DSGNMisc_PROJECTILE-Bubbly Wubbly_HY_PC-002.ogg`);
      scene.load.audio('ch2_click_bubbly', `${basePath}/DSGNMisc_PROJECTILE-Clicky Bubbly_HY_PC-001.ogg`);

      // Nature Magic & Casting
      scene.load.audio('ch2_nature_magic', `${basePath}/MAGSpel_CAST-Birdsong_HY_PC-001.ogg`);
      scene.load.audio('ch2_nature_magic_2', `${basePath}/MAGSpel_CAST-Birdsong_HY_PC-002.ogg`);
      scene.load.audio('ch2_nature_summon', `${basePath}/MAGSpel_CAST-Sharp Summon_HY_PC-001.ogg`);
      scene.load.audio('ch2_nature_summon_2', `${basePath}/MAGSpel_CAST-Sharper Summon_HY_PC-001.ogg`);

      // Wind/Gust effects
      scene.load.audio('ch2_wind_gust', `${basePath}/MAGAngl_BUFF-Healing Gusts_HY_PC-001.ogg`);
      scene.load.audio('ch2_wind_gust_2', `${basePath}/MAGAngl_BUFF-Healing Gusts_HY_PC-002.ogg`);
      scene.load.audio('ch2_wind_gust_3', `${basePath}/MAGAngl_BUFF-Shimmering Winds_HY_PC-001.ogg`);

      // Acid/Slime effects
      scene.load.audio('ch2_acid_spit', `${basePath}/DSGNMisc_CAST-Slime Ball_HY_PC-001.ogg`);
      scene.load.audio('ch2_acid_spit_2', `${basePath}/DSGNMisc_CAST-Slime Ball_HY_PC-002.ogg`);
      scene.load.audio('ch2_acid_spit_3', `${basePath}/DSGNMisc_CAST-Slime Ball_HY_PC-003.ogg`);
      scene.load.audio('ch2_acid_splat', `${basePath}/DSGNImpt_EXPLOSION-Sand Impact_HY_PC-001.ogg`);
      scene.load.audio('ch2_acid_splat_2', `${basePath}/DSGNImpt_EXPLOSION-Sand Impact_HY_PC-002.ogg`);

      // Plant Growth & Nature Spawns
      scene.load.audio('ch2_plant_grow', `${basePath}/MAGSpel_CAST-Growing Strength_HY_PC-001.ogg`);
      scene.load.audio('ch2_plant_grow_2', `${basePath}/MAGSpel_CAST-Growing Strength_HY_PC-002.ogg`);
      scene.load.audio('ch2_plant_pop', `${basePath}/MAGSpel_CAST-Critter Transformation_HY_PC-001.ogg`);
      scene.load.audio('ch2_plant_pop_2', `${basePath}/MAGSpel_CAST-Critter Transformation_HY_PC-002.ogg`);

      // Vine/Plant swish & movement
      scene.load.audio('ch2_vine_swish', `${basePath}/SWSH_MOVEMENT-Bamboo Whip_HY_PC-001.ogg`);
      scene.load.audio('ch2_vine_swish_2', `${basePath}/SWSH_MOVEMENT-Bamboo Whip_HY_PC-002.ogg`);
      scene.load.audio('ch2_vine_swish_3', `${basePath}/SWSH_MOVEMENT-Bamboo Whip_HY_PC-003.ogg`);
      scene.load.audio('ch2_vine_swish_4', `${basePath}/SWSH_MOVEMENT-Reso Swish_HY_PC-001.ogg`);

      // Explosion/Burst effects (for eggs, golems)
      scene.load.audio('ch2_nature_burst', `${basePath}/DSGNImpt_EXPLOSION-Grainy Burst_HY_PC-001.ogg`);
      scene.load.audio('ch2_nature_burst_2', `${basePath}/DSGNImpt_EXPLOSION-Grainy Burst_HY_PC-002.ogg`);
      scene.load.audio('ch2_nature_burst_3', `${basePath}/DSGNImpt_EXPLOSION-Crunchy Burst_HY_PC-002.ogg`);
      scene.load.audio('ch2_egg_crack', `${basePath}/DSGNImpt_EXPLOSION-Crunching_HY_PC-001.ogg`);
      scene.load.audio('ch2_egg_crack_2', `${basePath}/DSGNImpt_EXPLOSION-Crunching_HY_PC-002.ogg`);

      // Golem/Earth effects
      scene.load.audio('ch2_golem_step', `${basePath}/DSGNImpt_EXPLOSION-Thud_HY_PC-001.ogg`);
      scene.load.audio('ch2_golem_step_2', `${basePath}/DSGNImpt_EXPLOSION-Thud_HY_PC-002.ogg`);
      scene.load.audio('ch2_golem_quake', `${basePath}/DSGNImpt_EXPLOSION-Eruption_HY_PC-001.ogg`);
      scene.load.audio('ch2_earth_rumble', `${basePath}/DSGNMisc_CAST-Mecha Vibration_HY_PC-001.ogg`);

      // Note/Music effects (for golem quake notes)
      scene.load.audio('ch2_note_hit', `${basePath}/DSGNTonl_SKILL IMPACT-Retro Laser 1_HY_PC-001.ogg`);
      scene.load.audio('ch2_note_hit_2', `${basePath}/DSGNTonl_SKILL IMPACT-Retro Laser 2_HY_PC-001.ogg`);
      scene.load.audio('ch2_note_burst', `${basePath}/DSGNTonl_SKILL IMPACT-Energetic Impact_HY_PC-001.ogg`);

      // Ultimate attack SFX
      scene.load.audio('ch2_ultimate', `${bgmPath}/chapter2_ultimate.mp3`);

      // Bunny/Animal effects
      scene.load.audio('ch2_bunny_hop', `${basePath}/DSGNMisc_MOVEMENT-Jump Sparkle_HY_PC-001.ogg`);
      scene.load.audio('ch2_bunny_hop_2', `${basePath}/DSGNMisc_MOVEMENT-Jump Sparkle_HY_PC-002.ogg`);
      scene.load.audio('ch2_bunny_land', `${basePath}/DSGNImpt_MELEE-Magic Kick_HY_PC-001.ogg`);
      scene.load.audio('ch2_bunny_land_2', `${basePath}/DSGNImpt_MELEE-Magic Kick_HY_PC-002.ogg`);

      // Pollen/Spore effects (for hibiscus)
      scene.load.audio('ch2_pollen_burst', `${basePath}/DSGNMisc_SKILL IMPACT-Bubbly Zaps_HY_PC-001.ogg`);
      scene.load.audio('ch2_pollen_burst_2', `${basePath}/DSGNMisc_SKILL IMPACT-Bubbly Zaps_HY_PC-002.ogg`);
      scene.load.audio('ch2_spore_release', `${basePath}/DSGNTonl_SKILL RELEASE-Shimmery Bubbles_HY_PC-001.ogg`);
      scene.load.audio('ch2_flower_wobble', `${basePath}/DSGNMisc_MOVEMENT-Whimsy Chimes_HY_PC-001.ogg`);

      // Plant melee/snapping
      scene.load.audio('ch2_snap', `${basePath}/DSGNMisc_MELEE-Sword Slash_HY_PC-001.ogg`);
      scene.load.audio('ch2_snap_2', `${basePath}/FGHTImpt_MELEE-Crunch Kick_HY_PC-001.ogg`);
      scene.load.audio('ch2_snap_3', `${basePath}/FGHTImpt_MELEE-Gut Kick_HY_PC-001.ogg`);

      // Projectile whoosh (for carrots, acid)
      scene.load.audio('ch2_proj_whoosh', `${basePath}/DSGNMisc_MOVEMENT-Whoosh Sweep_HY_PC-001.ogg`);
      scene.load.audio('ch2_proj_whoosh_2', `${basePath}/DSGNMisc_MOVEMENT-Whoosh Sweep_HY_PC-002.ogg`);
      scene.load.audio('ch2_proj_fall', `${basePath}/DSGNMisc_MOVEMENT-Coin Whoosh_HY_PC-001.ogg`);

      // Impact/Hit sounds
      scene.load.audio('ch2_nature_hit', `${basePath}/DSGNMisc_HIT-Hit Noise_HY_PC-001.ogg`);
      scene.load.audio('ch2_nature_hit_2', `${basePath}/DSGNMisc_HIT-Hit Rattle_HY_PC-001.ogg`);
      scene.load.audio('ch2_nature_hit_3', `${basePath}/DSGNMisc_HIT-Sweep Hit_HY_PC-001.ogg`);
    }
    
    // Chapter 3: Water/Sea (Kataw) - COMPREHENSIVE SFX SET
    if (chapterId === 3) {
      // Water splashes and movement
      scene.load.audio('ch3_water_splash', `${basePath}/DSGNMisc_MOVEMENT-Sparkly Water_HY_PC-001.ogg`);
      scene.load.audio('ch3_water_splash_2', `${basePath}/DSGNMisc_MOVEMENT-Sparkly Water_HY_PC-002.ogg`);
      scene.load.audio('ch3_water_splash_3', `${basePath}/DSGNMisc_MOVEMENT-Sparkly Water_HY_PC-003.ogg`);
      scene.load.audio('ch3_watery_laser', `${basePath}/DSGNMisc_MOVEMENT-Watery Laser_HY_PC-001.ogg`);
      scene.load.audio('ch3_watery_laser_2', `${basePath}/DSGNMisc_MOVEMENT-Watery Laser_HY_PC-002.ogg`);

      // Water bolts and projectiles
      scene.load.audio('ch3_water_bolt', `${basePath}/DSGNMisc_PROJECTILE-Water Bolt_HY_PC-001.ogg`);
      scene.load.audio('ch3_water_bolt_2', `${basePath}/DSGNMisc_PROJECTILE-Water Bolt_HY_PC-002.ogg`);
      scene.load.audio('ch3_bubble_pop', `${basePath}/DSGNMisc_PROJECTILE-Clicky Bubbly_HY_PC-001.ogg`);
      scene.load.audio('ch3_bubble_pop_2', `${basePath}/DSGNMisc_PROJECTILE-Clicky Bubbly_HY_PC-002.ogg`);
      scene.load.audio('ch3_fish_swish', `${basePath}/DSGNMisc_MOVEMENT-Bubbly Laser Swish_HY_PC-001.ogg`);
      scene.load.audio('ch3_fish_swish_2', `${basePath}/DSGNMisc_MOVEMENT-Bubbly Laser Swish_HY_PC-002.ogg`);

      // Underwater ambiance and casting
      scene.load.audio('ch3_underwater', `${basePath}/MAGSpel_CAST-Underwater_HY_PC-001.ogg`);
      scene.load.audio('ch3_underwater_2', `${basePath}/MAGSpel_CAST-Underwater_HY_PC-002.ogg`);
      scene.load.audio('ch3_wet_electricity', `${basePath}/MAGSpel_CAST-Wet Electricity_HY_PC-001.ogg`);
      scene.load.audio('ch3_wet_electricity_2', `${basePath}/MAGSpel_CAST-Wet Electricity_HY_PC-002.ogg`);

      // Electric effects
      scene.load.audio('ch3_electric_hit', `${basePath}/DSGNImpt_EXPLOSION-Electric Hit_HY_PC-001.ogg`);
      scene.load.audio('ch3_electric_hit_2', `${basePath}/DSGNImpt_EXPLOSION-Electric Hit_HY_PC-002.ogg`);
      scene.load.audio('ch3_shimmer_electric', `${basePath}/DSGNImpt_EXPLOSION-Shimmer Electric_HY_PC-001.ogg`);
      scene.load.audio('ch3_shimmer_electric_2', `${basePath}/DSGNImpt_EXPLOSION-Shimmer Electric_HY_PC-002.ogg`);
      scene.load.audio('ch3_laser_electric_zap', `${basePath}/DSGNMisc_HIT-Laser Electric Zap_HY_PC-001.ogg`);
      scene.load.audio('ch3_laser_electric_zap_2', `${basePath}/DSGNMisc_HIT-Laser Electric Zap_HY_PC-002.ogg`);

      // Explosion and impact effects
      scene.load.audio('ch3_voltaic_blast', `${basePath}/DSGNImpt_EXPLOSION-Voltaic Blast_HY_PC-001.ogg`);
      scene.load.audio('ch3_voltaic_blast_2', `${basePath}/DSGNImpt_EXPLOSION-Voltaic Blast_HY_PC-002.ogg`);
      scene.load.audio('ch3_eruption', `${basePath}/DSGNImpt_EXPLOSION-Eruption_HY_PC-001.ogg`);
      scene.load.audio('ch3_eruption_2', `${basePath}/DSGNImpt_EXPLOSION-Eruption_HY_PC-002.ogg`);
      scene.load.audio('ch3_pyro_burst', `${basePath}/DSGNImpt_EXPLOSION-Pyro Burst_HY_PC-001.ogg`);
      scene.load.audio('ch3_pyro_burst_2', `${basePath}/DSGNImpt_EXPLOSION-Pyro Burst_HY_PC-002.ogg`);

      // Fish/Sea creature movement
      scene.load.audio('ch3_bubbly_laser_swish', `${basePath}/DSGNMisc_MOVEMENT-Bubbly Laser Swish_HY_PC-001.ogg`);
      scene.load.audio('ch3_bubbly_laser_swish_2', `${basePath}/DSGNMisc_MOVEMENT-Bubbly Laser Swish_HY_PC-002.ogg`);
      scene.load.audio('ch3_bubbly_passby', `${basePath}/SWSH_MOVEMENT-Bubbly Passby_HY_PC-001.ogg`);
      scene.load.audio('ch3_bubbly_resonance', `${basePath}/SWSH_MOVEMENT-Bubbly Resonance_HY_PC-001.ogg`);

      // Magic casting and spells
      scene.load.audio('ch3_spell_cast', `${basePath}/MAGSpel_CAST-Zippy Particle_HY_PC-001.ogg`);
      scene.load.audio('ch3_spell_cast_2', `${basePath}/MAGSpel_CAST-Zippy Particle_HY_PC-002.ogg`);
      scene.load.audio('ch3_energy_noise', `${basePath}/MAGSpel_CAST-Energy Noise_HY_PC-001.ogg`);
      scene.load.audio('ch3_energy_noise_2', `${basePath}/MAGSpel_CAST-Energy Noise_HY_PC-002.ogg`);
      scene.load.audio('ch3_teleport', `${basePath}/MAGSpel_CAST-Teleport Downer_HY_PC-001.ogg`);
      scene.load.audio('ch3_teleport_2', `${basePath}/MAGSpel_CAST-Teleport Downer_HY_PC-002.ogg`);

      // Skill impacts and releases
      scene.load.audio('ch3_skill_impact', `${basePath}/DSGNMisc_SKILL IMPACT-Highest Laser_HY_PC-001.ogg`);
      scene.load.audio('ch3_skill_impact_2', `${basePath}/DSGNMisc_SKILL IMPACT-Highest Laser_HY_PC-002.ogg`);
      scene.load.audio('ch3_critical_strike', `${basePath}/DSGNMisc_SKILL IMPACT-Critical Strike_HY_PC-001.ogg`);
      scene.load.audio('ch3_critical_strike_2', `${basePath}/DSGNMisc_SKILL IMPACT-Critical Strike_HY_PC-002.ogg`);
      scene.load.audio('ch3_energy_dissipate', `${basePath}/DSGNMisc_SKILL IMPACT-Energy Dissipate_HY_PC-001.ogg`);
      scene.load.audio('ch3_skill_release', `${basePath}/DSGNTonl_SKILL RELEASE-Laser Whoosh 1_HY_PC-001.ogg`);
      scene.load.audio('ch3_skill_release_2', `${basePath}/DSGNTonl_SKILL RELEASE-Laser Whoosh 2_HY_PC-001.ogg`);

      // Buff and aura effects
      scene.load.audio('ch3_buff_healing', `${basePath}/MAGAngl_BUFF-Healing Gusts_HY_PC-001.ogg`);
      scene.load.audio('ch3_buff_healing_2', `${basePath}/MAGAngl_BUFF-Healing Gusts_HY_PC-002.ogg`);
      scene.load.audio('ch3_shimmer_tone', `${basePath}/MAGAngl_BUFF-Shimmer Tone_HY_PC-001.ogg`);
      scene.load.audio('ch3_shimmer_tone_2', `${basePath}/MAGAngl_BUFF-Shimmer Tone_HY_PC-002.ogg`);

      // Monster/Ambush sounds
      scene.load.audio('ch3_monster_summon', `${basePath}/MAGSpel_CAST-Noise Summon_HY_PC-001.ogg`);
      scene.load.audio('ch3_monster_summon_2', `${basePath}/MAGSpel_CAST-Noise Summon_HY_PC-002.ogg`);
      scene.load.audio('ch3_monster_step', `${basePath}/DSGNImpt_EXPLOSION-Thud_HY_PC-001.ogg`);
      scene.load.audio('ch3_monster_step_2', `${basePath}/DSGNImpt_EXPLOSION-Thud_HY_PC-002.ogg`);

      // Beam and laser effects
      scene.load.audio('ch3_beam_charge', `${basePath}/DSGNMisc_PROJECTILE-Laser Scintillating_HY_PC-001.ogg`);
      scene.load.audio('ch3_beam_charge_2', `${basePath}/DSGNMisc_PROJECTILE-Laser Scintillating_HY_PC-002.ogg`);
      scene.load.audio('ch3_beam_fire', `${basePath}/DSGNMisc_PROJECTILE-Laser Bursts_HY_PC-001.ogg`);
      scene.load.audio('ch3_beam_fire_2', `${basePath}/DSGNMisc_PROJECTILE-Laser Bursts_HY_PC-002.ogg`);
      scene.load.audio('ch3_laser_shot', `${basePath}/DSGNMisc_PROJECTILE-Laser Shot_HY_PC-001.ogg`);
      scene.load.audio('ch3_laser_shot_2', `${basePath}/DSGNMisc_PROJECTILE-Laser Shot_HY_PC-002.ogg`);

      // Mecha/Engine sounds for water machines
      scene.load.audio('ch3_engine_blast', `${basePath}/DSGNImpt_EXPLOSION-Mecha Engine Blast_HY_PC-001.ogg`);
      scene.load.audio('ch3_engine_blast_2', `${basePath}/DSGNImpt_EXPLOSION-Mecha Engine Blast_HY_PC-002.ogg`);
      scene.load.audio('ch3_mecha_damage', `${basePath}/DSGNImpt_EXPLOSION-Mecha Damage_HY_PC-001.ogg`);

      // Hit and impact sounds
      scene.load.audio('ch3_hit_fleeting', `${basePath}/DSGNMisc_HIT-Fleeting Hit_HY_PC-001.ogg`);
      scene.load.audio('ch3_hit_fleeting_2', `${basePath}/DSGNMisc_HIT-Fleeting Hit_HY_PC-002.ogg`);
      scene.load.audio('ch3_hit_laser', `${basePath}/DSGNMisc_HIT-Laser Hit_HY_PC-001.ogg`);
      scene.load.audio('ch3_hit_laser_2', `${basePath}/DSGNMisc_HIT-Laser Hit_HY_PC-002.ogg`);
      scene.load.audio('ch3_hit_synth', `${basePath}/DSGNMisc_HIT-Synth Hit_HY_PC-001.ogg`);
      scene.load.audio('ch3_hit_synth_2', `${basePath}/DSGNMisc_HIT-Synth Hit_HY_PC-002.ogg`);
    }
    
    // Shared SFX for all chapters
    scene.load.audio('sfx_step_1', `${basePath}/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-001.ogg`);
    scene.load.audio('sfx_step_2', `${basePath}/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-002.ogg`);
    scene.load.audio('sfx_step_3', `${basePath}/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-003.ogg`);
    scene.load.audio('sfx_step_4', `${basePath}/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-004.ogg`);
    scene.load.audio('sfx_step_5', `${basePath}/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-005.ogg`);
    scene.load.audio('sfx_step_6', `${basePath}/FEETMisc_STEP-Boots on Generic Ground 2_HY_PC-006.ogg`);
    scene.load.audio('sfx_melee_hit', `${basePath}/MAGSpel_CAST-Zippy Particle_HY_PC-001.ogg`);
    scene.load.audio('sfx_sword_spawn', `${basePath}/DSGNTonl_SKILL RELEASE-Rising Lasers_HY_PC-001.ogg`);
    scene.load.audio('sfx_sword_pickup', `${basePath}/MAGAngl_BUFF-Bonus Regen Rate_HY_PC-001.ogg`);
    scene.load.audio('sfx_warning', `${basePath}/DSGNTonl_MELEE-Sword Critical_HY_PC-001.ogg`);
    scene.load.audio('sfx_telegraph', `${basePath}/DSGNTonl_SKILL RELEASE-Transformizer_HY_PC-002.ogg`);
    scene.load.audio('sfx_blood_hit_1', `${basePath}/DSGNTonl_SKILL RELEASE-Ricochet 2_HY_PC-001.ogg`);
    scene.load.audio('sfx_blood_hit_2', `${basePath}/DSGNTonl_SKILL RELEASE-Ricochet 2_HY_PC-002.ogg`);
    scene.load.audio('sfx_blood_hit_3', `${basePath}/DSGNTonl_SKILL RELEASE-Ricochet 2_HY_PC-003.ogg`);
    scene.load.audio('sfx_blood_hit_4', `${basePath}/DSGNTonl_SKILL RELEASE-Ricochet 2_HY_PC-004.ogg`);
    scene.load.audio('sfx_blood_hit_5', `${basePath}/DSGNTonl_SKILL RELEASE-Ricochet 2_HY_PC-005.ogg`);
    scene.load.audio('sfx_blood_hit_6', `${basePath}/DSGNTonl_SKILL RELEASE-Ricochet 2_HY_PC-006.ogg`);
    scene.load.audio('sfx_explosion', `${basePath}/DSGNImpt_EXPLOSION-Bit Bomb_HY_PC-002.ogg`);
    scene.load.audio('sfx_ui_click', `${basePath}/DSGNMisc_INTERFACE-Zap Select_HY_PC-001.ogg`);
    scene.load.audio('sfx_dpad_click', `${basePath}/UIClick_INTERFACE-Positive Click_HY_PC-001.ogg`);
    scene.load.audio('sfx_dash', `${basePath}/DSGNMisc_MOVEMENT-Jump Sparkle_HY_PC-001.ogg`);
    scene.load.audio('sfx_damage', `${basePath}/DSGNMisc_HIT-Hit Noise_HY_PC-001.ogg`);
    scene.load.audio('sfx_alert', `${basePath}/DSGNMisc_SKILL IMPACT-Jacobs Ladder_HY_PC-001.ogg`);
    scene.load.audio('sfx_smoke', `${basePath}/DSGNSynth_BUFF-Mecha Guarantee Hit_HY_PC-004.ogg`);
  }

  /**
   * Play a sound effect using Phaser's sound system
   * @param {string} key - The sound key to play
   * @param {Object} options - Playback options
   * @param {number} options.volume - Override volume (0-1)
   * @param {boolean} options.loop - Whether to loop
   */
  play(key, options = {}) {
    if (!this.scene || !this.scene.sound) {
      return;
    }
    
    if (this.muted) return;
    
    // Ensure volume is current
    this.updateVolume();
    
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[AudioManager] Sound not in cache: ${key}`);
      return;
    }
    
    try {
      // Phaser's main sound manager handles the master volume, so we only multiply by sfxVolume here
      const playVolume = (options.volume !== undefined ? options.volume : 1) * this.sfxVolume;
      // scene.sound.play() is the correct Phaser 3 API — works directly after load.audio
      this.scene.sound.play(key, { volume: playVolume, loop: options.loop || false });
    } catch (e) {
      console.warn(`[AudioManager] Failed to play ${key}:`, e);
    }
  }

  /**
   * Play background music
   * @param {string} key - The sound key for the music
   */
  playMusic(key) {
    if (!this.scene || !this.scene.sound) return;
    
    if (this.currentMusic) {
      this.currentMusic.stop();
    }
    
    if (this.scene.cache.audio.exists(key)) {
      this.currentMusic = this.scene.sound.add(key, { 
        loop: true, 
        volume: this.muted ? 0 : this.musicVolume * 0.25 // Lower BGM for clearer VO
      });
      this.currentMusic.play();
    }
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  /**
   * Pause background music with a fade out effect
   * @param {number} duration - Fade duration in ms
   */
  pauseMusicWithFade(duration = 500) {
    if (!this.currentMusic || this.muted) return;
    if (!this.currentMusic.isPlaying) return;
    
    // Prevent overlapping fades
    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }
    
    const startVolume = this.currentMusic.volume;
    const steps = 10;
    const stepVol = startVolume / steps;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    this._fadeInterval = setInterval(() => {
      currentStep++;
      if (this.currentMusic) {
        this.currentMusic.setVolume(Math.max(0, startVolume - (stepVol * currentStep)));
      }
      
      if (currentStep >= steps) {
        if (this._fadeInterval) clearInterval(this._fadeInterval);
        this._fadeInterval = null;
        if (this.currentMusic) {
          this.currentMusic.pause();
          // Restore volume for when it resumes
          this.currentMusic.setVolume(this.muted ? 0 : this.musicVolume * 0.4);
        }
      }
    }, stepTime);
  }

  /**
   * Resume background music with a fade in effect
   * @param {number} duration - Fade duration in ms
   */
  resumeMusicWithFade(duration = 500) {
    if (!this.currentMusic || this.muted) return;
    
    // Prevent overlapping fades
    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
      this._fadeInterval = null;
    }
    
    if (this.currentMusic.isPaused) {
      this.currentMusic.setVolume(0);
      this.currentMusic.resume();
      
      const targetVolume = this.musicVolume * 0.4;
      const steps = 10;
      const stepVol = targetVolume / steps;
      const stepTime = duration / steps;
      
      let currentStep = 0;
      this._fadeInterval = setInterval(() => {
        currentStep++;
        if (this.currentMusic) {
          this.currentMusic.setVolume(Math.min(targetVolume, stepVol * currentStep));
        }
        
        if (currentStep >= steps) {
          if (this._fadeInterval) clearInterval(this._fadeInterval);
          this._fadeInterval = null;
        }
      }, stepTime);
    }
  }

  /**
   * Play a random variant from an array of keys
   * @param {string[]} keys - Array of sound keys
   * @param {Object} options - Playback options
   */
  playRandom(keys, options = {}) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    return this.play(key, options);
  }

  /**
   * Play a random blood hit variant (Ricochet 2, variants 1-6)
   */
  playBloodHit() {
    const variant = Math.floor(Math.random() * 6) + 1;
    this.play(`sfx_blood_hit_${variant}`);
  }

  /**
   * Play chapter-specific impact/hit sound
   * @param {number} chapterId - Chapter ID
   */
  playImpact(chapterId) {
    const variants = [];
    
    if (chapterId === 1) {
      variants.push('ch1_blood_crunch', 'ch1_dark_hit', 'ch1_hand_slam');
    } else if (chapterId === 2) {
      variants.push('ch2_vine_swish', 'ch2_wind_gust');
    } else if (chapterId === 3) {
      variants.push('ch3_electric_hit', 'ch3_water_splash');
    }
    
    if (variants.length > 0) {
      this.playRandom(variants);
    }
  }

  /**
   * Play chapter-specific spawn/cast sound
   * @param {number} chapterId - Chapter ID
   */
  playSpawn(chapterId) {
    const variants = [];
    
    if (chapterId === 1) {
      variants.push('ch1_eye_spawn', 'ch1_blood_splat');
    } else if (chapterId === 2) {
      variants.push('ch2_nature_magic', 'ch2_plant_grow', 'ch2_bee_swarm');
    } else if (chapterId === 3) {
      variants.push('ch3_underwater', 'ch3_bubble_pop', 'ch3_watery_laser');
    }
    
    if (variants.length > 0) {
      this.playRandom(variants);
    }
  }

  /**
   * Set mute state
   * @param {boolean} muted 
   */
  setMuted(muted) {
    this.muted = muted;
    if (this.scene && this.scene.sound) {
      this.scene.sound.mute = muted;
    }
  }
}

// Export singleton
export const audioManager = new AudioManager();
