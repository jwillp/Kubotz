package com.brm.Kubotz;


import com.badlogic.gdx.Input;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.Utils.OrderedProperties;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

public class Config {



    public static String TITLE = "Kubotz";

    //Fixed Aspect Ratio
    public static final int V_WIDTH = 1920;     //Virtual Width
    public static final int V_HEIGHT = 1080;     //Virtual Height
    public static final float ASPECT_RATIO = (float)V_WIDTH/(float)V_HEIGHT;

    public static final int FPS = 1/60; // in milliseconds

    public static boolean DEBUG_RENDERING_ENABLED = true;

    public static boolean TEXTURE_RENDERING_ENABLED = true;

    public static final String CONFIG_FILE = "config.properties";


    // THE FOLLOWING SETTINGS ARE ALL EDITABLE BY THE USER //

    //DISPLAY
    public static boolean FULL_SCREEN = false;
    public static boolean PARTICLES_ENABLED = true;


    //AUDIO SETTINGS
    public static final int GAME_VOLUME = 100;
    public static final int SFX_VOLUME = 100;
    public static final int MUSIC_VOLUME = 100;


    //INPUT CONTROLS SETTINGS
    public static boolean PLAYER_1_USE_GAMEPAD = false;
    public static boolean PLAYER_2_USE_GAMEPAD = false;


    //Player 1
    public static int PLAYER_1_MOVE_UP = Input.Keys.W;
    public static int PLAYER_1_MOVE_DOWN = Input.Keys.S;
    public static int PLAYER_1_MOVE_LEFT = Input.Keys.A;
    public static int PLAYER_1_MOVE_RIGHT = Input.Keys.D;

    public static int PLAYER_1_START = Input.Keys.ESCAPE;

    public static int PLAYER_1_ATTACK_BUTTON = Input.Keys.I;
    public static int PLAYER_1_GRAB_BUTTON = Input.Keys.O;
    public static int PLAYER_1_SPECIAL_BUTTON = Input.Keys.SHIFT_LEFT;
    public static int PLAYER_1_THROW_BUTTON = Input.Keys.P;

    // TODO Jump ALT

    //Player 2
    public static int PLAYER_2_MOVE_UP = Input.Keys.UP;
    public static int PLAYER_2_MOVE_DOWN = Input.Keys.DOWN;
    public static int PLAYER_2_MOVE_LEFT = Input.Keys.LEFT;
    public static int PLAYER_2_MOVE_RIGHT = Input.Keys.RIGHT;

    public static int PLAYER_2_START = Input.Keys.ESCAPE;

    public static int PLAYER_2_ATTACK_BUTTON = Input.Keys.NUMPAD_1;
    public static int PLAYER_2_GRAB_BUTTON = Input.Keys.NUMPAD_2;
    public static int PLAYER_2_SPECIAL_BUTTON = Input.Keys.NUMPAD_0;
    public static int PLAYER_2_THROW_BUTTON = Input.Keys.NUMPAD_3;




    //GAME RULES SETTINGS
    public static float KUBOTZ_SPEED_X = 5.0f;
    public static float KUBOTZ_SPEED_Y = 5.0f;
    public static int KUBOTZ_NB_JUMPS = 1;

    public static int PUNCH_DAMAGE = 3;
    public static int PUNCH_COOLDOWN = 8;

    public static int FLYBOOTS_DURATION = 5000;
    public static int FLYBOOTS_COOLDOWN = 5000;

    public static int DASHBOOTS_COOLDOWN = 200;

    public static int LASER_SWORD_DAMAGE = 10;
    public static int LASER_SWORD_COOLDOWN = 200;

    public static int LASER_GUN_MK_I_DAMAGE = 8;
    public static float LASER_GUN_MK_I_SPEED = 30;
    public static int LASER_GUN_MK_I_COOLDOWN = 500;
    public static int LASER_GUN_MK_II_DAMAGE = 9;
    public static float LASER_GUN_MK_II_SPEED = 40;
    public static int LASER_GUN_MK_II_COOLDOWN = 600;

    public static float DRONE_SPEED_X = 5.0f;
    public static float DRONE_SPEED_Y = 5.0f;

    public static float GRAVITY_X = 0.0f;
    public static float GRAVITY_Y = 50.0f;

    public static final int RESPAWN_DELAY = 3500;


    /**
     * Reads the configuration file and applies its values
     */
    public static void load() {
        try {
            FileInputStream inputStream = new FileInputStream(CONFIG_FILE);
            OrderedProperties prop = new OrderedProperties();
            prop.load(inputStream);

            loadControlsProperties(prop);

            //TODO READ

            inputStream.close();
        } catch (FileNotFoundException e) {
            //We create the config fall than save the current default values
            Config.save();
        } catch (IOException e) {
            e.printStackTrace();
        }

    }

