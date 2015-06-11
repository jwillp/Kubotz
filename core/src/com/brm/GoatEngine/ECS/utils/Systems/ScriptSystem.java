package com.brm.GoatEngine.ECS.utils.Systems;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.ECS.utils.Components.ScriptComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.utils.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Common.Events.CollisionEvent;


/**
 * Responsible for updateing sripts
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
        for(EntityScript script: scriptComp.getScripts()){
            if(!gamePad.getPressedButtons().isEmpty()){
                script.onInput(entity, gamePad.getPressedButtons());
            }
        }
    }

    @Override
    public void update(float dt) {

        for(Entity entity: getEntityManager().getEntitiesWithComponent(ScriptComponent.ID)){
            ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(EntityScript script: scriptComp.getScripts()){

                //ON INIT
                if(!script.isInitialized()){
                    script.onInit(entity, getEntityManager());
                    script.setInitialized(true);
                }
                // ON UPDATE
                script.onUpdate(entity, getEntityManager());
            }
        }
    }


    @Override
    public <T extends Event> void onEvent(T event) {
        Entity entity = getEntityManager().getEntity(event.getEntityId());
        if(entity.hasComponentEnabled(ScriptComponent.ID)){
            ScriptComponent scripts = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(EntityScript script: scripts.getScripts()){
                if(event.getClass() == CollisionEvent.class){
                    script.onCollision((CollisionEvent)event); //TODO get rid of this! generify!
                }else{
                    script.onEvent(event);
                }
            }
        }
    }



}
