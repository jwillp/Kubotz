package com.brm.GoatEngine.ECS.Systems;

import com.brm.GoatEngine.ECS.Components.ScriptComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Event;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Events.CollisionEvent;


/**
 * Responsible for updateing sripts
 */
public class ScriptSystem extends EntitySystem{

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
                    script.onInit(entity);
                    script.setInitialized(true);
                }
                // ON UPDATE
                script.onUpdate(entity);
            }
        }
    }


    @Override
    public <T extends Event> void onEvent(T event) {
        if(event.getClass() == CollisionEvent.class){
            CollisionEvent contact = (CollisionEvent) event;
            if(contact.getEntityA().hasComponentEnabled(ScriptComponent.ID)){
                this.onCollision(contact, contact.getEntityA());
            }
        }
    }

    /**
     * Checks if entity has any collision if so call the right method of script
     * @param entity
     */
    private void onCollision(CollisionEvent contact, Entity entity){
        ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
        for(EntityScript script: scriptComp.getScripts()){
            script.onCollision(contact);
        }
    }


}
