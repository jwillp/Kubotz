package com.brm.GoatEngine.ECS.common;

import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.ScriptingEngine.ScriptingEngine;
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
        for(String script: scriptComp.getScripts()){
            if(!gamePad.getPressedButtons().isEmpty()){
                //script.onInput(entity, gamePad.getPressedButtons());

            }
        }
    }

    @Override
    public void update(float dt) {

        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(String scriptFile: scriptComp.getScripts()){

                //See if the script was registered with the engine
                if(!GoatEngine.get().getScriptEngine().isScriptRegistered(scriptFile)){
                    Script script = GoatEngine.get().getScriptEngine().registerScript(scriptFile);
                    GoatEngine.get().getScriptEngine().runScript(script);
                    //GoatEngine.get().getScriptEngine().runScript("onInit()", script.getScope());
                    GoatEngine.get().getScriptEngine().callFunction(
                            "onInit", script.getScope(), entity, entity.getManager()
                    );



                }
                Script script =  GoatEngine.get().getScriptEngine().getScript(scriptFile);
                GoatEngine.get().getScriptEngine().callFunction(
                        "onUpdate", script.getScope(), entity, entity.getManager()
                );
                // ON UPDATE
                //script.onUpdate(entity, getEntityManager());
            }
        }
    }


    @Override
    public <T extends EntityEvent> void onEvent(T event) {
        Entity entity = getEntityManager().getEntity(event.getEntityId());
        if(entity.hasComponentEnabled(ScriptComponent.ID)){
            ScriptComponent scripts = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            /*for(EntityScript script: scripts.getScripts()){
                if(event.getClass() == CollisionEvent.class){
                    script.onCollision((CollisionEvent)event, entity); //TODO get rid of this! generify!
                }else{
                    script.onEvent(event, entity);
                }
            }*/
        }
    }








}
