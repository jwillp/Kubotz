package com.brm.GoatEngine.ScriptingEngine;

import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.EventManager.GameEvent;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Events.CollisionEvent;


/**
 * Responsible for updating game scripts for entities
 */
public class ScriptSystem extends EntitySystem {


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
                if(script == null){ continue; }
                try{
                    script.onInput(entity, gamePad.getPressedButtons());
                }catch(Exception e){
                    GoatEngine.scriptEngine.logError(scriptFile, e.getMessage());
                }
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
                if(script == null){ continue; }
                if(!script.isInitialized()){
                    script.onInit(entity, getEntityManager());
                    script.setInitialized(true);
                }
                try{
                    script.onUpdate(entity, getEntityManager());
                }catch(Exception e){
                    GoatEngine.scriptEngine.logError(scriptFile, e.getMessage());
                }
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
                if(script == null){continue;}
                if(event.getClass() == CollisionEvent.class){
                    try{
                        script.onCollision((CollisionEvent) event, entity);
                    }catch (Exception e){
                        GoatEngine.scriptEngine.logError(scriptFile, e.getMessage());
                    }

                }else{
                    try{
                        script.onEvent(event, entity);
                    }catch (Exception e){
                        GoatEngine.scriptEngine.logError(scriptFile, e.getMessage());
                    }
                }
            }
        }
    }



}
