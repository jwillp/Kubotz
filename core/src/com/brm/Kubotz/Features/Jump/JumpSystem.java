package com.brm.Kubotz.Features.Jump;

import com.brm.GoatEngine.ECS.common.JumpComponent;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.Kubotz.Common.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Input.GameButton;

/**
 * All logic related to jumping
 */
public class JumpSystem extends EntitySystem{


    /**
     * Used to initialise the system
     */
    @Override
    public void init() {

    }

    /**
     * Called once per game frame
     *
     * @param dt
     */
    @Override
    public void update(float dt) {

        //RESET JUMPS IF the character is Grounded
        for (Entity entity : getEntityManager().getEntitiesWithComponent(JumpComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            JumpComponent jp = (JumpComponent) entity.getComponent(JumpComponent.ID);
            if (phys.isGrounded()) {
                jp.setNbJujmps(0);
            }
        }
    }


    @Override
    public <T extends EntityEvent> void onEntityEvent(T event) {
        if(event.isOfType(JumpActionEvent.class)){
            jump(event.getEntityId());
        }
    }


    /**
     * Makes the entity jump
     */
    private void jump(String entityId) {
        Entity entity = getEntityManager().getEntity(entityId);
        //If the entity actually has Jump Component
        if (entity.hasComponent(JumpComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            JumpComponent jp = (JumpComponent) entity.getComponent(JumpComponent.ID);

            if (jp.getNbJujmps() < jp.getNbJumpsMax()) {
                if (jp.getCooldown().isDone()) {
                    float resultingVelocity = jp.getSpeed() * phys.getBody().getGravityScale();
                    MovementSystem.moveInY(entity, resultingVelocity * phys.getBody().getGravityScale());
                    phys.setGrounded(false);
                    jp.setNbJujmps(jp.getNbJujmps() + 1);
                    jp.getCooldown().reset();
                }
            }
        }
    }




}
