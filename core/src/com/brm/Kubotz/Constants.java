package com.brm.Kubotz;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Contains all the Game Constants
 */
public class Constants {


    //DEFAULT VALUES
    public static final float DEFAULT_KUBOTZ_SPEED_X = 5.0f;
    public static final float DEFAULT_KUBOTZ_SPEED_Y = 5.0f;

    public static final float DEFAULT_NB_JUMPS = 1;



    public static final float DEFAULT_TURRET_SPEED_X = 5.0f;
    public static final float DEFAULT_TURRET_SPEED_Y = 5.0f;



    public static final float DEFAULT_GRAVITY_X = 0.0f;
    public static final float DEFAULT_GRAVITY_Y = 50.0f;



    public static final int MAX_NB_BONUS = 5; //Maximum number of bonus at a time in a room
    public static final int MIN_DELAY_BONUS_SPAWN = Timer.FIVE_SECONDS; //The minimum delay between BONUS SPAWNS
    public static final int MAX_DELAY_BONUS_SPAWN = Timer.TEN_SECONDS; //The maximum delay between BONUS SPAWNS


    // ENTITY TAGS

    public static final String ENTITY_TAG_KUBOTZ = "KUBOTZ";
    public static final String ENTITY_TAG_CAMERA = "CAMERA";
    public static final String ENTITY_TAG_TURRET = "TUERRET";

    public static final String ENTITY_TAG_BULLET = "BULLET";
    public static final String ENTITY_TAG_PUNCH = "PUNCH";

    public static final String ENTITY_TAG_PLATFORM = "PLATFORM";

    public static final String ENTITY_TAG_POWERUP = "POWERUP";




    // FIXTURE

    public static final String FIXTURE_LEGS = "legs";
    public static final String FIXTURE_TORSO = "tosro";
    public static final String FIXTURE_HEAD = "head";
    public static final String FIXTURE_FEET_SENSOR = "feetSensor";

    public static final String FIXTURE_SENSOR_COMP = "sensorComp";

    public static final String FIXTURE_PUNCH_ATTACK = "punch";





























}
