package com.brm.GoatEngine.ECS.utils.Systems;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.utils.Components.CameraTargetComponent;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;

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


    /**
     * Kill all players
     */
    public void killAll(){

    }


    public void killOne(){
        Entity entity = getSystem().getEntityManager().getEntitiesWithComponent(PlayerScoreComponent.ID).get(0);
        entity.removeComponent(CameraTargetComponent.ID);
    }









    public ScriptSystem getSystem(){
        return this.system;
    }




}