    /**
     * Save the current values of the config in a config file
     */
    public static void save() {
        try {
            FileOutputStream outputStream = new FileOutputStream(CONFIG_FILE);

            writeDisplayProperies(outputStream);
            writeAudioProperies(outputStream);
            writeControlsProperies(outputStream);
            writeGameRulesProperies(outputStream);

            outputStream.close();

        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }


    }



    private static void writeDisplayProperies(FileOutputStream output) throws IOException {
        OrderedProperties prop = new OrderedProperties();

        prop.setProperty("FULL_SCREEN", String.valueOf(FULL_SCREEN));
        prop.setProperty("PARTICLES_ENABLED", String.valueOf(PARTICLES_ENABLED));

        prop.store(output, "DISPLAY SETTINGS");
        output.write("\n\n".getBytes());
        output.flush();

    }

    private static void writeAudioProperies(FileOutputStream output) throws IOException {
        OrderedProperties prop = new OrderedProperties();

        prop.setProperty("GAME_VOLUME", String.valueOf(GAME_VOLUME));
        prop.setProperty("SFX_VOLUME", String.valueOf(SFX_VOLUME));
        prop.setProperty("MUSIC_VOLUME", String.valueOf(MUSIC_VOLUME));

        prop.store(output, "AUDIO SETTINGS");
        output.write("\n\n".getBytes());
        output.flush();
    }

    private static void writeControlsProperies(FileOutputStream output) throws IOException {
        OrderedProperties prop = new OrderedProperties();



        //Player 1
        prop.setProperty("PLAYER_1_USE_GAMEPAD", String.valueOf(PLAYER_1_USE_GAMEPAD));
        prop.setProperty("PLAYER_1_MOVE_UP", String.valueOf(PLAYER_1_MOVE_UP));
        prop.setProperty("PLAYER_1_MOVE_LEFT", String.valueOf(PLAYER_1_MOVE_LEFT));
        prop.setProperty("PLAYER_1_MOVE_DOWN", String.valueOf(PLAYER_1_MOVE_DOWN));
        prop.setProperty("PLAYER_1_MOVE_RIGHT", String.valueOf(PLAYER_1_MOVE_RIGHT));
        prop.setProperty("PLAYER_1_START", String.valueOf(PLAYER_1_START));
        prop.setProperty("PLAYER_1_PRIMARY_ACTION_BUTTON", String.valueOf(PLAYER_1_GRAB_BUTTON));
        prop.setProperty("PLAYER_1_SECONDARY_ACTION_BUTTON", String.valueOf(PLAYER_1_THROW_BUTTON));
        prop.setProperty("PLAYER_1_PUNCH", String.valueOf(PLAYER_1_ATTACK_BUTTON));
        prop.setProperty("PLAYER_1_ACTIVE_SKILL", String.valueOf(PLAYER_1_SPECIAL_BUTTON));

        //Player 2
        prop.setProperty("PLAYER_2_USE_GAMEPAD", String.valueOf(PLAYER_2_USE_GAMEPAD));
        prop.setProperty("PLAYER_2_MOVE_UP", String.valueOf(PLAYER_2_MOVE_UP));
        prop.setProperty("PLAYER_2_MOVE_LEFT", String.valueOf(PLAYER_2_MOVE_LEFT));
        prop.setProperty("PLAYER_2_MOVE_DOWN", String.valueOf(PLAYER_2_MOVE_DOWN));
        prop.setProperty("PLAYER_2_MOVE_RIGHT", String.valueOf(PLAYER_2_MOVE_RIGHT));
        prop.setProperty("PLAYER_2_START", String.valueOf(PLAYER_2_START));
        prop.setProperty("PLAYER_2_PRIMARY_ACTION_BUTTON", String.valueOf(PLAYER_2_GRAB_BUTTON));
        prop.setProperty("PLAYER_2_SECONDARY_ACTION_BUTTON", String.valueOf(PLAYER_2_THROW_BUTTON));
        prop.setProperty("PLAYER_2_PUNCH", String.valueOf(PLAYER_2_ATTACK_BUTTON));
        prop.setProperty("PLAYER_2_ACTIVE_SKILL", String.valueOf(PLAYER_2_SPECIAL_BUTTON));

        prop.store(output, "INPUT CONTROLS SETTINGS");
        output.write("\n\n".getBytes());
        output.flush();
    }

