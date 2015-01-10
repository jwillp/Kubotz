package com.brm.Kubotz.Input;


import java.util.HashMap;

public class GameAction {



    public static final String MOVE_RIGHT = "mr";
    public static final String MOVE_LEFT = "ml";
    public static final String MOVE_STOP = "ms";
    public static final String MOVE_JUMP = "j";
    public static final String MOVE_DOWN = "md";
    public static final String CROUCH = "c";


    public static final String PRIMARY_SKILL = "ps";
    public static final String SECONDARY_SKILL = "ss";
    public static final String PUNCH = "p";
    public static final String KICK = "k";
    public static final String PAUSE_GAME = "pg";



    private HashMap<String, Object> data = new HashMap<String, Object>();

    public GameAction(){

    }

    /**
     * Adds a new information (data) to the game action
     * @param key: The key of the data to add
     * @param value: the value to add
     * @return this for Chaining
     */
    public GameAction addData(String key, Object value){
        this.data.put(key, value);
        return this;
    }

    /**
     * Returns a data
     * @param key: the key of the data to retrieve
     * @return
     */
    public Object getData(String key){
        return this.data.get(key);
    }


}
