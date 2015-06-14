package com.brm.GoatEngine.ECS.utils.Systems;

import com.badlogic.gdx.Gdx;

/**
 * A Scritp API to be called by Javascript
 */
public class ScriptAPI{

    private ScriptSystem system;

    public ScriptAPI(ScriptSystem system) {
        this.system = system;
    }



    /**
     * Closes the game
     */
    public void exitGame(){
        Gdx.app.exit();
    }



    /**
     * Prints something
     */
    public void print(String s){
        System.out.println(s);
    }






    public ScriptSystem getSystem(){
        return this.system;
    }




}