    private static void writeGameRulesProperies(FileOutputStream output) throws IOException {
        OrderedProperties prop = new OrderedProperties();

        prop.setProperty("KUBOTZ_SPEED_X", String.valueOf(KUBOTZ_SPEED_X));
        prop.setProperty("KUBOTZ_SPEED_Y", String.valueOf(KUBOTZ_SPEED_Y));
        prop.setProperty("KUBOTZ_NB_JUMPS", String.valueOf(KUBOTZ_NB_JUMPS));

        prop.setProperty("PUNCH_DAMAGE", String.valueOf(PUNCH_DAMAGE));
        prop.setProperty("PUNCH_COOLDOWN", String.valueOf(PUNCH_COOLDOWN));

        prop.setProperty("FLYBOOTS_DURATION", String.valueOf(FLYBOOTS_DURATION));
        prop.setProperty("FLYBOOTS_COOLDOWN", String.valueOf(FLYBOOTS_COOLDOWN));

        prop.setProperty("DASHBOOTS_COOLDOWN", String.valueOf(DASHBOOTS_COOLDOWN));

        prop.setProperty("LASER_SWORD_DAMAGE", String.valueOf(LASER_SWORD_DAMAGE));
        prop.setProperty("LASER_SWORD_COOLDOWN", String.valueOf(LASER_SWORD_COOLDOWN));

        prop.setProperty("LASER_GUN_MK_I_DAMAGE", String.valueOf(LASER_GUN_MK_I_DAMAGE));
        prop.setProperty("LASER_GUN_MK_I_SPEED", String.valueOf(LASER_GUN_MK_I_SPEED));
        prop.setProperty("LASER_GUN_MK_I_COOLDOWN", String.valueOf(LASER_GUN_MK_I_COOLDOWN));
        prop.setProperty("LASER_GUN_MK_II_DAMAGE", String.valueOf(LASER_GUN_MK_II_DAMAGE));
        prop.setProperty("LASER_GUN_MK_II_SPEED", String.valueOf(LASER_GUN_MK_II_SPEED));
        prop.setProperty("LASER_GUN_MK_II_COOLDOWN", String.valueOf(LASER_GUN_MK_II_COOLDOWN));

        prop.setProperty("DRONE_SPEED_X", String.valueOf(DRONE_SPEED_X));
        prop.setProperty("DRONE_SPEED_Y", String.valueOf(DRONE_SPEED_Y));

        prop.setProperty("GRAVITY_X", String.valueOf(GRAVITY_X));
        prop.setProperty("GRAVITY_Y", String.valueOf(GRAVITY_Y));

        prop.setProperty("RESPAWN_DELAY", String.valueOf(RESPAWN_DELAY));

        prop.store(output, "GAME RULES SETTINGS");
        output.write("\n\n".getBytes());
        output.flush();
    }




    private static void loadControlsProperties(OrderedProperties prop){

        PLAYER_1_USE_GAMEPAD = Boolean.parseBoolean(prop.getProperty("PLAYER_1_USE_GAMEPAD"));
        PLAYER_2_USE_GAMEPAD = Boolean.parseBoolean(prop.getProperty("PLAYER_2_USE_GAMEPAD"));




        PLAYER_1_MOVE_UP = Integer.parseInt(prop.getProperty("PLAYER_1_MOVE_UP"));
        PLAYER_1_MOVE_LEFT = Integer.parseInt(prop.getProperty("PLAYER_1_MOVE_LEFT"));
        PLAYER_1_MOVE_DOWN = Integer.parseInt(prop.getProperty("PLAYER_1_MOVE_DOWN"));
        PLAYER_1_MOVE_RIGHT = Integer.parseInt(prop.getProperty("PLAYER_1_MOVE_RIGHT"));
        PLAYER_1_START = Integer.parseInt(prop.getProperty("PLAYER_1_START"));
        PLAYER_1_GRAB_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_1_PRIMARY_ACTION_BUTTON"));
        PLAYER_1_THROW_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_1_SECONDARY_ACTION_BUTTON"));
        PLAYER_1_ATTACK_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_1_PUNCH"));
        PLAYER_1_SPECIAL_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_1_ACTIVE_SKILL"));

        //Player 2
        PLAYER_2_MOVE_UP = Integer.parseInt(prop.getProperty("PLAYER_2_MOVE_UP"));
        PLAYER_2_MOVE_LEFT = Integer.parseInt(prop.getProperty("PLAYER_2_MOVE_LEFT"));
        PLAYER_2_MOVE_DOWN = Integer.parseInt(prop.getProperty("PLAYER_2_MOVE_DOWN"));
        PLAYER_2_MOVE_RIGHT = Integer.parseInt(prop.getProperty("PLAYER_2_MOVE_RIGHT"));
        PLAYER_2_START = Integer.parseInt(prop.getProperty("PLAYER_2_START"));
        PLAYER_2_GRAB_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_2_PRIMARY_ACTION_BUTTON"));
        PLAYER_2_THROW_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_2_SECONDARY_ACTION_BUTTON"));
        PLAYER_2_ATTACK_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_2_PUNCH"));
        PLAYER_2_SPECIAL_BUTTON = Integer.parseInt(prop.getProperty("PLAYER_2_ACTIVE_SKILL"));



    }







}