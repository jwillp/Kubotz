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
    public static final String ENTITY_TAG_PUNCH = "PUNCH";
    public static final String ENTITY_TAG_POWERUP = "POWERUP";



    // FIXTURE

    public static final String FIXTURE_LEGS = "legs";
    public static final String FIXTURE_TORSO = "TORSO";
    public static final String FIXTURE_HEAD = "head";
    public static final String FIXTURE_FEET_SENSOR = "feetSensor";

    public static final String FIXTURE_MELEE_ATTACK = "MELEE";




    // PARAMETERS (THESE MOSTLY NED TO BE HARDCODED AND NEVER CHANGED IN ORDER FOR THE GAME TO WORK WELL

    public static final int PUNCH_INPUT_DELAY = 200; //in ms, the delay between the button press and the punch to occur
    public static final int PUNCH_DURATION = 500; //The duration of a punch

























}
