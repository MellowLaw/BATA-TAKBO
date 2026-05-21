import * as Phaser from 'phaser';
import { state } from '../utils/StateManager.js';
import { Grid } from './Grid.js';
import { Player } from './Player.js';
import { Boss } from './Boss.js';
import { audioManager } from './AudioManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.chapterId = data.chapterId || 1;
    this.isTutorial = data.isTutorial || false;
    this.isPracticeTutorial = data.isPracticeTutorial || false;
    this.character = data.character || 'male';
    this.control = data.control || 'keyboard'; // 'gesture' or 'keyboard'
    this.isEndless = data.isEndless || false;
    this.sessionId = data.sessionId || null;
    this.isGameOver = false;
    this.chapterScore = 0; // Live score for regular chapters
    this.endlessScore = 0;
    this.endlessWaves = 0;
    this.endlessPerfectWaves = 0;
    this.endlessTilesCollected = 0;
    this.endlessCombo = 1;         // combo multiplier, grows on perfect waves
    this._endlessLastPlayerHp = 6; // track for perfect wave
  }

  preload() {
    this.cameras.main.setBackgroundColor('#0a0a1a');
    if (this.chapterId === 2) {
      this.load.image('grid_bg', '/assets/ui/game-ui/grid2.png');
    } else if (this.chapterId === 3) {
      this.load.image('grid_bg', '/assets/ui/game-ui/grid3.png');
    } else {
      this.load.image('grid_bg', '/assets/ui/game-ui/grid.png');
    }
    if (this.chapterId === 2) {
      this.load.image('grid_panel_bg', '/assets/ui/game-ui/grid-second-bg-chapter2.png');
    } else if (this.chapterId === 3) {
      this.load.image('grid_panel_bg', '/assets/ui/game-ui/grid-second-bg-chapter3.png');
    } else {
      this.load.image('grid_panel_bg', '/assets/ui/game-ui/grid-second-bg.png');
    }
    this.load.image('boss_frame', '/assets/ui/game-ui/boss-frame.png');
    this.load.image('red_tile', '/assets/ui/game-ui/red_tile.png');
    
    // For practice tutorial, use chapter select background (neutral, no spoilers)
    // For regular game, use the left panel background
    if (this.isPracticeTutorial) {
      this.load.image('left_panel_bg', '/assets/ui/backgrounds/chapterselect_background.png');
    } else {
      this.load.image('left_panel_bg', '/assets/ui/backgrounds/left_panel.png');
    }

    // Player sprites: load based on selected character
    if (this.character === 'female') {
      this.load.spritesheet('player_idle_down',  '/assets/entity/player/female/Idle/Idle_Down.png',        { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_idle_up',    '/assets/entity/player/female/Idle/Idle_Up.png',          { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_idle_left',  '/assets/entity/player/female/Idle/Idle_Left_Down.png',   { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_idle_right', '/assets/entity/player/female/Idle/Idle_Right_Down.png',  { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_down',  '/assets/entity/player/female/Dash/Dash_Down.png',        { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_up',    '/assets/entity/player/female/Dash/Dash_Up.png',          { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_left',  '/assets/entity/player/female/Dash/Dash_Left_Down.png',   { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_right', '/assets/entity/player/female/Dash/Dash_Right_Down.png',  { frameWidth: 48, frameHeight: 64 });
    } else {
      this.load.spritesheet('player_idle_down',  '/assets/entity/player/male/idle/idle_down.png',       { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_idle_up',    '/assets/entity/player/male/idle/idle_up.png',         { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_idle_left',  '/assets/entity/player/male/idle/idle_left.png',       { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_idle_right', '/assets/entity/player/male/idle/idle_right.png',      { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_down',  '/assets/entity/player/male/dash/dash-down.png',       { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_up',    '/assets/entity/player/male/dash/dash-up.png',         { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_left',  '/assets/entity/player/male/dash/dash-left-down.png',  { frameWidth: 48, frameHeight: 64 });
      this.load.spritesheet('player_dash_right', '/assets/entity/player/male/dash/dash-right-down.png', { frameWidth: 48, frameHeight: 64 });
    }

    // Boss sprite sheets
    // For practice tutorial, skip loading heavy boss assets (not needed for simple tutorial)
    if (!this.isPracticeTutorial) {
      if (this.chapterId === 1 || this.chapterId === 4) {
        this.load.spritesheet('boss_idle', '/assets/entity/boss/chapter1/chapter-1-idle-sprite.png', { frameWidth: 288, frameHeight: 162 });
        this.load.spritesheet('boss_ult_attack', '/assets/entity/boss/chapter1/chapter-1-attack-sprite.png', { frameWidth: 336, frameHeight: 189 });

        // Phase 5: Dynamic Loading of Custom Blood/Gore Sequence Projectiles
        for (let i = 0; i <= 14; i++) {
          this.load.image(`dark_blood_${i}`, `/assets/projectiles/chapter-1/dark-blood/1_${i}.png`);
        }
        this.load.spritesheet('blood_chem', '/assets/projectiles/chapter-1/blood_chem.png', { frameWidth: 1540, frameHeight: 93 });
        for (let i = 0; i <= 59; i++) {
          const str = i.toString().padStart(3, '0');
          this.load.image(`blood_splat_${str}`, `/assets/projectiles/chapter-1/blood-splat/1_${str}.png`);
        }
        this.load.spritesheet('ch1_eye', '/assets/projectiles/chapter-1/eye/eyeball.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('eye_explosion', '/assets/fx/eye_explosion.png', { frameWidth: 96, frameHeight: 96 });
        this.load.image('ch1_hand1', '/assets/projectiles/chapter-1/hands-1.png');
        this.load.image('ch1_hand2', '/assets/projectiles/chapter-1/hand-2.png');
        this.load.image('ch1_hand3', '/assets/projectiles/chapter-1/hand-3.png');

        // Random horizontal projectiles
        this.load.image('ch1_monster_hand', '/assets/projectiles/shared/monster-hand.png');
      this.load.image('ch1_monster_finger', '/assets/projectiles/shared/monster-finger.png');
      this.load.image('ch1_monster_feet', '/assets/projectiles/shared/monster-feet.png');
      this.load.image('ch1_heart', '/assets/projectiles/shared/heart.png');
      this.load.image('ch1_brain', '/assets/projectiles/shared/brain.png');

      // Hit effect for horizontal projectiles
      this.load.spritesheet('moving_hit', '/assets/fx/moving_hit1.png', { frameWidth: 32, frameHeight: 32 });

      // Ultimate attack spritesheets (start → loop → end)
      this.load.spritesheet('ult_start', '/assets/projectiles/chapter-1/ultimate/attack.png', { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ult_loop', '/assets/projectiles/chapter-1/ultimate/loop.png', { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ult_end', '/assets/projectiles/chapter-1/ultimate/end.png', { frameWidth: 128, frameHeight: 128 });

    } else if (this.chapterId === 2) {
      // ===== CHAPTER 2: BUNGISNGIS ASSETS =====
      this.load.spritesheet('boss_idle', '/assets/entity/boss/chapter2/chapter-2-idle-sprite.png', { frameWidth: 672, frameHeight: 378 });
      this.load.spritesheet('boss_ch2_ult_attack', '/assets/entity/boss/chapter2/chapter-2-attack-sprite.png', { frameWidth: 672, frameHeight: 378 });

      // Attack projectiles
      this.load.spritesheet('ch2_beeswarm', '/assets/projectiles/chapter-2/bee-swarm.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_hibiscus', '/assets/projectiles/chapter-2/hibiscus.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_hibiscus_burst', '/assets/projectiles/chapter-2/hibiscus-burst.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_vines', '/assets/projectiles/chapter-2/growing-vines.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_carrot', '/assets/projectiles/chapter-2/carrot-rain.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_eggs', '/assets/projectiles/chapter-2/exploding-eggs.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_note_burst', '/assets/projectiles/chapter-2/note-burst.png', { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ch2_bunnies', '/assets/projectiles/chapter-2/bunnies.png', { frameWidth: 192, frameHeight: 192 });
      this.load.spritesheet('ch2_golem_attack', '/assets/projectiles/chapter-2/Golem_1_attack.png', { frameWidth: 90, frameHeight: 64 });
      this.load.spritesheet('ch2_golem_die', '/assets/projectiles/chapter-2/Golem_1_die.png', { frameWidth: 90, frameHeight: 64 });
      this.load.spritesheet('ch2_notes', '/assets/projectiles/chapter-2/notes.png', { frameWidth: 128, frameHeight: 128 });

      // Plant entities
      this.load.spritesheet('ch2_plant_melee', '/assets/projectiles/chapter-2/Plant3_Attack.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch2_plant_ranged', '/assets/projectiles/chapter-2/Plant1_Attack.png', { frameWidth: 64, frameHeight: 64 });

      // Acid projectile chain
      this.load.spritesheet('ch2_acid_charge', '/assets/projectiles/chapter-2/Acid-01.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch2_acid_travel', '/assets/projectiles/chapter-2/Acid-02Repeatable.png', { frameWidth: 56, frameHeight: 32 });
      this.load.spritesheet('ch2_acid_end', '/assets/projectiles/chapter-2/Acid-02Ending.png', { frameWidth: 56, frameHeight: 32 });

    } else if (this.chapterId === 3) {
      // ===== CHAPTER 3: KATAW ASSETS =====
      this.load.spritesheet('boss_idle', '/assets/entity/boss/chapter3/chapter-3-idle-sprite.png', { frameWidth: 672, frameHeight: 378 });
      this.load.spritesheet('boss_ch3_ult_attack', '/assets/entity/boss/chapter3/chapter-3-attack-sprite.png', { frameWidth: 672, frameHeight: 378 });
      
      // Blue FX (129x32 strip → 4 frames of 32x32)
      this.load.spritesheet('ch3_fx_bubble',    '/assets/projectiles/chapter-3/blue/blue5.png',  { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_fx_sonic',     '/assets/projectiles/chapter-3/blue/blue3.png',  { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_fx_fireblade', '/assets/projectiles/chapter-3/blue/blue16.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_fx_darkorbit', '/assets/projectiles/chapter-3/blue/blue19.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_fx_thunder',   '/assets/projectiles/chapter-3/blue/blue21.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_fx_ring',      '/assets/projectiles/chapter-3/blue/blue4.png',  { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_fx_whirl',     '/assets/projectiles/chapter-3/blue/blue0.png',  { frameWidth: 32, frameHeight: 32 });

      // Smoke Spawn/Despawn (832x64 → 13 frames of 64x64)
      this.load.spritesheet('ch3_smoke_spawn', '/assets/projectiles/chapter-3/Smoke-Spawn.png', { frameWidth: 64, frameHeight: 64 });

      // Bat (576x64 → 9 frames for IdleFly; 512x64 → 8 frames for Attack; frame size 64x64)
      this.load.spritesheet('ch3_bat_fly', '/assets/projectiles/chapter-3/Bat/Bat-IdleFly.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_bat_hit', '/assets/projectiles/chapter-3/Bat/Bat-Attack1.png', { frameWidth: 64, frameHeight: 64 });

      // Fish King (2000x250 → 8 frames of 250x250)
      this.load.spritesheet('ch3_fishking_idle',  '/assets/projectiles/chapter-3/Fish-king/Idle.png',    { frameWidth: 250, frameHeight: 250 });
      this.load.spritesheet('ch3_fishking_wand',  '/assets/projectiles/chapter-3/Fish-king/Attack1.png', { frameWidth: 250, frameHeight: 250 });
      this.load.spritesheet('ch3_fishking_spell', '/assets/projectiles/chapter-3/Fish-king/Attack2.png', { frameWidth: 250, frameHeight: 250 });

      // Monster2Pack (256x192 → 4x6 grid, 64x32 frames)
      this.load.spritesheet('ch3_monster2', '/assets/projectiles/chapter-3/Monster2Pack.png', { frameWidth: 64, frameHeight: 32 });
      // Monster6Pack (384x512 → 4x8 grid, 96x64 frames)
      this.load.spritesheet('ch3_monster6', '/assets/projectiles/chapter-3/Monster6Pack.png', { frameWidth: 96, frameHeight: 64 });
      // Explosion2 (864x48 → 18x1 strip, 48x48 frames) - for ultimate attack
      this.load.spritesheet('ch3_explosion2', '/assets/projectiles/chapter-3/Explosion 2 SpriteSheet.png', { frameWidth: 48, frameHeight: 48 });

      // Jellyfish (192x48 → 4 frames of 48x48; Death 288x48 → 6 frames)
      this.load.spritesheet('ch3_jelly_idle',   '/assets/projectiles/chapter-3/JellyFish/Idle.png',   { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_jelly_walk',   '/assets/projectiles/chapter-3/JellyFish/Walk.png',   { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_jelly_death',  '/assets/projectiles/chapter-3/JellyFish/Death.png',  { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_jelly_attack', '/assets/projectiles/chapter-3/JellyFish/Attack.png', { frameWidth: 48, frameHeight: 48 });

      // Shark (192x48 → 4 frames of 48x48; Attack 288x48 → 6 frames)
      this.load.spritesheet('ch3_shark_idle',   '/assets/projectiles/chapter-3/Shark/Idle.png',   { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_shark_walk',   '/assets/projectiles/chapter-3/Shark/Walk.png',   { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_shark_attack', '/assets/projectiles/chapter-3/Shark/Attack.png', { frameWidth: 48, frameHeight: 48 });


      // Nemo (all sheets are 128x128 → 2x2 = 4 frames of 64x64 each)
      this.load.spritesheet('ch3_nemo_swim',   '/assets/projectiles/chapter-3/Nemo-Fish/normal-actions/normalswim.png',          { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_nemo_chomp',  '/assets/projectiles/chapter-3/Nemo-Fish/normal-actions/normalchomp.png',         { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_nemo_diagdn', '/assets/projectiles/chapter-3/Nemo-Fish/normal-actions/normalswimdiagdown.png',   { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_nemo_diagup', '/assets/projectiles/chapter-3/Nemo-Fish/normal-actions/normalswimdiagup.png',     { frameWidth: 64, frameHeight: 64 });
      // Tilt chomps: 256x64 → 4 frames in 1 row of 64x64
      this.load.spritesheet('ch3_nemo_tiltdn', '/assets/projectiles/chapter-3/Nemo-Fish/normal-actions/normaltiltdownchomp.PNG', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_nemo_tiltup', '/assets/projectiles/chapter-3/Nemo-Fish/normal-actions/normaltiltupchomp.png',   { frameWidth: 64, frameHeight: 64 });

      // Snake (448x128 → 2 rows × 7 cols = 14 frames of 64x64, faces LEFT)
      this.load.spritesheet('ch3_snake', '/assets/projectiles/chapter-3/Snake/snake.png', { frameWidth: 64, frameHeight: 64 });

      // Siren Sisters (128x128 per frame)
      this.load.spritesheet('ch3_siren1',         '/assets/projectiles/chapter-3/Siren1/Idle.png',    { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ch3_siren2',         '/assets/projectiles/chapter-3/Siren2/Idle.png',    { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ch3_siren3_idle',    '/assets/projectiles/chapter-3/Siren3/Idle.png',    { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ch3_siren3_special', '/assets/projectiles/chapter-3/Siren3/Special.png', { frameWidth: 128, frameHeight: 128 });

      // Cthulhu (2880x784 → 15 cols × 7 rows of 192x112)
      this.load.spritesheet('ch3_cthulhu', '/assets/projectiles/chapter-3/cthulu.png', { frameWidth: 96, frameHeight: 56 });



      // Water Beam Spells — pixel-accurate
      // darkbolt: 768x88 → 12 frames of 64x88
      // firebomb: 960x64 → 15 frames of 64x64
      // lightning: 704x128 → 11 frames of 64x128
      // spark: 256x32 → 8 frames of 32x32
      // waterbeam: 252x32 → 4 frames of 63x32
      // waterbeam2: 192x32 → 4 frames of 48x32
      // waterburst: 378x48 → 6 frames of 63x48
      // waterspiral: 192x32 → 6 frames of 32x32
      this.load.spritesheet('ch3_darkbolt',   '/assets/projectiles/chapter-3/water-beams/Dark-Bolt.png',   { frameWidth: 64, frameHeight: 88 });
      this.load.spritesheet('ch3_firebomb',   '/assets/projectiles/chapter-3/water-beams/Fire-bomb.png',   { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_lightning',  '/assets/projectiles/chapter-3/water-beams/Lightning.png',   { frameWidth: 64, frameHeight: 128 });
      this.load.spritesheet('ch3_spark',      '/assets/projectiles/chapter-3/water-beams/spark.png',       { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_tide_lightning', '/assets/projectiles/chapter-3/water-beams/tide_lightinging.png', { frameWidth: 64, frameHeight: 128 });
      this.load.spritesheet('ch3_waterspiral','/assets/projectiles/chapter-3/water-beams/water-spiral.png',{ frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_waterbeam',  '/assets/projectiles/chapter-3/water-beams/water-beam.png',  { frameWidth: 63, frameHeight: 32 });
      this.load.spritesheet('ch3_waterbeam2', '/assets/projectiles/chapter-3/water-beams/water-beam2.png', { frameWidth: 48, frameHeight: 32 });
      this.load.spritesheet('ch3_waterburst', '/assets/projectiles/chapter-3/water-beams/water-burst.png', { frameWidth: 63, frameHeight: 48 });
      // Multi-directional beam swirl (6 cols × 5 rows = 30 frames of 32×32)
      this.load.spritesheet('ch3_beam_multidir', '/assets/projectiles/chapter-3/water-beams/ch3_beam_swirl.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('ch3_light_showers', '/assets/projectiles/chapter-3/water-beams/light_showers.png', { frameWidth: 64, frameHeight: 64 });
      // Ultimate effect - DitheredFire 6 cols x 5 rows = 30 frames
      this.load.spritesheet('ch3_dithered_fire', '/assets/projectiles/chapter-3/water-beams/Effect_DitheredFire.png', { frameWidth: 64, frameHeight: 64 });
      // Ultimate water beam - Anima 6 cols x 5 rows = 30 frames of 437x437
      this.load.spritesheet('ch3_water_beam', '/assets/projectiles/chapter-3/water-beams/Effect_Anima_1_437x437.png', { frameWidth: 437, frameHeight: 437 });
      
      // Siren1 animations - Walk 1664x128=13f, Attack_3 1280x128=10f
      this.load.spritesheet('ch3_siren1_walk', '/assets/projectiles/chapter-3/Siren1/Walk.png', { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('ch3_siren1_attack', '/assets/projectiles/chapter-3/Siren1/Attack_3.png', { frameWidth: 128, frameHeight: 128 });
      
      // FX for damage effects
      this.load.spritesheet('eye_explosion', '/assets/fx/eye_explosion.png', { frameWidth: 64, frameHeight: 64 });
      
      this.load.spritesheet('ch3_explosion_1', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-1-b.png', { frameWidth: 80, frameHeight: 48 });
      this.load.spritesheet('ch3_explosion_2', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-2-b.png', { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_explosion_3', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-3-b.png', { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('ch3_explosion_4', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-4-b.png', { frameWidth: 128, frameHeight: 128 });
      
      this.load.spritesheet('ch3_explosion_2a', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-2-d.png', { frameWidth: 128, frameHeight: 80 });
      this.load.spritesheet('ch3_explosion_3a', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-3-d.png', { frameWidth: 192, frameHeight: 192 });
      
      this.load.spritesheet('ch3_explosion_1d', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-1-d.png', { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet('ch3_explosion_2d', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-2-d.png', { frameWidth: 128, frameHeight: 80 });
      this.load.spritesheet('ch3_explosion_3d', '/assets/projectiles/chapter-3/EXPLOSIONS/explosion-3-d.png', { frameWidth: 192, frameHeight: 192 });
      } else {
        // Default fallback for future chapters - use Chapter 1 sprites
        this.load.spritesheet('boss_idle', '/assets/entity/boss/chapter1/chapter-1-idle-sprite.png', { frameWidth: 288, frameHeight: 162 });
        this.load.spritesheet('boss_cast', '/assets/entity/boss/chapter1/chapter-1-idle-sprite.png', { frameWidth: 288, frameHeight: 162 });
      }
    } // End of !isPracticeTutorial block - boss assets only needed for regular game

    // Shared loot items and effects (needed for all chapters)
    this.load.image('ruby_loot', '/assets/projectiles/shared/ruby.png');
    this.load.image('diamond_loot', '/assets/projectiles/shared/diamond.png');
    this.load.image('bawang_loot', '/assets/projectiles/shared/bawang.png');
    this.load.spritesheet('bawang_effects', '/assets/fx/bawang_effects.png', { frameWidth: 64, frameHeight: 64 });
    // Chest loot - 5 different chest variations (single column, 4 frames each ~32x32)
    this.load.spritesheet('chest1_loot', '/assets/projectiles/shared/chest1.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('chest2_loot', '/assets/projectiles/shared/chest2.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('chest3_loot', '/assets/projectiles/shared/chest3.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('chest4_loot', '/assets/projectiles/shared/chest4.png', { frameWidth: 31, frameHeight: 32 });
    this.load.spritesheet('chest5_loot', '/assets/projectiles/shared/chest5.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('chest_effects', '/assets/fx/chest2.png', { frameWidth: 64, frameHeight: 64 });

    // UI elements like Hearts (needed for all modes)
    this.load.spritesheet('ui_buttons', '/assets/ui/buttons.png', { frameWidth: 16, frameHeight: 16 });

    // Projectiles 
    this.load.image('projectile_1', '/assets/projectiles/shared/bone.png');
    this.load.image('projectile_2', '/assets/projectiles/shared/knife.png');
    this.load.image('projectile_3', '/assets/projectiles/shared/red-potion.png');

    // FX
    this.load.spritesheet('fx_damage', '/assets/ui/game-ui/generic-sparks/GenericSparks-Sheet.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('symbol_alert', '/assets/fx/symbol_alert.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('symbol_alert2', '/assets/fx/symbol_alert2.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('attack_up', '/assets/fx/attack_up.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('smoke_up', '/assets/fx/smoke_up.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('chest1', '/assets/fx/chest1.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('chest2', '/assets/fx/chest2.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('chest3', '/assets/fx/chest3.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('chest4', '/assets/fx/chest4.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('lives_decreased', '/assets/fx/lives_decreased.png', { frameWidth: 64, frameHeight: 64 });
    // lives_up: 2944x128 = 23 frames of 128x128 (single row)
    this.load.spritesheet('lives_up', '/assets/fx/lives_up.png', { frameWidth: 128, frameHeight: 128 });
    // frozen: 1536x128 = 12 frames of 128x128
    this.load.spritesheet('frozen', '/assets/fx/frozen.png', { frameWidth: 128, frameHeight: 128 });

    this.load.spritesheet('lightning_burst', '/assets/fx/lightning_burst.png', { frameWidth: 64, frameHeight: 64 });

    // Boss HP bar — MinimumDamage sheet (64x16, 50 frames: frame 0 = full, frame 49 = empty, top-to-bottom)
    this.load.spritesheet('boss_hp_bar', '/assets/ui/game-ui/minimum-damage/MinimumDamage-Sheet.png', { frameWidth: 64, frameHeight: 16 });
    this.load.spritesheet('villain_hp_up', '/assets/fx/villain_hpUP.png', { frameWidth: 64, frameHeight: 64 });

    // Blood screen overlays (low HP warnings on right panel)
    this.load.image('blood_screen_2left', '/assets/ui/game-ui/blood-screen/2left.png');
    this.load.image('blood_screen_1_5left', '/assets/ui/game-ui/blood-screen/1.5left.png');
    this.load.image('blood_screen_1left', '/assets/ui/game-ui/blood-screen/1left.png');
    this.load.image('blood_screen_halfleft', '/assets/ui/game-ui/blood-screen/halfleft.png');

    // Load chapter-specific SFX via AudioManager
    audioManager.loadChapterSFX(this, this.chapterId);

    // Load player voice overs based on character gender
    audioManager.loadPlayerVO(this, this.character);
  }

  create() {
    const { width, height } = this.scale;

    // Initialize AudioManager with this scene
    audioManager.init(this);

    // Play background music (loaded based on chapterId in preload)
    audioManager.playMusic('bg_music');

    // Play initial random player VO after 3 seconds (game start)
    this.time.delayedCall(3000, () => {
      audioManager.playRandomPlayerVO(this.chapterId, { volume: 0.9 });
    });

    // Set up periodic random VO every 25-40 seconds
    this.voTimer = this.time.addEvent({
      delay: Phaser.Math.Between(25000, 40000),
      callback: () => {
        if (!this.isGameOver && this.player && this.player.hp > 0) {
          audioManager.playRandomPlayerVO(this.chapterId, { volume: 0.85 });
        }
        // Randomize next delay
        if (this.voTimer) {
          this.voTimer.delay = Phaser.Math.Between(25000, 40000);
        }
      },
      callbackScope: this,
      loop: true
    });
    
    // Ensure music stops when scene shuts down (quit or game over)
    this.events.once('shutdown', () => {
      audioManager.stopMusic();
      // Clean up VO timer
      if (this.voTimer) {
        this.voTimer.remove();
        this.voTimer = null;
      }
    });

    // Legacy chapterId=4 endless (unused path kept for safety)
    const isLegacyEndless = this.chapterId === 4;

    // 1. Initialize dynamic Grid based on Chapter ID
    let gridCols = 7, gridRows = 7;
    if (this.chapterId === 1) {
      gridCols = 5;
      gridRows = 5;
    } else if (this.chapterId === 3) {
      gridCols = 9;
      gridRows = 9;
    }

    // Get panel position from settings
    const settings = state.get('settings');
    this.panelPosition = settings?.display?.panelPosition || 'left';
    this.isPanelRight = this.panelPosition === 'right';

    this.grid = new Grid(this, gridCols, gridRows, this.isPracticeTutorial, this.isPanelRight);

    // 2. Initialize Player on the grid
    this.player = new Player(this, this.grid);

    // In tutorial mode, make the player effectively invincible so they can't die
    // mid-lesson and interrupt the scripted flow.
    if (this.isTutorial) {
      this.player.isInvincible = true;
    }

    // Legacy chapterId=4: 3 lives
    if (isLegacyEndless) {
      this.player.hp = 3;
      this.player.maxHp = 3;
    }

    // Admin Test Mode: resolve before Boss starts so attackId is set in time
    this._adminCheckReady = this._checkAdminTestMode();

    // 3. Initialize Boss (attack logic only — sprite lives in HUDScene)
    this.boss = new Boss(this, this.grid, this.isTutorial);
    if (isLegacyEndless || this.isEndless) {
      this.boss.hp = Infinity;
      this.boss.maxHp = Infinity;
    }
    this.goldenTile = null;
    this.isUltimateActive = false;
    this._ultCooldown = false;

    if (!this.anims.exists('anim_symbol_alert')) {
      this.anims.create({ key: 'anim_symbol_alert', frames: this.anims.generateFrameNumbers('symbol_alert'), frameRate: 20, repeat: 0 });
      this.anims.create({ key: 'anim_symbol_alert2', frames: this.anims.generateFrameNumbers('symbol_alert2'), frameRate: 60, repeat: 0 });
      this.anims.create({ key: 'anim_lightning_burst', frames: this.anims.generateFrameNumbers('lightning_burst'), frameRate: 20, repeat: 0 });
      this.anims.create({ key: 'anim_attack_up', frames: this.anims.generateFrameNumbers('attack_up', { start: 0, end: 17 }), frameRate: 14, repeat: -1 });
      this.anims.create({ key: 'anim_smoke_up', frames: this.anims.generateFrameNumbers('smoke_up', { start: 0, end: 20 }), frameRate: 20, repeat: 0 });
      this.anims.create({ key: 'anim_chest1', frames: this.anims.generateFrameNumbers('chest1', { start: 0, end: 13 }), frameRate: 20, repeat: 0 });
      this.anims.create({ key: 'anim_chest2', frames: this.anims.generateFrameNumbers('chest2', { start: 0, end: 17 }), frameRate: 20, repeat: 0 });
      this.anims.create({ key: 'anim_chest3', frames: this.anims.generateFrameNumbers('chest3', { start: 0, end: 69 }), frameRate: 28, repeat: 0 });
      this.anims.create({ key: 'anim_chest4', frames: this.anims.generateFrameNumbers('chest4', { start: 0, end: 69 }), frameRate: 28, repeat: 0 });
      this.anims.create({ key: 'anim_villain_hp_up', frames: this.anims.generateFrameNumbers('villain_hp_up', { start: 0, end: 11 }), frameRate: 15, repeat: 0 });
      this.anims.create({ key: 'anim_lives_up', frames: this.anims.generateFrameNumbers('lives_up', { start: 0, end: 22 }), frameRate: 18, repeat: 0 });
      this.anims.create({ key: 'anim_lives_decreased', frames: this.anims.generateFrameNumbers('lives_decreased', { start: 105, end: 119 }), frameRate: 30, repeat: 0 });
      this.anims.create({ key: 'anim_frozen', frames: this.anims.generateFrameNumbers('frozen', { start: 0, end: 11 }), frameRate: 15, repeat: 0 });
      this.anims.create({ key: 'anim_bawang_effects', frames: this.anims.generateFrameNumbers('bawang_effects', { start: 0, end: 13 }), frameRate: 20, repeat: 0 });
      this.anims.create({ key: 'anim_chest_effects', frames: this.anims.generateFrameNumbers('chest_effects', { start: 0, end: 15 }), frameRate: 20, repeat: 0 });

      if (this.chapterId === 1) {
        this.anims.create({ key: 'anim_moving_hit', frames: this.anims.generateFrameNumbers('moving_hit', { start: 0, end: 43 }), frameRate: 30, repeat: 0 });
        this.anims.create({ key: 'anim_ch1_eye', frames: this.anims.generateFrameNumbers('ch1_eye'), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_eye_explosion', frames: this.anims.generateFrameNumbers('eye_explosion'), frameRate: 18, repeat: 0 });
      }

      
      // Compile Phase 5 Chapter 1 Blood Sequences into Animations
      if (this.chapterId === 1 && !this.anims.exists('anim_dark_blood')) {

        // Ultimate vortex animations
        this.anims.create({ key: 'anim_ult_start', frames: this.anims.generateFrameNumbers('ult_start', { start: 0, end: 7 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ult_loop', frames: this.anims.generateFrameNumbers('ult_loop', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ult_end', frames: this.anims.generateFrameNumbers('ult_end', { start: 0, end: 5 }), frameRate: 10, repeat: 0 });

        let dbFrames = [];
        for (let i = 0; i <= 14; i++) dbFrames.push({ key: `dark_blood_${i}` });
        this.anims.create({ key: 'anim_dark_blood', frames: dbFrames, frameRate: 15, repeat: -1 });

        let splatFrames = [];
        for (let i = 0; i <= 59; i++) splatFrames.push({ key: `blood_splat_${i.toString().padStart(3, '0')}` });
        this.anims.create({ key: 'anim_blood_splat', frames: splatFrames, frameRate: 30, repeat: 0 });
      }

      // ===== CHAPTER 2 ANIMATIONS =====
      if (this.chapterId === 2 && !this.anims.exists('anim_ch2_beeswarm_in')) {
        this.anims.create({ key: 'anim_ch2_beeswarm_in', frames: this.anims.generateFrameNumbers('ch2_beeswarm', { start: 0, end: 9 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_beeswarm_loop', frames: this.anims.generateFrameNumbers('ch2_beeswarm', { start: 10, end: 19 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'anim_ch2_beeswarm_out', frames: this.anims.generateFrameNumbers('ch2_beeswarm', { start: 20, end: 28 }), frameRate: 15, repeat: 0 });

        this.anims.create({ key: 'anim_ch2_hibiscus', frames: this.anims.generateFrameNumbers('ch2_hibiscus', { start: 0, end: 20 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_hibiscus_burst', frames: this.anims.generateFrameNumbers('ch2_hibiscus_burst', { start: 0, end: 37 }), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_vines_grow', frames: this.anims.generateFrameNumbers('ch2_vines', { start: 0, end: 11 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_vines_idle', frames: this.anims.generateFrameNumbers('ch2_vines', { start: 12, end: 17 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch2_vines_shrink', frames: this.anims.generateFrameNumbers('ch2_vines', { start: 18, end: 24 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_carrot', frames: this.anims.generateFrameNumbers('ch2_carrot', { start: 0, end: 27 }), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_eggs', frames: this.anims.generateFrameNumbers('ch2_eggs', { start: 0, end: 39 }), frameRate: 18, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_note_burst', frames: this.anims.generateFrameNumbers('ch2_note_burst', { start: 0, end: 20 }), frameRate: 24, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_bunnies', frames: this.anims.generateFrameNumbers('ch2_bunnies', { start: 0, end: 29 }), frameRate: 18, repeat: -1 });
        this.anims.create({ key: 'anim_ch2_golem_attack', frames: this.anims.generateFrameNumbers('ch2_golem_attack', { start: 0, end: 10 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch2_golem_die', frames: this.anims.generateFrameNumbers('ch2_golem_die', { start: 0, end: 12 }), frameRate: 14, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_notes', frames: this.anims.generateFrameNumbers('ch2_notes', { start: 0, end: 16 }), frameRate: 18, repeat: 0 });

        // Plant melee — Plant3_Attack.png row order:
        // Row 1 (0-6)  = down, Row 2 (7-13) = UP, Row 3 (14-20) = left, Row 4 (21-27) = right
        this.anims.create({ key: 'anim_ch2_plant_melee_down',  frames: this.anims.generateFrameNumbers('ch2_plant_melee', { start: 0,  end: 6  }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_plant_melee_up',    frames: this.anims.generateFrameNumbers('ch2_plant_melee', { start: 7,  end: 13 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_plant_melee_left',  frames: this.anims.generateFrameNumbers('ch2_plant_melee', { start: 14, end: 20 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_plant_melee_right', frames: this.anims.generateFrameNumbers('ch2_plant_melee', { start: 21, end: 27 }), frameRate: 12, repeat: 0 });

        // Plant ranged — Plant1_Attack.png row order:
        // Row 3 (14-20) = facing LEFT, Row 4 (21-27) = facing RIGHT
        this.anims.create({ key: 'anim_ch2_plant_ranged_down',  frames: this.anims.generateFrameNumbers('ch2_plant_ranged', { start: 0,  end: 6  }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_plant_ranged_up',    frames: this.anims.generateFrameNumbers('ch2_plant_ranged', { start: 7,  end: 13 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_plant_ranged_left',  frames: this.anims.generateFrameNumbers('ch2_plant_ranged', { start: 14, end: 20 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_plant_ranged_right', frames: this.anims.generateFrameNumbers('ch2_plant_ranged', { start: 21, end: 27 }), frameRate: 12, repeat: 0 });

        // Acid chain
        this.anims.create({ key: 'anim_ch2_acid_charge', frames: this.anims.generateFrameNumbers('ch2_acid_charge', { start: 0, end: 9 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_acid_burst', frames: this.anims.generateFrameNumbers('ch2_acid_charge', { start: 10, end: 15 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch2_acid_travel', frames: this.anims.generateFrameNumbers('ch2_acid_travel', { start: 0, end: 11 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'anim_ch2_acid_end', frames: this.anims.generateFrameNumbers('ch2_acid_end', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
        // Horizontal row projectile: first 10 frames of Acid-01.png (the mouth/launch animation)
        this.anims.create({ key: 'anim_ch2_acid_projectile', frames: this.anims.generateFrameNumbers('ch2_acid_charge', { start: 0, end: 9 }), frameRate: 15, repeat: -1 });
      }

      // ===== CHAPTER 3 ANIMATIONS =====
      if (this.chapterId === 3 && !this.anims.exists('anim_ch3_bat_fly')) {
        // Blue FX (4 frames of 32x32 each)
        this.anims.create({ key: 'anim_ch3_fx_bubble',    frames: this.anims.generateFrameNumbers('ch3_fx_bubble',    { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fx_sonic',     frames: this.anims.generateFrameNumbers('ch3_fx_sonic',     { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fx_fireblade', frames: this.anims.generateFrameNumbers('ch3_fx_fireblade', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fx_darkorbit', frames: this.anims.generateFrameNumbers('ch3_fx_darkorbit', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fx_thunder',   frames: this.anims.generateFrameNumbers('ch3_fx_thunder',   { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fx_ring',      frames: this.anims.generateFrameNumbers('ch3_fx_ring',      { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fx_whirl',     frames: this.anims.generateFrameNumbers('ch3_fx_whirl',     { start: 0, end: 3 }), frameRate: 10, repeat: -1 });

        // Smoke (13 frames of 64x64)
        this.anims.create({ key: 'anim_ch3_smoke', frames: this.anims.generateFrameNumbers('ch3_smoke_spawn', { start: 0, end: 12 }), frameRate: 18, repeat: 0 });

        // Bat – IdleFly: 9 frames; Attack: 8 frames
        this.anims.create({ key: 'anim_ch3_bat_fly', frames: this.anims.generateFrameNumbers('ch3_bat_fly', { start: 0, end: 8 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_bat_hit', frames: this.anims.generateFrameNumbers('ch3_bat_hit', { start: 0, end: 7 }), frameRate: 18, repeat: 0 });

        // Fish King (8 frames per sheet)
        this.anims.create({ key: 'anim_ch3_fishking_idle',  frames: this.anims.generateFrameNumbers('ch3_fishking_idle',  { start: 0, end: 7 }), frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_fishking_wand',  frames: this.anims.generateFrameNumbers('ch3_fishking_wand',  { start: 0, end: 7 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_fishking_spell', frames: this.anims.generateFrameNumbers('ch3_fishking_spell', { start: 0, end: 7 }), frameRate: 12, repeat: 0 });

        // Jellyfish
        this.anims.create({ key: 'anim_ch3_jelly_idle',   frames: this.anims.generateFrameNumbers('ch3_jelly_idle',   { start: 0, end: 3 }), frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_jelly_walk',   frames: this.anims.generateFrameNumbers('ch3_jelly_walk',   { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_jelly_death',  frames: this.anims.generateFrameNumbers('ch3_jelly_death',  { start: 0, end: 5 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_jelly_attack', frames: this.anims.generateFrameNumbers('ch3_jelly_attack', { start: 0, end: 3 }), frameRate: 12, repeat: 0 });

        // Shark
        this.anims.create({ key: 'anim_ch3_shark_idle',   frames: this.anims.generateFrameNumbers('ch3_shark_idle',   { start: 0, end: 3 }), frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_shark_walk',   frames: this.anims.generateFrameNumbers('ch3_shark_walk',   { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_shark_attack', frames: this.anims.generateFrameNumbers('ch3_shark_attack', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });


        // Monster2Pack (24 frames)
        this.anims.create({ key: 'anim_ch3_monster2', frames: this.anims.generateFrameNumbers('ch3_monster2', { start: 0, end: 23 }), frameRate: 12, repeat: 0 });
        // Monster6Pack (32 frames)
        this.anims.create({ key: 'anim_ch3_monster6', frames: this.anims.generateFrameNumbers('ch3_monster6', { start: 0, end: 31 }), frameRate: 10, repeat: 0 });
        // Explosion2 (18 frames)
        this.anims.create({ key: 'anim_ch3_explosion2', frames: this.anims.generateFrameNumbers('ch3_explosion2', { start: 0, end: 17 }), frameRate: 15, repeat: 0 });

        // Nemo – all 64x64, 4 frames each (2x2 grids)
        this.anims.create({ key: 'anim_ch3_nemo',        frames: this.anims.generateFrameNumbers('ch3_nemo_swim',   { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_nemo_chomp',  frames: this.anims.generateFrameNumbers('ch3_nemo_chomp',  { start: 0, end: 3 }), frameRate: 14, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_nemo_diagdn', frames: this.anims.generateFrameNumbers('ch3_nemo_diagdn', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_nemo_diagup', frames: this.anims.generateFrameNumbers('ch3_nemo_diagup', { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_nemo_tiltdn', frames: this.anims.generateFrameNumbers('ch3_nemo_tiltdn', { start: 0, end: 3 }), frameRate: 14, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_nemo_tiltup', frames: this.anims.generateFrameNumbers('ch3_nemo_tiltup', { start: 0, end: 3 }), frameRate: 14, repeat: 0 });

        // Snake – 2 rows x 7 cols = 14 frames of 64x64, faces LEFT
        this.anims.create({ key: 'anim_ch3_snake', frames: this.anims.generateFrameNumbers('ch3_snake', { start: 0, end: 13 }), frameRate: 12, repeat: -1 });

        // Sirens
        this.anims.create({ key: 'anim_ch3_siren1',         frames: this.anims.generateFrameNumbers('ch3_siren1'),         frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_siren2',         frames: this.anims.generateFrameNumbers('ch3_siren2'),         frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_siren3_idle',    frames: this.anims.generateFrameNumbers('ch3_siren3_idle'),    frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_siren3_special', frames: this.anims.generateFrameNumbers('ch3_siren3_special'), frameRate: 10, repeat: 0 });

        // Cthulhu rows (15 frames per row)
        this.anims.create({ key: 'anim_ch3_cthulhu_idle',  frames: this.anims.generateFrameNumbers('ch3_cthulhu', { start: 0,  end: 14 }), frameRate: 8,  repeat: -1 });
        this.anims.create({ key: 'anim_ch3_cthulhu_fly',   frames: this.anims.generateFrameNumbers('ch3_cthulhu', { start: 30, end: 44 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_cthulhu_slash', frames: this.anims.generateFrameNumbers('ch3_cthulhu', { start: 45, end: 59 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_cthulhu_cast',  frames: this.anims.generateFrameNumbers('ch3_cthulhu', { start: 60, end: 74 }), frameRate: 12, repeat: 0 });



        // Water Beams
        this.anims.create({ key: 'anim_ch3_darkbolt',    frames: this.anims.generateFrameNumbers('ch3_darkbolt',    { start: 0, end: 11 }), frameRate: 15, repeat: 0  });
        this.anims.create({ key: 'anim_ch3_firebomb',    frames: this.anims.generateFrameNumbers('ch3_firebomb',    { start: 0, end: 14 }), frameRate: 15, repeat: 0  });
        this.anims.create({ key: 'anim_ch3_lightning',   frames: this.anims.generateFrameNumbers('ch3_lightning',   { start: 0, end: 10 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_spark',       frames: this.anims.generateFrameNumbers('ch3_spark',       { start: 0, end: 7  }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_tide_lightning', frames: this.anims.generateFrameNumbers('ch3_tide_lightning', { start: 0, end: 10 }), frameRate: 12, repeat: -1 });
        // waterspiral: 192x32 → 6 frames of 32x32
        this.anims.create({ key: 'anim_ch3_waterspiral', frames: this.anims.generateFrameNumbers('ch3_waterspiral', { start: 0, end: 5  }), frameRate: 12, repeat: -1 });
        // waterbeam/2: 4 frames each, looping
        this.anims.create({ key: 'anim_ch3_waterbeam',   frames: this.anims.generateFrameNumbers('ch3_waterbeam',   { start: 0, end: 3  }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_waterbeam2',  frames: this.anims.generateFrameNumbers('ch3_waterbeam2',  { start: 0, end: 3  }), frameRate: 12, repeat: -1 });
        // waterburst: 6 frames, plays once
        this.anims.create({ key: 'anim_ch3_waterburst',  frames: this.anims.generateFrameNumbers('ch3_waterburst',  { start: 0, end: 5  }), frameRate: 15, repeat: 0 });
        // Multi-directional beam swirl (6×5 = 30 frames)
        this.anims.create({ key: 'anim_ch3_beam_multidir', frames: this.anims.generateFrameNumbers('ch3_beam_multidir', { start: 0, end: 29 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_light_showers', frames: this.anims.generateFrameNumbers('ch3_light_showers', { start: 0, end: 11 }), frameRate: 15, repeat: 0 });
        // DitheredFire ultimate effect - 30 frames, loops continuously
        this.anims.create({ key: 'anim_ch3_dithered_fire', frames: this.anims.generateFrameNumbers('ch3_dithered_fire', { start: 0, end: 29 }), frameRate: 12, repeat: -1 });
        // Water beam ultimate effect - 30 frames, loops continuously
        this.anims.create({ key: 'anim_ch3_water_beam', frames: this.anims.generateFrameNumbers('ch3_water_beam', { start: 0, end: 29 }), frameRate: 15, repeat: -1 });
        
        // Siren1 animations - Walk (13 frames looping), Attack (10 frames once)
        this.anims.create({ key: 'anim_ch3_siren1_walk',   frames: this.anims.generateFrameNumbers('ch3_siren1_walk',   { start: 0, end: 12 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'anim_ch3_siren1_attack', frames: this.anims.generateFrameNumbers('ch3_siren1_attack', { start: 0, end: 9  }), frameRate: 12, repeat: 0 });
        
        // Eye explosion for damage effects (9x1 frames)
        this.anims.create({ key: 'anim_eye_explosion', frames: this.anims.generateFrameNumbers('eye_explosion', { start: 0, end: 8 }), frameRate: 15, repeat: 0 });

        this.anims.create({ key: 'anim_ch3_explosion_1', frames: this.anims.generateFrameNumbers('ch3_explosion_1', { start: 0, end: 12 }), frameRate: 15, repeat: 0 }); // 1040/80=13f
        this.anims.create({ key: 'anim_ch3_explosion_2', frames: this.anims.generateFrameNumbers('ch3_explosion_2', { start: 0, end: 7 }), frameRate: 15, repeat: 0 });  // 384/48=8f
        this.anims.create({ key: 'anim_ch3_explosion_3', frames: this.anims.generateFrameNumbers('ch3_explosion_3', { start: 0, end: 6 }), frameRate: 15, repeat: 0 });  // 336/48=7f
        this.anims.create({ key: 'anim_ch3_explosion_4', frames: this.anims.generateFrameNumbers('ch3_explosion_4', { start: 0, end: 11 }), frameRate: 15, repeat: 0 }); // 1536/128=12f

        this.anims.create({ key: 'anim_ch3_explosion_2a', frames: this.anims.generateFrameNumbers('ch3_explosion_2a', { start: 0, end: 9 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_explosion_3a', frames: this.anims.generateFrameNumbers('ch3_explosion_3a', { start: 0, end: 21 }), frameRate: 15, repeat: 0 }); // 4224/192=22f


        this.anims.create({ key: 'anim_ch3_explosion_1d', frames: this.anims.generateFrameNumbers('ch3_explosion_1d', { start: 0, end: 7 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_explosion_2d', frames: this.anims.generateFrameNumbers('ch3_explosion_2d', { start: 0, end: 9 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'anim_ch3_explosion_3d', frames: this.anims.generateFrameNumbers('ch3_explosion_3d', { start: 0, end: 21 }), frameRate: 15, repeat: 0 }); // 4224/192=22f
      }
    }

    // Persistent entities for Chapter 2 (melee/ranged plants)
    this.persistentEntities = [];

    // --- GAME LOGIC EVENTS ---

    this.events.on('projectile:landed', (col, row) => {
      // Play chapter-specific impact SFX
      audioManager.playImpact(this.chapterId);
      if (this.player.col === col && this.player.row === row) {
        this.player.takeDamage();
      }
    });

    this.events.on('damageTile:spawned', (col, row) => {
      this.goldenTile = { col, row };
      const pos = this.grid.getPixelPosition(col, row);

      // 1. Play smoke intro (1050ms total at 20fps × 21 frames)
      if (this.chapterId === 1) audioManager.play('sfx_smoke');
      const smoke = this.add.sprite(pos.x, pos.y, 'smoke_up')
        .setDisplaySize(this.grid.tileSize * 1.4, this.grid.tileSize * 1.4)
        .setDepth(16)
        .play('anim_smoke_up');
      // Smoke self-destructs when done — no waiting needed
      smoke.once('animationcomplete', () => smoke.destroy());

      // 2. Emerge attack_up at the MIDPOINT of the smoke (525ms) while smoke is still playing
      this.time.delayedCall(525, () => {
        if (!this.goldenTile || this.goldenTile.col !== col || this.goldenTile.row !== row) return;
        audioManager.play('sfx_sword_spawn');
        const shadow = this.add.ellipse(pos.x, pos.y + 20, 35, 15, 0x000000).setDepth(14).setAlpha(0);

        const glowSpr = this.add.sprite(pos.x, pos.y, 'attack_up')
          .setDisplaySize(this.grid.tileSize * 0.85, this.grid.tileSize * 0.85)
          .setDepth(14.5)
          .setAlpha(0)
          .setTint(0xffaa00)
          .setBlendMode(Phaser.BlendModes.ADD)
          .play('anim_attack_up');

        const spr = this.add.sprite(pos.x, pos.y, 'attack_up')
          .setDisplaySize(this.grid.tileSize * 0.75, this.grid.tileSize * 0.75)
          .setDepth(15)
          .setAlpha(0)
          .play('anim_attack_up');

        // Scale-pop from slightly bigger then fade+pulse
        spr.setScale(spr.scaleX * 1.4);
        glowSpr.setScale(glowSpr.scaleX * 1.4);

        this.tweens.add({
          targets: [spr, glowSpr], alpha: 1, scaleX: spr.scaleX / 1.4, scaleY: spr.scaleY / 1.4,
          duration: 250, ease: 'Back.easeOut',
          onComplete: () => {
            if (!spr.active || !glowSpr.active) return;
            this.tweens.add({ targets: spr, alpha: 0.8, yoyo: true, repeat: -1, duration: 400 });
            this.tweens.add({ targets: glowSpr, alpha: 0.4, scaleX: glowSpr.scaleX * 1.1, scaleY: glowSpr.scaleY * 1.1, yoyo: true, repeat: -1, duration: 400 });
          }
        });
        this.tweens.add({ targets: shadow, alpha: 0.4, duration: 250 });

        this.goldenTile.sprite = spr;
        this.goldenTile.glow = glowSpr;
        this.goldenTile.shadow = shadow;
      });
    });


    this.events.on('damageTile:despawned', (col, row) => {
      if (this.goldenTile && this.goldenTile.col === col && this.goldenTile.row === row) {
        if (this.goldenTile.sprite) {
          this.tweens.killTweensOf([this.goldenTile.sprite, this.goldenTile.glow]);
          this.goldenTile.sprite.destroy();
        }
        if (this.goldenTile.glow) this.goldenTile.glow.destroy();
        if (this.goldenTile.shadow) {
          this.tweens.killTweensOf(this.goldenTile.shadow);
          this.goldenTile.shadow.destroy();
        }
        this.goldenTile = null;
      }
    });

    this.events.on('player:moved', (col, row) => {
      if (this.goldenTile && this.goldenTile.col === col && this.goldenTile.row === row) {
        if (this.goldenTile.sprite) {
          this.tweens.killTweensOf([this.goldenTile.sprite, this.goldenTile.glow]);
          this.goldenTile.sprite.destroy();
        }
        if (this.goldenTile.glow) this.goldenTile.glow.destroy();
        if (this.goldenTile.shadow) {
          this.tweens.killTweensOf(this.goldenTile.shadow);
          this.goldenTile.shadow.destroy();
        }
        audioManager.play('sfx_sword_pickup');
        this.events.emit('damageTile:collected');
        this.boss.takeDamage();

        // Add score for collecting golden tile (regular chapters only)
        if (!this.isEndless) {
          this.chapterScore += 1000; // 1000 points per golden tile
          const hud = this.scene.get('HUDScene');
          if (hud && hud.updateScore) hud.updateScore(this.chapterScore);
        }

        // Fire chapter-colored particles from the tile toward the boss
        const hitPos = this.grid.getPixelPosition(col, row);
        this._spawnPickupBurst(hitPos.x, hitPos.y);
        this.launchAttackParticles(hitPos.x, hitPos.y);
        this.goldenTile = null;
        this.grid.render();
      }
      // Check for chest collision
      if (this.grid.hasChestAt(col, row)) {
        const rarity = this.grid.removeChestAt(col, row);
        this.events.emit('chest:opened', rarity);
      }

      // Check for ruby collision
      if (this.grid.hasRubyAt(col, row)) {
        this.grid.removeRubyAt(col, row);
        this.events.emit('ruby:collected');
      }

      // Check for diamond collision
      if (this.grid.hasDiamondAt(col, row)) {
        this.grid.removeDiamondAt(col, row);
        this.events.emit('diamond:collected');
      }

      // Check for bawang collision (lives up)
      if (this.grid.hasBawangAt(col, row)) {
        this.grid.removeBawangAt(col, row);
        this.events.emit('bawang:collected');
      }

    });

    this.events.on('bawang:collected', () => {
      // Heal one full heart (+2 HP since max is 6 and there are 3 hearts)
      if (this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.hp + 2, this.player.maxHp);
        this.events.emit('player:health_changed', this.player.hp);
      }

      const px = this.player.sprite.x;
      const py = this.player.sprite.y;

      // Show lives up effect — starts at player center, floats upward while animating
      const fx = this.add.sprite(px, py, 'lives_up').play('anim_lives_up').setDepth(300);
      fx.setScale(0.8);
      const animDuration = (23 / 18) * 1000; // 23 frames at 18fps
      this.tweens.add({ targets: fx, y: py - 80, duration: animDuration, ease: 'Sine.easeOut' });
      fx.once('animationcomplete', () => fx.destroy());

      // Show healing text
      const txt = this.add.text(px, py - 60, '+1 HEART!', {
        fontFamily: 'VCR', fontSize: '22px', color: '#ff4444', stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(300);
      this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
    });

    this.events.on('diamond:collected', () => {
      // Freeze the player
      this.player.isFrozen = true;
      this.player.sprite.setTint(0x00ffff);
      this.time.delayedCall(2000, () => {
        this.player.isFrozen = false;
        this.player.sprite.clearTint();
      });

      const px = this.player.sprite.x;
      const py = this.player.sprite.y;

      const fx = this.add.sprite(px, py - 40, 'frozen').play('anim_frozen').setDepth(300);
      fx.setScale(1.2);
      fx.once('animationcomplete', () => fx.destroy());

      const txt = this.add.text(px, py - 60, 'FROZEN!', {
        fontFamily: 'VCR', fontSize: '20px', color: '#00ffff', stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(300);
      this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
    });

    this.events.on('ruby:collected', () => {
      // Heal half a heart (+1 HP since max is 6 and there are 3 hearts)
      if (this.player.hp < this.player.maxHp) {
        this.player.hp++;
        this.events.emit('player:health_changed', this.player.hp);
      }

      const px = this.player.sprite.x;
      const py = this.player.sprite.y;

      const fx = this.add.sprite(px, py - 40, 'lives_up').play('anim_lives_up').setDepth(300);
      // Slightly scale up for visibility
      fx.setScale(1.2);
      fx.once('animationcomplete', () => fx.destroy());

      const txt = this.add.text(px, py - 60, '+1/2 HP', {
        fontFamily: 'VCR', fontSize: '18px', color: '#ff4444', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(300);
      this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
    });

    this.events.on('chest:opened', (rarity) => {
      // Play positive pickup SFX
      audioManager.play('sfx_ui_click');
      // ── Particle Burst (grey / blue / gold by rarity) ──
      const particleColors = [0x999999, 0x44aaff, 0xffdd00];
      const px = this.player.sprite.x;
      const py = this.player.sprite.y;
      const burstColor = particleColors[rarity] ?? 0x999999;

      // Increased particle count and velocity for a juicier pop
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.2;
        const speed = Phaser.Math.Between(100, 220);
        const prt = this.add.graphics().setDepth(250);
        prt.fillStyle(burstColor, 1);
        prt.fillCircle(0, 0, Phaser.Math.Between(3, 7)); // Larger particles
        prt.x = px; prt.y = py - 10;
        this.tweens.add({
          targets: prt,
          x: px + Math.cos(angle) * speed,
          y: py - 10 + Math.sin(angle) * speed,
          alpha: 0,
          duration: 700,
          ease: 'Cubic.easeOut', // Makes it explode fast then slow down
          onComplete: () => prt.destroy()
        });
      }

      // ── Pick a random power-up within the rarity tier ──

      if (rarity === 8) {
        // Cursed chest — heals the boss!
        if (this.boss && this.boss.heal) {
          this.boss.heal(1);
        }

        const txt = this.add.text(px, py - 60, 'CURSED!', {
          fontFamily: 'VCR', fontSize: '20px',
          color: '#ff0000',
          stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2200, onComplete: () => txt.destroy() });
        return; // Don't give a powerup
      }

      const pools = [
        // Common (rarity 0) — grey
        [
          { name: 'SPEED BOOST', apply: () => this._applyBuff('speed', 5000) },
          { name: 'SIGHT', apply: () => this._applyBuff('sight', 7000) },
          { name: 'COUNTER', apply: () => this._applyBuff('counter', 0) },
        ],
        // Rare (rarity 1) — blue
        [
          { name: 'TRIPLE DASH', apply: () => this._applyBuff('dash', 3) },
          { name: 'OVERCLOCK', apply: () => this._applyBuff('overclock', 8000) },
        ],
        // Legendary (rarity 2) — gold
        [
          { name: 'INVINCIBILITY', apply: () => this._applyBuff('invincible', 5000) },
          { name: 'TIME STOP', apply: () => this._applyBuff('timestop', 3000) },
          { name: 'BLINK', apply: () => this._applyBuff('blink', 0) },
        ],
      ];

      const pool = pools[rarity] ?? pools[0];
      const chosen = Phaser.Math.RND.pick(pool);
      const DURATION = [5000, 5000, 5000][rarity] ?? 5000;
      chosen.apply();

      // Floating text feedback
      const msgColors = ['#aaaaaa', '#44aaff', '#ffdd00'];
      const txt = this.add.text(px, py - 40, chosen.name, {
        fontFamily: 'VCR', fontSize: '18px',
        color: msgColors[rarity] ?? '#ffffff',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(300);
      this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2200, onComplete: () => txt.destroy() });
    });

    this.events.on('player:health_changed', (hp) => {
      const hud = this.scene.get('HUDScene');
      if (hud && hud.updateLives) hud.updateLives(hp);
    });

    this.events.on('boss:damaged', (current, max) => {
      // Play boss hit SFX
      audioManager.play(`sfx_melee_hit`);
      const hud = this.scene.get('HUDScene');
      if (hud && hud.updateBossHp) hud.updateBossHp(current, max);

      if (this.chapterId === 1 && current <= 600 && !this._horizontalProjectilesStarted) {
        this._horizontalProjectilesStarted = true;
        this.queueHorizontalProjectile();
      }
      // Revenge Ultimate: 2s after player damages boss
      if (this.chapterId === 1 && !this._ultCooldown && !this.isGameOver) {
        this._ultCooldown = true;
        this.time.delayedCall(2000, () => {
          if (!this.isGameOver && this.boss && this.boss.hp > 0) this._triggerUltimate();
        });
        // Cooldown: won't trigger again for 25s
        this.time.delayedCall(25000, () => { this._ultCooldown = false; });
      }
    });

    this.events.on('boss:ch2_ult', () => {
      // Play ultimate explosion SFX
      audioManager.play('sfx_explosion');
      const hud = this.scene.get('HUDScene');
      if (hud && hud.playBossUltAttack) hud.playBossUltAttack();
    });

    this.events.on('boss:ch3_ult', () => {
      // Play ultimate explosion SFX
      audioManager.play('sfx_explosion');
      const hud = this.scene.get('HUDScene');
      if (hud && hud.playBossUltAttack) hud.playBossUltAttack();
    });

    this.events.on('boss:attack', () => {
      // Play chapter-specific spawn/attack SFX
      audioManager.playSpawn(this.chapterId);
      const hud = this.scene.get('HUDScene');
      if (hud && hud.playBossAttack) hud.playBossAttack();

      // 20% chance to play player VO on boss attack (reaction line)
      if (Math.random() < 0.2) {
        audioManager.playRandomPlayerVO(this.chapterId, { volume: 0.8, forceGeneric: true });
      }

      // Spawn alert over player
      if (this.player && this.player.sprite) {
        const alertSpr = this.add.sprite(this.player.sprite.x, this.player.sprite.y - 60, 'symbol_alert');
        alertSpr.setScale(1.2).setDepth(200);
        alertSpr.play('anim_symbol_alert');
        audioManager.play('sfx_telegraph', { volume: 0.4 });
        alertSpr.once('animationcomplete', () => alertSpr.destroy());
      }
    });

    this.events.on('player:died', () => this.showGameOver(false));
    this.events.on('boss:died', () => {
      if (this.isEndless) return;
      this.showGameOver(true);
    });

    this.events.on('inf:wave', (waveNum, speed) => {
      if (!this.isEndless) return;
      this.endlessWaves = waveNum;
      const displayWaves = this.endlessWaves;
      const hud = this.scene.get('HUDScene');
      // Perfect wave: player took no damage this wave → grow combo streak (cap ×5.0)
      if (this.player && this.player.hp >= this._endlessLastPlayerHp) {
        this.endlessPerfectWaves++;
        this.endlessCombo = Math.min(5.0, 1.0 + this.endlessPerfectWaves * 0.2);
      } else {
        // Took damage — reset streak back to 1x
        this.endlessCombo = 1.0;
        this.endlessPerfectWaves = 0;
      }
      this._endlessLastPlayerHp = this.player ? this.player.hp : 6;
      // Add 100 points per wave × combo — score only ever goes up
      this.endlessScore += Math.floor(100 * this.endlessCombo);
      if (hud && hud.updateScore) hud.updateScore(this.endlessScore);
      if (hud && hud.updateInfWave) hud.updateInfWave(displayWaves, this.endlessCombo, speed);
    });

    // Endless mode: sword pickup gives flat bonus × combo — always additive
    this.events.on('damageTile:collected', () => {
      if (!this.isEndless) return;
      this.endlessTilesCollected++;
      this.endlessScore += Math.floor(500 * this.endlessCombo);
      const hud = this.scene.get('HUDScene');
      if (hud && hud.updateScore) hud.updateScore(this.endlessScore);
    });

    // Regular chapters: time-based score update every second (10 points per second)
    if (!this.isEndless) {
      this.time.addEvent({
        delay: 1000,
        repeat: -1,
        callback: () => {
          if (this.isGameOver || !this.boss || this.boss.hp <= 0) return;
          this.chapterScore += 10; // 10 points per second survived
          const hud = this.scene.get('HUDScene');
          if (hud && hud.updateScore) hud.updateScore(this.chapterScore);
        }
      });
    }

    // ─── Helper: Generate the particle texture (chapter-colored) ────────────────
    // Chapter 1 = red, Chapter 2 = gold, Chapter 3 = blue
    const chapterParticleColor = this.chapterId === 1 ? 0xFF2200 : this.chapterId === 3 ? 0x22AAFF : 0xFFD700;
    const chapterParticleKey = `attack_particle_ch${this.chapterId}`;
    if (!this.textures.exists(chapterParticleKey)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(chapterParticleColor, 1);
      g.fillRect(0, 0, 8, 8);
      g.fillStyle(0xFFFFFF, 0.8);
      g.fillRect(2, 2, 4, 4); // inner highlight
      g.generateTexture(chapterParticleKey, 8, 8);
      g.destroy();
    }
    this._chapterParticleKey = chapterParticleKey;
    this._chapterParticleColor = chapterParticleColor;

    // In endless mode, start horizontal projectiles on a timer for Chapter 1 only
    if (this.isEndless && this.chapterId === 1 && !this._horizontalProjectilesStarted) {
      this.time.delayedCall(5000, () => {
        if (!this.isGameOver && !this._horizontalProjectilesStarted) {
          this._horizontalProjectilesStarted = true;
          this.queueHorizontalProjectile();
        }
      });
    }

    // Launch HUD
    this.scene.launch('HUDScene', { chapterId: this.chapterId, character: this.character, control: this.control, isPracticeTutorial: this.isPracticeTutorial, isEndless: this.isEndless });

    // Gesture controller — only active when gesture control was selected
    if (this.control === 'gesture') {
      this.unsubGesture = state.on('gesture:detected', (direction) => {
        this.handleGesture(direction);
      });
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    // (Cheat codes removed for production security and leaderboard integrity)

    this.horizontalProjectiles = this.add.group();
    this._horizontalProjectilesStarted = false;

    // --- KILL CAM LOGIC ---
    state.set('killCamImages', []);
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        if (this.isGameOver) return;
        
        // Capture the webcam feed instead of the game screen
        const videoEl = document.getElementById('game-video');
        if (videoEl && videoEl.videoWidth > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
          const ctx = canvas.getContext('2d');
          // Mirror horizontally so the output matches natural selfie orientation
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          // Reset transform before any further drawing
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          
          let images = state.get('killCamImages') || [];
          images.push(dataUrl);
          if (images.length > 4) {
            images.shift();
          }
          state.set('killCamImages', images);
        }
      }
    });

    state.emit('game:scene_created');
  }

  handleGesture(direction) {
    if (this.isGameOver) return;
    if (direction === 'idle') {
      this._heldGesture = null;
      return;
    }
    const dir = direction.toLowerCase();
    // Single tap: always fire immediately
    this.player.move(dir);
    // Track for hold — if gesture stays non-idle, update() will repeat
    this._heldGesture = dir;
    this._gestureHoldTimer = 0;
  }

  _triggerUltimate() {
    if (this.isGameOver || !this.boss || this.boss.hp <= 0) return;
    this.isUltimateActive = true;

    const hud = this.scene.get('HUDScene');
    if (hud && hud.playBossUltAttack) hud.playBossUltAttack();

    // Play Chapter 1 ultimate SFX
    audioManager.play('ch1_ultimate', { volume: 0.9 });

    const { width, height } = this.scale;
    const panelWidth = Math.max(width < 768 ? 160 : 250, Math.min(450, width * 0.28));
    const panelX = this.isPanelRight ? width - panelWidth : 0;

    // Pick a random target tile (slightly away from grid edges for drama)
    const tC = Phaser.Math.Between(1, this.grid.cols - 2);
    const tR = Phaser.Math.Between(1, this.grid.rows - 2);
    const targetPos = this.grid.getPixelPosition(tC, tR);
    const gridW = this.grid.cols * this.grid.tileSize;

    // Smaller vortex — roughly 1 tile size worth
    const vortexScale = (this.grid.tileSize / 128) * 2.2;

    // "REVENGE!" warning text (smaller)
    this.cameras.main.shake(500, 0.015);

    // Throw vortex from the villain sprite position in the side panel.
    // Boss sprite center in HUDScene: bossCenterX = panelX + panelWidth/2, bossCenterY = 155 + bossBoxH/2
    // bossBoxH = (height - 155) * 0.38
    const bossBoxH = Math.floor((height - 155) * 0.38);
    const throwFromX = panelX + panelWidth / 2;
    const throwFromY = 155 + bossBoxH / 2;

    const revengeText = this.add.text(targetPos.x, targetPos.y - 55, 'REVENGE!', {
      fontFamily: 'GigaSaturn', fontSize: '20px', color: '#ff0000',
      stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(600);
    this.tweens.add({
      targets: revengeText, alpha: 0, y: revengeText.y - 35, duration: 1400,
      onComplete: () => revengeText.destroy()
    });

    const vortex = this.add.sprite(throwFromX, throwFromY, 'ult_start')
      .setScale(vortexScale * 0.3).setDepth(50).setAlpha(0.9);

    // === PHASE 1: Throw (fly + grow toward target) ===
    this.tweens.add({
      targets: vortex,
      x: targetPos.x, y: targetPos.y,
      scaleX: vortexScale, scaleY: vortexScale,
      duration: 700, ease: 'Power2',
      onComplete: () => {
        // Play start anim on landing
        vortex.play('anim_ult_start');
        audioManager.play('ch1_vortex_spawn', { volume: 1.0 });
        this.cameras.main.shake(300, 0.02);

        // "RESIST!" hint
        const hintTxt = this.add.text(targetPos.x, targetPos.y - 70, 'RESIST THE PULL!', {
          fontFamily: 'GigaSaturn', fontSize: '18px', color: '#ff6600',
          stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(601);
        this.tweens.add({
          targets: hintTxt, alpha: 0, y: hintTxt.y - 40, duration: 2000,
          onComplete: () => hintTxt.destroy()
        });

        // === PHASE 2: Loop (blackhole active for 3s) ===
        vortex.once('animationcomplete', () => {
          vortex.play('anim_ult_loop');

          // Pulsing glow ring around vortex tile
          const glowRing = this.add.graphics().setDepth(9);
          const pulseGlow = this.tweens.add({
            targets: glowRing, alpha: 0.2, yoyo: true, repeat: -1, duration: 300
          });

          // Pull the player toward vortex every 1 second, 3 times
          let pullsDone = 0;
          const PULL_COUNT = 3;
          const pullTimer = this.time.addEvent({
            delay: 1000,
            repeat: PULL_COUNT - 1,
            callback: () => {
              pullsDone++;
              if (this.isGameOver || !this.player) return;

              // Draw glow ring
              glowRing.clear();
              glowRing.lineStyle(4, 0xff2200, 0.8);
              glowRing.strokeCircle(targetPos.x, targetPos.y, (PULL_COUNT - pullsDone + 1) * 30);

              audioManager.play('ch1_vortex_pull', { volume: 0.7 });

              // Calculate pull direction (one tile toward vortex)
              const dc = Math.sign(tC - this.player.col);
              const dr = Math.sign(tR - this.player.row);
              const newCol = Phaser.Math.Clamp(this.player.col + dc, 0, this.grid.cols - 1);
              const newRow = Phaser.Math.Clamp(this.player.row + dr, 0, this.grid.rows - 1);

              // Only pull if there's movement to do
              if (newCol !== this.player.col || newRow !== this.player.row) {
                this.player.col = newCol;
                this.player.row = newRow;
                const newPos = this.grid.getPixelPosition(newCol, newRow);

                // Slide player toward vortex
                this.tweens.add({
                  targets: this.player.sprite,
                  x: newPos.x, y: newPos.y,
                  duration: 250, ease: 'Power2'
                });

                // Visual: floating "PULL!" text over player
                const pullTxt = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, 'PULL!', {
                  fontFamily: 'VCR', fontSize: '16px', color: '#ff4400', stroke: '#000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(602);
                this.tweens.add({
                  targets: pullTxt, alpha: 0, y: pullTxt.y - 30, duration: 600,
                  onComplete: () => pullTxt.destroy()
                });

                this.events.emit('player:moved', newCol, newRow);
              }

              // Damage if sucked onto vortex tile
              if (this.player.col === tC && this.player.row === tR && !this.player.isInvincible) {
                this.player.takeDamage();
                this.cameras.main.shake(200, 0.03);
              }
            }
          });

          // === PHASE 3: After 3s loop — end vortex ===
          this.time.delayedCall(3000, () => {
            pullTimer.remove();
            pulseGlow.stop();
            glowRing.destroy();

            vortex.play('anim_ult_end');
            vortex.once('animationcomplete', () => vortex.destroy());

            this.isUltimateActive = false;
          });
        });
      }
    });
  }

  _applyBuff(type, durationMs) {
    if (type === 'speed') {
      this.player.isSpeedBoosted = true;
      this.player.sprite.setTint(0xffff00);
      this.time.delayedCall(durationMs, () => {
        this.player.isSpeedBoosted = false;
        this.player.sprite.clearTint();
      });

    } else if (type === 'sight') {
      // Show a yellow early-warning ring on all currently telegraphed tiles
      // and extend future telegraphs with an earlier pre-warning while active
      this.player.hasSight = true;
      this.player.sprite.setTint(0x00ffcc);
      // Pulse a teal aura around player
      const aura = this.add.ellipse(
        this.player.sprite.x, this.player.sprite.y,
        this.grid.tileSize * 1.8, this.grid.tileSize * 1.8,
        0x00ffcc, 0.18
      ).setDepth(9);
      const auraTween = this.tweens.add({ targets: aura, scaleX: 1.3, scaleY: 1.3, alpha: 0.05, yoyo: true, repeat: -1, duration: 600 });
      this.time.delayedCall(durationMs, () => {
        this.player.hasSight = false;
        this.player.sprite.clearTint();
        auraTween.stop();
        aura.destroy();
      });
      // Update aura position each frame
      this._sightAura = aura;

    } else if (type === 'counter') {
      // Absorb the next single hit — a shield that blocks exactly one damage instance
      this.player.hasCounter = true;
      this.player.sprite.setTint(0xff6600);
      const ring = this.add.ellipse(
        this.player.sprite.x, this.player.sprite.y,
        this.grid.tileSize * 1.6, this.grid.tileSize * 1.6,
        0xff6600, 0
      ).setDepth(9).setStrokeStyle(3, 0xff6600, 0.9);
      this.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, alpha: 0.7, yoyo: true, repeat: -1, duration: 400 });
      this._counterRing = ring;
      // Auto-expire after 10 seconds if never triggered
      this.time.delayedCall(10000, () => {
        if (this.player.hasCounter) {
          this.player.hasCounter = false;
          this.player.sprite.clearTint();
          if (this._counterRing && this._counterRing.active) this._counterRing.destroy();
        }
      });

    } else if (type === 'overclock') {
      // Enhanced speed boost — 3x speed for 8 seconds (longer and faster than regular speed boost)
      this.player.isSpeedBoosted = true;
      this.player.isOverclocked = true;
      this.player.sprite.setTint(0xff4400);
      const shim = this.tweens.add({ targets: this.player.sprite, scaleX: this.player.sprite.scaleX * 1.08, scaleY: this.player.sprite.scaleY * 1.08, yoyo: true, repeat: -1, duration: 100 });
      this.time.delayedCall(durationMs, () => {
        this.player.isSpeedBoosted = false;
        this.player.isOverclocked = false;
        this.player.sprite.clearTint();
        shim.stop();
        this.player.sprite.setScale(this.player.sprite.scaleX);
      });

    } else if (type === 'dash') {
      // durationMs here is reused as dashCharges count
      this.player.dashCharges = durationMs || 3;
      this.player.hasDash = true;
      this.player.sprite.setTint(0x88aaff);
      // Auto-clear if charges not used within 12 seconds
      this.time.delayedCall(12000, () => {
        if (this.player.dashCharges > 0) {
          this.player.dashCharges = 0;
          this.player.hasDash = false;
          this.player.sprite.clearTint();
        }
      });

    } else if (type === 'invincible') {
      this.player.isInvincible = true;
      this.player.sprite.setTint(0xffdd00);
      const shim = this.tweens.add({ targets: this.player.sprite, alpha: 0.6, yoyo: true, repeat: -1, duration: 200 });
      this.time.delayedCall(durationMs, () => {
        this.player.isInvincible = false;
        this.player.sprite.clearTint();
        this.player.sprite.alpha = 1;
        shim.stop();
      });

    } else if (type === 'timestop') {
      this.events.emit('boss:timestop', true);
      this.time.delayedCall(durationMs, () => this.events.emit('boss:timestop', false));

    } else if (type === 'blink') {
      let targetCol, targetRow;
      if (this.goldenTile) {
        targetCol = this.goldenTile.col;
        targetRow = this.goldenTile.row;
      } else {
        // No golden tile — pick the safe tile farthest from the player
        let bestDist = -1;
        for (let r = 0; r < this.grid.rows; r++) {
          for (let c = 0; c < this.grid.cols; c++) {
            if (c === this.player.col && r === this.player.row) continue;
            if (this.grid.cells[r][c].status === 'locked') continue;
            const dist = Math.abs(c - this.player.col) + Math.abs(r - this.player.row);
            if (dist > bestDist) { bestDist = dist; targetCol = c; targetRow = r; }
          }
        }
      }
      if (targetCol !== undefined) {
        const fx = this.add.sprite(this.player.sprite.x, this.player.sprite.y, 'lightning_burst');
        fx.setScale(1.5).setDepth(200).play('anim_lightning_burst');
        fx.once('animationcomplete', () => fx.destroy());
        this.player.col = targetCol;
        this.player.row = targetRow;
        const tgt = this.grid.getPixelPosition(this.player.col, this.player.row);
        this.player.sprite.x = tgt.x;
        this.player.sprite.y = tgt.y;
        this.events.emit('player:moved', this.player.col, this.player.row);
      }

    }
  }



  getProjectileDifficulty() {
    const hud = this.scene.get('HUDScene');
    const elapsedSecs = hud ? Math.floor(hud.elapsed / 1000) : 0;

    // Start scaling difficulty after 60 seconds
    // Max difficulty at 180 seconds (3 minutes)
    let difficulty = 0;
    if (elapsedSecs > 60) {
      difficulty = Math.min(1, (elapsedSecs - 60) / 120); // 0.0 to 1.0
    }
    return difficulty;
  }

  queueHorizontalProjectile() {
    if (this.isGameOver) return;

    const diff = this.getProjectileDifficulty();
    const minDelay = Phaser.Math.Linear(1500, 500, diff);
    const maxDelay = Phaser.Math.Linear(4500, 1500, diff);

    // During ultimate: greatly reduce horizontal projectile frequency
    const delay = this.isUltimateActive
      ? Phaser.Math.Between(10000, 15000)
      : Phaser.Math.Between(minDelay, maxDelay);

    this.time.delayedCall(delay, () => {
      this.spawnHorizontalProjectile();
      this.queueHorizontalProjectile();
    });
  }

  spawnHorizontalProjectile() {
    if (this.isGameOver || !this.boss || this.boss.hp <= 0) return;

    const keys = ['ch1_monster_hand', 'ch1_monster_finger', 'ch1_monster_feet', 'ch1_heart', 'ch1_brain'];
    const key = Phaser.Math.RND.pick(keys);

    const row = Phaser.Math.Between(0, this.grid.rows - 1);
    const startLeft = Phaser.Math.Between(0, 1) === 0;

    const leftWidth = Math.max(this.scale.width < 768 ? 160 : 250, Math.min(450, this.scale.width * 0.28));
    const y = this.grid.offsetY + row * this.grid.tileSize + this.grid.tileSize / 2;
    const startX = startLeft ? leftWidth - 50 : this.scale.width + 50;
    const endX = startLeft ? this.scale.width + 50 : leftWidth - 50;

    // 1. Show Alert outside the grid
    const alertX = startLeft ? this.grid.offsetX - 40 : this.grid.offsetX + this.grid.cols * this.grid.tileSize + 40;
    const alertSpr = this.add.sprite(alertX, y, 'symbol_alert2');
    alertSpr.setScale(1.2).setDepth(200);
    alertSpr.play('anim_symbol_alert2');
    audioManager.play('sfx_telegraph', { volume: 0.4 });
    alertSpr.once('animationcomplete', () => alertSpr.destroy());

    // 2. Wait 1 second before spawning the moving part
    this.time.delayedCall(1000, () => {
      if (this.isGameOver || (this.boss && this.boss.hp <= 0)) return;

      const proj = this.add.sprite(startX, y, key);
      // Base scaling down since typical source sizes are large
      proj.setDisplaySize(75, 75);
      proj.setDepth(50);
      this.horizontalProjectiles.add(proj);

      const rotSign = startLeft ? 1 : -1;

      const diff = this.getProjectileDifficulty();
      // Slower speed than before
      const minDuration = Phaser.Math.Linear(4500, 3000, diff);
      const maxDuration = Phaser.Math.Linear(6500, 4000, diff);
      const duration = Phaser.Math.Between(minDuration, maxDuration);

      // Dripping Blood Trail
      const dripCount = Math.floor(duration / 50);
      const dripTimer = this.time.addEvent({
        delay: 50, repeat: dripCount - 1,
        callback: () => {
          if (!proj || !proj.active) return;
          const scale = Phaser.Math.FloatBetween(2.0, 4.5);
          const drip = this.add.sprite(proj.x, proj.y, 'dark_blood_0').setScale(scale).setDepth(45);
          if (this.anims.exists('anim_dark_blood')) drip.play('anim_dark_blood');

          this.tweens.add({
            targets: drip, alpha: 0, scale: 1.0, y: drip.y + Phaser.Math.Between(30, 60), duration: 600, onComplete: () => drip.destroy()
          });
        }
      });

      this.tweens.add({
        targets: proj,
        x: endX,
        angle: rotSign * 360 * 3, // Rotate nicely
        duration: duration,
        onComplete: () => {
          proj.destroy();
          dripTimer.remove();
        }
      });
    });
  }

  update(time, delta) {
    if (this.isGameOver) return;
    const HOLD_INITIAL_DELAY = 300; // ms before continuous kicks in
    const HOLD_REPEAT_INTERVAL = 160; // ms between repeated moves while held

    // Keyboard: tap = JustDown (1 tile), hold = isDown after initial delay
    // Only active when control type is keyboard (not gesture)
    if (this.control === 'keyboard') {
      const dirs = ['up', 'down', 'left', 'right'];
      dirs.forEach(dir => {
        if (Phaser.Input.Keyboard.JustDown(this.cursors[dir])) {
          this.player.move(dir);
          this._keyHoldTimers = this._keyHoldTimers || {};
          this._keyHoldTimers[dir] = -HOLD_INITIAL_DELAY; // negative = in delay phase
          const btn = document.querySelector(`.dpad-${dir}`);
          if (btn) {
            btn.classList.add('dpad-btn--active');
            setTimeout(() => btn.classList.remove('dpad-btn--active'), 150);
          }
        } else if (this.cursors[dir].isDown) {
          this._keyHoldTimers = this._keyHoldTimers || {};
          this._keyHoldTimers[dir] = (this._keyHoldTimers[dir] || 0) + delta;
          if (this._keyHoldTimers[dir] >= HOLD_REPEAT_INTERVAL) {
            this._keyHoldTimers[dir] = 0;
            this.player.move(dir);
          }
        } else {
          if (this._keyHoldTimers) this._keyHoldTimers[dir] = 0;
        }
      });
    }

    // Gesture hold: if a gesture direction is held, repeat movement
    if (this._heldGesture) {
      this._gestureHoldTimer = (this._gestureHoldTimer || 0) + delta;
      if (this._gestureHoldTimer >= HOLD_REPEAT_INTERVAL + HOLD_INITIAL_DELAY / 4) {
        // Repeat interval after a short extra pause post first move
        if (!this._gestureRepeatStarted) {
          this._gestureRepeatStarted = true;
          this._gestureHoldTimer = 0;
        } else if (this._gestureHoldTimer >= HOLD_REPEAT_INTERVAL) {
          this._gestureHoldTimer = 0;
          this.player.move(this._heldGesture);
        }
      }
    } else {
      this._gestureRepeatStarted = false;
      this._gestureHoldTimer = 0;
    }

    // Counter ring follows player
    if (this._counterRing && this._counterRing.active && this.player) {
      this._counterRing.setPosition(this.player.sprite.x, this.player.sprite.y);
    }
    // Sight aura follows player
    if (this._sightAura && this._sightAura.active && this.player) {
      this._sightAura.setPosition(this.player.sprite.x, this.player.sprite.y);
    }

    if ((this.chapterId === 1 || this.isEndless) && this.horizontalProjectiles) {
      this.horizontalProjectiles.getChildren().forEach(proj => {
        if (!proj.active) return;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.sprite.x, this.player.sprite.y);
        // Increased hit radius to account for larger sprites
        if (dist < 35) {
          if (!this.player.isInvincible) {
            this.player.takeDamage();
            // Play the new custom hit effect instead of blood
            if (this.anims.exists('anim_moving_hit')) {
              const hitFx = this.add.sprite(proj.x, proj.y, 'moving_hit', 0).play('anim_moving_hit').setDepth(55);
              // Scale it up a bit since 32x32 might be small
              hitFx.setScale(1.5);
              hitFx.once('animationcomplete', () => hitFx.destroy());
            }
          }
          proj.destroy();
        }
      });
    }

    // Chapter 2: Persistent entity proximity checks (melee plants)
    if (this.persistentEntities && this.persistentEntities.length > 0) {
      this.persistentEntities.forEach(ent => {
        if (!ent.active || !ent.sprite || !ent.sprite.active) return;
        
        // Dynamically face the player if not currently performing an attack animation
        if (!ent.sprite.anims.isPlaying) {
          const dx = this.player.col - ent.col;
          const dy = this.player.row - ent.row;
          let fIdx = 0;
          if (Math.abs(dx) > Math.abs(dy)) {
            fIdx = dx > 0 ? 7 : 14; 
          } else {
            fIdx = dy > 0 ? 0 : 21; 
          }
          ent.sprite.setFrame(fIdx);
        }

        if (ent.type === 'melee' && !ent._attackCooldown) {
          const MathAbsDc = Math.abs(this.player.col - ent.col);
          const MathAbsDr = Math.abs(this.player.row - ent.row);
          // Only cardinal adjacency
          if ((MathAbsDc === 1 && MathAbsDr === 0) || (MathAbsDc === 0 && MathAbsDr === 1)) {
            ent._attackCooldown = true;
            let dir = 'down';
            if (this.player.row < ent.row) dir = 'up';
            else if (this.player.row > ent.row) dir = 'down';
            else if (this.player.col < ent.col) dir = 'left';
            else if (this.player.col > ent.col) dir = 'right';

            ent.sprite.play(`anim_ch2_plant_melee_${dir}`);
            this.time.delayedCall(300, () => {
              if (this.player.col === ent.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0) &&
                  this.player.row === ent.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)) {
                this.player.takeDamage();
              }
            });
            this.time.delayedCall(1500, () => {
              if (ent.onAttackComplete) ent.onAttackComplete();
              else ent._attackCooldown = false;
            });
          }
        }
      });
    }
  }

  /** Burst of chapter-colored circle particles at the pickup location */
  _spawnPickupBurst(x, y) {
    const color = this._chapterParticleColor ?? 0xFFD700;
    const COUNT = 22;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.3;
      const speed = Phaser.Math.Between(70, 180);
      const prt = this.add.graphics().setDepth(250);
      prt.fillStyle(color, 1);
      prt.fillCircle(0, 0, Phaser.Math.Between(3, 7));
      prt.x = x; prt.y = y;
      this.tweens.add({
        targets: prt,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(500, 800),
        ease: 'Cubic.easeOut',
        onComplete: () => prt.destroy()
      });
    }
  }

  /** Fire chapter-colored pixels from a tile position to the boss sprite */
  launchAttackParticles(fromX, fromY) {
    const { width, height } = this.scale;
    const leftWidth = Math.floor(width * 0.28);
    const bossBoxH  = Math.floor((height - 155) * 0.38);
    const bossX = leftWidth / 2;
    const bossY = 155 + bossBoxH / 2;

    // Use chapter-specific particle texture
    const particleKey = this._chapterParticleKey ?? 'attack_particle';

    const COUNT = 15;
    for (let i = 0; i < COUNT; i++) {
      if (this.isGameOver) return;

      const particle = this.add.image(fromX, fromY, particleKey)
        .setDepth(60)
        .setScale(Phaser.Math.FloatBetween(1, 1.5));

      // Phase 1: Scatter outward from the tile
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(40, 90);
      const scatterX = fromX + Math.cos(angle) * dist;
      const scatterY = fromY + Math.sin(angle) * dist;

      this.tweens.add({
        targets: particle,
        x: scatterX,
        y: scatterY,
        duration: Phaser.Math.Between(200, 350),
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (this.isGameOver) {
            particle.destroy();
            return;
          }
          // Phase 2: Zip to the boss
          this.tweens.add({
            targets: particle,
            x: bossX + Phaser.Math.Between(-20, 20),
            y: bossY + Phaser.Math.Between(-20, 20),
            scale: 0.5,
            duration: Phaser.Math.Between(300, 500),
            ease: 'Back.easeIn',
            delay: Phaser.Math.Between(0, 150),
            onComplete: () => particle.destroy()
          });
        }
      });
    }
  }

  showGameOver(isVictory) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    if (this.unsubGesture) this.unsubGesture();

    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(999);

    const msg = isVictory ? "VICTORY!" : "GAME OVER";
    const color = isVictory ? "#ffd700" : "#ff0000";

    // Center on the game area (grid area), accounting for panel position
    const panelWidth = Math.max(width < 768 ? 160 : 250, Math.min(450, width * 0.28));
    const gameAreaX = this.isPanelRight ? 0 : panelWidth;
    const gameAreaW = width - panelWidth;
    const gameAreaCenterX = gameAreaX + gameAreaW / 2;

    // Responsive font size: smaller on mobile, larger on desktop
    const isMobile = width < 768 || height < 600;
    const maxFontSize = isMobile ? 48 : 72;
    const minFontSize = isMobile ? 24 : 32;
    const flashFontSize = Math.max(minFontSize, Math.min(maxFontSize, Math.floor(gameAreaW * 0.12)));

    this.add.text(gameAreaCenterX, height / 2, msg, {
      fontFamily: 'GigaSaturn', fontSize: `${flashFontSize}px`, color,
      stroke: '#000000', strokeThickness: isMobile ? 4 : 8,
      shadow: { offsetX: 0, offsetY: 0, color: color, blur: isMobile ? 15 : 30, fill: true }
    }).setOrigin(0.5).setDepth(1000);

    this.time.delayedCall(3000, () => {
      const hud = this.scene.get('HUDScene');
      const elapsedSecs = hud ? Math.floor(hud.elapsed / 1000) : 0;

      // Endless mode: save accumulated score, skip chapter unlock logic
      if (this.isEndless) {
        this.scene.stop('HUDScene');
        state.set('lastGameResult', {
          chapterId: this.chapterId, isVictory: false,
          timeSurvived: elapsedSecs, score: this.endlessScore,
          wavesSurvived: this.endlessWaves,
          isEndless: true,
          control: this.control,
          character: this.character,
          sessionId: this.sessionId
        });
        if (window.__screenManager) window.__screenManager.navigate('results-screen', {}, false);
        return;
      }

      // Use accumulated chapterScore (time + golden tiles) and add bonuses
      let finalScore = this.chapterScore;
      if (isVictory) finalScore += 5000;
      if (this.player.hp === this.player.maxHp && isVictory) finalScore += 3000;

      this.scene.stop('HUDScene');

      // Unlock next chapter permanently on victory
      if (isVictory) {
        let progress = state.get('chapterProgress') || { chaptersUnlocked: [1], chaptersCompleted: [], bestScores: {} };
        let progressChanged = false;
        if (!progress.chaptersUnlocked.includes(this.chapterId + 1)) {
          progress.chaptersUnlocked.push(this.chapterId + 1);
          progressChanged = true;
        }
        if (!progress.chaptersCompleted) progress.chaptersCompleted = [];
        if (!progress.chaptersCompleted.includes(this.chapterId)) {
          progress.chaptersCompleted.push(this.chapterId);
          progressChanged = true;
        }
        if (!progress.bestScores) progress.bestScores = {};
        if ((progress.bestScores[this.chapterId] || 0) < finalScore) {
          progress.bestScores[this.chapterId] = finalScore;
          progressChanged = true;
        }
        if (progressChanged) {
          state.set('chapterProgress', progress);
          // Persist to localStorage AND server (fire-and-forget; results screen does not depend on it)
          state.saveChapterProgress().catch(e => console.warn('Failed to save chapter progress:', e));
        }
      }

      state.set('lastGameResult', {
        chapterId: this.chapterId, isVictory,
        timeSurvived: elapsedSecs, score: finalScore,
        isEndless: false,
        control: this.control,
        character: this.character,
        completionMode: 'normal'
      });
      if (window.__screenManager) {
        window.__screenManager.navigate('results-screen', {}, false);
      }
    });
  }

  /**
   * Admin Test Mode: Check sessionStorage for admin test settings
   * Enables invincibility, one-hit kill, etc. for testing
   */
  _checkAdminTestMode() {
    // Clear any legacy raw key immediately — never trusted
    sessionStorage.removeItem('admin_test_mode');

    const token = sessionStorage.getItem('admin_test_token');
    if (!token) return Promise.resolve();

    // Consume immediately — single-use, no replay across restarts
    sessionStorage.removeItem('admin_test_token');

    // Return the promise so callers can await it before starting the boss loop
    return fetch('/admin/verify-test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(r => r.ok ? r.json() : { valid: false })
      .then(data => {
        if (!data.valid) return;

        this._isAdminTest = true;
        const settings = data.settings;

        if (settings.invincible) {
          this.player.isInvincible = true;
          this.player.sprite.setTint(0xffdd00);
        }

        if (settings.oneHitKill && this.boss) {
          this.boss.oneHitKill = true;
        }

        if (settings.attackId !== undefined) {
          this._adminTestAttackId = settings.attackId;
        }

        if (settings.mode === 'test_ultimate') {
          this._adminTestUltimate = true;
          this.time.delayedCall(2000, () => {
            if (this.boss && this.boss.ch3UltimateRotatingBarrage) {
              this.boss.ch3UltimateRotatingBarrage();
            }
          });
        }

        // Loot test mode: spawn items for testing
        if (settings.mode === 'test_loot') {
          this.time.delayedCall(3000, () => {
            // Test chests (power-ups)
            if (settings.testChests) {
              // Spawn all 5 chest types near player
              const playerCol = this.player.col;
              const playerRow = this.player.row;
              const offsets = [[0, -2], [1, -1], [2, 0], [1, 1], [0, 2]];
              offsets.forEach((offset, i) => {
                this.time.delayedCall(i * 500, () => {
                  const c = Phaser.Math.Clamp(playerCol + offset[0], 0, this.grid.cols - 1);
                  const r = Phaser.Math.Clamp(playerRow + offset[1], 0, this.grid.rows - 1);
                  this.grid.spawnChest(c, r);
                });
              });
            }

            // Test bawang (lives up)
            if (settings.testBawang) {
              this.time.delayedCall(3500, () => {
                const c = Phaser.Math.Clamp(this.player.col - 1, 0, this.grid.cols - 1);
                const r = Phaser.Math.Clamp(this.player.row - 2, 0, this.grid.rows - 1);
                this.grid.spawnBawang(c, r);
              });
            }

            // Test lives up FX
            if (settings.testLivesFx) {
              this.time.delayedCall(4000, () => {
                const px = this.player.sprite.x;
                const py = this.player.sprite.y;
                const fx = this.add.sprite(px, py - 40, 'lives_up').play('anim_lives_up').setDepth(300);
                fx.setScale(1.5);
                fx.once('animationcomplete', () => fx.destroy());
              });
            }
          });
        }
      })
      .catch(() => {});
  }

  /**
   * Power-up: Show floating text effect
   */
  _showPowerUpText(x, y, text, color) {
    const txt = this.add.text(x, y - 60, text, {
      fontFamily: 'VCR', fontSize: '24px', color: color, stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({
      targets: txt,
      y: txt.y - 50,
      alpha: 0,
      duration: 2000,
      onComplete: () => txt.destroy()
    });
  }

  /**
   * Power-up 1: Time Freeze - Stop all boss attacks for 3 seconds
   */
  _activateTimeFreeze() {
    // Set global flag to freeze attacks
    this._timeFreezeActive = true;

    // Visual effect: Blue tint overlay
    const freezeOverlay = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0x00ffff, 0.2
    ).setDepth(200).setOrigin(0.5);

    // Countdown text
    const countdown = this.add.text(
      this.player.sprite.x, this.player.sprite.y - 100,
      '3', { fontFamily: 'GigaSaturn', fontSize: '48px', color: '#00ffff', stroke: '#000', strokeThickness: 8 }
    ).setOrigin(0.5).setDepth(201);

    // Countdown animation
    let timeLeft = 3;
    const timer = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        timeLeft--;
        if (timeLeft > 0) {
          countdown.setText(timeLeft.toString());
          this.tweens.add({
            targets: countdown,
            scale: 1.5,
            duration: 200,
            yoyo: true
          });
        }
      }
    });

    // End after 3 seconds
    this.time.delayedCall(3000, () => {
      this._timeFreezeActive = false;
      freezeOverlay.destroy();
      countdown.destroy();
      timer.remove();
    });
  }

  /**
   * Power-up 2: Invisibility - Player becomes invisible for 3 seconds
   */
  _activateInvisibility() {
    // Set player as invisible (no damage from attacks)
    this.player.isInvisible = true;
    this.player.sprite.setAlpha(0.4);

    // Purple glow effect
    const glow = this.add.ellipse(this.player.sprite.x, this.player.sprite.y, 40, 40, 0xff00ff, 0.3)
      .setDepth(15);

    // Update glow position
    const glowUpdate = this.time.addEvent({
      delay: 16,
      repeat: 180, // ~3 seconds at 60fps
      callback: () => {
        if (glow.active) {
          glow.setPosition(this.player.sprite.x, this.player.sprite.y);
        }
      }
    });

    // End after 3 seconds
    this.time.delayedCall(3000, () => {
      this.player.isInvisible = false;
      this.player.sprite.setAlpha(1);
      glow.destroy();
      glowUpdate.remove();
    });
  }

  /**
   * Power-up 3: Speed Boost - Player moves 2x faster for 5 seconds
   */
  _activateSpeedBoost() {
    // Double the movement speed
    const originalSpeed = this.player.moveDelay || 150;
    this.player.moveDelay = originalSpeed / 2;

    // Yellow trail effect
    this.player.sprite.setTint(0xffff00);

    // Sparkle particles
    const sparkles = this.time.addEvent({
      delay: 100,
      repeat: 49, // 5 seconds
      callback: () => {
        if (this.player.sprite.active) {
          const sparkle = this.add.ellipse(
            this.player.sprite.x + Phaser.Math.Between(-15, 15),
            this.player.sprite.y + Phaser.Math.Between(-15, 15),
            6, 6, 0xffff00
          ).setDepth(14);
          this.tweens.add({
            targets: sparkle,
            alpha: 0,
            scale: 0,
            duration: 400,
            onComplete: () => sparkle.destroy()
          });
        }
      }
    });

    // End after 5 seconds
    this.time.delayedCall(5000, () => {
      this.player.moveDelay = originalSpeed;
      this.player.sprite.clearTint();
      sparkles.remove();
    });
  }

  /**
   * Power-up 4: Shield - Invincibility for 5 seconds
   */
  _activateShield() {
    // Make player invincible
    this.player.isInvincible = true;

    // Green shield bubble effect
    const shield = this.add.ellipse(this.player.sprite.x, this.player.sprite.y, 50, 50, 0x00ff00, 0.2)
      .setDepth(15).setStrokeStyle(3, 0x00ff00);

    // Update shield position
    const shieldUpdate = this.time.addEvent({
      delay: 16,
      repeat: 300, // ~5 seconds at 60fps
      callback: () => {
        if (shield.active) {
          shield.setPosition(this.player.sprite.x, this.player.sprite.y);
        }
      }
    });

    // Pulsing animation
    this.tweens.add({
      targets: shield,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: 4
    });

    // End after 5 seconds
    this.time.delayedCall(5000, () => {
      this.player.isInvincible = false;
      shield.destroy();
      shieldUpdate.remove();
    });
  }

  /**
   * Power-up 5: Reverse Damage - Boss takes damage when trying to attack player
   */
  _activateReverseDamage() {
    // Set flag for reverse damage
    this._reverseDamageActive = true;

    // Red aura around player
    const aura = this.add.ellipse(this.player.sprite.x, this.player.sprite.y, 45, 45, 0xff0000, 0.25)
      .setDepth(15).setStrokeStyle(2, 0xff4444);

    // Update aura position
    const auraUpdate = this.time.addEvent({
      delay: 16,
      repeat: 180, // ~3 seconds
      callback: () => {
        if (aura.active) {
          aura.setPosition(this.player.sprite.x, this.player.sprite.y);
        }
      }
    });

    // Damage boss when player would take damage
    const originalTakeDamage = this.player.takeDamage.bind(this.player);
    this.player.takeDamage = () => {
      if (this._reverseDamageActive && this.boss && this.boss.hp > 0) {
        // Boss takes damage instead
        this.boss.takeDamage();
        // Show "REVENGE!" text
        const txt = this.add.text(this.player.sprite.x, this.player.sprite.y - 50, 'REVENGE!', {
          fontFamily: 'VCR', fontSize: '20px', color: '#ff4444', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(300);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
        return false; // Player doesn't take damage
      }
      return originalTakeDamage();
    };

    // End after 3 seconds
    this.time.delayedCall(3000, () => {
      this._reverseDamageActive = false;
      this.player.takeDamage = originalTakeDamage;
      aura.destroy();
      auraUpdate.remove();
    });
  }

  shutdown() {
    if (this.unsubGesture) this.unsubGesture();

    // Cleanup persistent entities
    if (this.persistentEntities) {
      this.persistentEntities.forEach(ent => {
        if (ent.sprite && ent.sprite.active) ent.sprite.destroy();
        if (ent.timer) ent.timer.remove();
        if (ent.fireTimer) ent.fireTimer.remove();
      });
      this.persistentEntities = [];
    }
    // Cleanup vine QTE
    if (this._vineQteUnsub) this._vineQteUnsub();
    this.events.removeAllListeners();
    this.scene.stop('HUDScene');
  }
}
