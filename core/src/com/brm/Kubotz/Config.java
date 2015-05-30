package com.brm.Kubotz;


public class Config {

    public static String TITLE = "Kubotz";

    //Fixed Aspect Ratio
    public static final int V_WIDTH = 1280;     //Virtual Width
    public static final int V_HEIGHT = 768;     //Virtual Height
    public static final float ASPECT_RATIO = (float)V_WIDTH/(float)V_HEIGHT;

    public static boolean FULL_SCREEN = false;

    public static final int FPS = 1/60; // in milliseconds

    public static boolean DEBUG_RENDERING_ENABLED = true;

    public static boolean TEXTURE_RENDERING_ENABLED = true;

    public static final String CONFIG_FILE = "config.properties";

    // THE FOLLOWING SETTINGS ARE ALL EDITABLE BY THE USER //

    //AUDIO SETTINGS
    public static final int GAME_VOLUME = 100;
    public static final int SFX_VOLUME = 100;
    public static final int MUSIC_VOLUME = 100;


    //INPUT CONTROLS SETTINGS
    public static final int PLAYER_1_MOVE_UP = 51;
    public static final int PLAYER_1_MOVE_LEFT = 29;
    public static final int PLAYER_1_MOVE_DOWN = 47;
    public static final int PLAYER_1_MOVE_RIGHT = 32;
    public static final int PLAYER_1_START = 131;
    public static final int PLAYER_1_PRIMARY_ACTION_BUTTON = 37;
    public static final int PLAYER_1_SECONDARY_ACTION_BUTTON = 62;
    public static final int PLAYER_1_PUNCH = 43;
    public static final int PLAYER_1_ACTIVE_SKILL = 59;

    public static final int PLAYER_2_MOVE_UP = 51;
    public static final int PLAYER_2_MOVE_LEFT = 29;
    public static final int PLAYER_2_MOVE_DOWN = 47;
    public static final int PLAYER_2_MOVE_RIGHT = 32;
    public static final int PLAYER_2_START = 131;
    public static final int PLAYER_2_PRIMARY_ACTION_BUTTON = 37;
    public static final int PLAYER_2_SECONDARY_ACTION_BUTTON = 62;
    public static final int PLAYER_2_PUNCH = 43;
    public static final int PLAYER_2_ACTIVE_SKILL = 59;


    //GAME RULES SETTINGS
    public static float KUBOTZ_SPEED_X = 5.0f;
    public static float KUBOTZ_SPEED_Y = 5.0f;
    public static int KUBOTZ_NB_JUMPS = 1;

    public static int PUNCH_DAMAGE = 3;
    public static int PUNCH_COOLDOWN = 80;

    public static int FLYBOOTS_DURATION = 5000;
    public static int FLYBOOTS_COOLDOWN = 5000;

    public static int DASHBOOTS_COOLDOWN = 200;

    public static int LASER_SWORD_DAMAGE = 10;
    public static int LASER_SWORD_COOLDOWN = 100;

    public static int LASER_GUN_MK_I_DAMAGE = 5;
    public static float LASER_GUN_MK_I_SPEED = 30;
    public static int LASER_GUN_MK_I_COOLDOWN = 500;
    public static int LASER_GUN_MK_II_DAMAGE = 9;
    public static float LASER_GUN_MK_II_SPEED = 40;
    public static int LASER_GUN_MK_II_COOLDOWN = 600;

    public static float DRONE_SPEED_X = 5.0f;
    public static float DRONE_SPEED_Y = 5.0f;

    public static float GRAVITY_X = 0.0f;
    public static float GRAVITY_Y = 50.0f;










    public static void load() {

    }

    public static void save() {

    }





























}