package com.brm.GoatEngine.ECS.core;

import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.EventManager.GameEvent;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScriptingEngine.EntityScript;
import com.brm.GoatEngine.ScriptingEngine.ReloadScriptEvent;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Events.CollisionEvent;

import static com.brm.GoatEngine.ScriptingEngine.ScriptingEngine.*;


/**
 * Responsible for updating game scripts
 */
public class ScriptSystem extends EntitySystem {


    // The game Scripts follow a strict API
    // they must absolutely implements these methods
    public final static String METHOD_ON_INIT = "onInit()";



    public ScriptSystem(){}

    @Override
    public void init() {


    }

    @Override
    public void handleInput() {
        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            if(entity.hasComponentEnabled(VirtualGamePad.ID)){
                handleInputForEntity(entity);
            }
        }
    }


    private void handleInputForEntity(Entity entity){
        ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        for(String scriptFile: scriptComp.getScripts()){
            if(!gamePad.getPressedButtons().isEmpty()){
                EntityScript script =  GoatEngine.scriptEngine.runEntityScript(scriptFile, entity);
                script.onInput(entity, gamePad.getPressedButtons());
            }
        }
    }

    @Override
    public void update(float dt) {

        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(String scriptFile: scriptComp.getScripts()){

                // ON UPDATE

                EntityScript script =  GoatEngine.scriptEngine.runEntityScript(scriptFile, entity);
                if(!script.isInitialized()){
                    script.onInit(entity, getEntityManager());
                    script.setInitialized(true);
                }
                script.onUpdate(entity, getEntityManager());
            }
        }
    }


    @Override
    public <T extends EntityEvent> void onEntityEvent(T event) {
        Entity entity = getEntityManager().getEntity(event.getEntityId());
        if(entity.hasComponentEnabled(ScriptComponent.ID)){
            ScriptComponent scripts = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(String scriptFile: scripts.getScripts()){
                EntityScript script =  GoatEngine.scriptEngine.runEntityScript(scriptFile, entity);
                if(event.getClass() == CollisionEvent.class){
                   script.onCollision((CollisionEvent) event, entity);
                }else{
                    script.onEvent(event, entity);
                }
            }
        }
    }

    /**
     * Called when the system reveives a global event (might not be entity Event)
     *
     * @param event
     */
    @Override
    public <T extends GameEvent> void onGlobalEvent(T event) {

        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(String scriptFile: scriptComp.getScripts()){
                EntityScript script =  GoatEngine.scriptEngine.runEntityScript(scriptFile, entity);
                script.onGlobalEvent(event);
            }
        }
    }


}
