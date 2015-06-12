package com.brm.Kubotz;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Contains all the Game Constants
 */
public class Constants {

    // TODO Move in Config
    public static final int MAX_NB_BONUS = 5; //Maximum number of bonus at a time in a room
    public static final int MIN_DELAY_BONUS_SPAWN = Timer.FIVE_SECONDS; //The minimum delay between BONUS SPAWNS
    public static final int MAX_DELAY_BONUS_SPAWN = Timer.TEN_SECONDS; //The maximum delay between BONUS SPAWNS


    // ENTITY TAG

    public static final String ENTITY_TAG_KUBOTZ = "KUBOTZ";
    public static final String ENTITY_TAG_DRONE = "DRONE";
    public static final String ENTITY_TAG_PLATFORM = "PLATFORM";
    public static final String ENTITY_TAG_BULLET = "BULLET";
    public static final String ENTITY_TAG_PUNCH = "BUTTON_A";
    public static final String ENTITY_TAG_POWERUP = "POWERUP";



    // HITBOX LABELS

    //Kubotz
    public static final String HITBOX_LABEL_LEGS = "legs";
    public static final String HITBOX_LABEL_TORSO = "TORSO";
    public static final String HITBOX_LABEL_HEAD = "head";
    public static final String HITBOX_LABEL_FEET = "feetSensor";


    public static final String HITBOX_LABEL_MELEE = "MELEE";

    // PARAMETERS (THESE MOSTLY NED TO BE HARDCODED AND NEVER CHANGED IN ORDER FOR THE GAME TO WORK WELL
    public static final int PUNCH_INPUT_DELAY = 200; //in ms, the delay between the button press and the punch to occur




    public static final int PUNCH_DURATION = 500; //The duration of a punch


    public static final int CLASH_THRESHOLD = 5; //The maex number cuasing a clash











    // RENDERING
    public static final String KUBOTZ_ANIM_FILE = "animations/Kubotz/kubotz.scml";
    public static final String BULLET_ANIM_FILE = "animations/Bullets/bullet.scml";


    public static final String MAIN_MAP_FILE = "maps/DebugMap.tmx";



    // PARTICLE
    public static final String PARTICLES_LANDING_DUST = "particles/landingDust.pe";
    public static final String PARTICLES_HIT_STARS = "particles/eclatRouille.pe";
    public static final String PARTICLES_LASER_SMOKE = "particles/laserSmoke.pe";
    public static final String DEATH_DUST = "particles/deathDust.pe";



}
