package com.brm.GoatEngine.ECS.Systems;

import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.ScriptComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;


/**
 * Responsible for updateing sripts
 */
public class ScriptSystem extends EntitySystem{

    public ScriptSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init() {

    }

    @Override
    public void handleInput() {
        for(Entity entity: em.getEntitiesWithComponent(ScriptComponent.ID)){
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
                script.onInput(entity, em, gamePad.getPressedButtons());
            }
        }
    }

    @Override
    public void update(float dt) {

        for(Entity entity: em.getEntitiesWithComponent(ScriptComponent.ID)){
            ScriptComponent scriptComp = (ScriptComponent) entity.getComponent(ScriptComponent.ID);
            for(EntityScript script: scriptComp.getScripts()){
                // ON COLLISION
                this.onCollision(entity, script);

                // ON UPDATE
                script.onUpdate(entity, em);
            }
        }
    }


    /**
     * Checks if entity has any collision if so call the right method of script
     * @param entity
     */
    private void onCollision(Entity entity, EntityScript script){
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        for(EntityContact contact: phys.getContacts()){
            script.onCollision(contact);
        }
    }








}
