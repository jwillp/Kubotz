package com.brm.Kubotz.Systems.MovementSystem;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Input.GameButton;

/**
 * On Ground Movement System: Walking + Jumping
 */
public class WalkingSystem extends EntitySystem {


    public WalkingSystem(EntityManager em) {
        super(em);
    }



    /**
     * Process a Movement Button for the entities
     */
    public void handleInput(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

        if (!gamePad.isAnyButtonPressed()) {
            decelerate(entity);
        } else {
            if (gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                jump(entity);
            } else if (gamePad.isButtonPressed(GameButton.MOVE_DOWN)) {
                moveDown(entity); // TODO test if crouch or fall down
            } else if (gamePad.isButtonPressed(GameButton.MOVE_RIGHT)) {
                moveRight(entity);
            } else if (gamePad.isButtonPressed(GameButton.MOVE_LEFT)) {
                moveLeft(entity);
            } else {
                //No movement made we decelerate
                decelerate(entity);
            }
        }
    }


    /***
     * Makes the entity move left (whether it is during flying or walking or dashing)
     */
    private void moveLeft(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

        Vector2 vel = phys.getVelocity();
        float resultingVelocity = vel.x - phys.getAcceleration().x;

        if(Math.abs(resultingVelocity) > phys.MAX_SPEED.x){
            resultingVelocity = -phys.MAX_SPEED.x;
        }

        phys.getBody().setLinearVelocity(resultingVelocity, vel.y);
    }

    /**
     * Makes the entity move right (whether it is during flying or walking or dashing)
     */
    private void moveRight(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();
        float resultingVelocity = vel.x + phys.getAcceleration().x;
        if(resultingVelocity > phys.MAX_SPEED.x){
            resultingVelocity = phys.MAX_SPEED.x;
        }
        MovementSystem.moveInX(entity, resultingVelocity);
    }


    /**
     * Makes the entity jump
     */
    private void jump(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        JumpComponent jp;
        if(entity.hasComponent(JumpComponent.ID)){
            jp = (JumpComponent) entity.getComponent(JumpComponent.ID);

            if(phys.isGrounded() || jp.nbJujmps < jp.getNbJumpsMax()){
                if(phys.isGrounded()){ //Reset jump number
                    jp.nbJujmps = 0;
                }
                float resultingVelocity = -phys.getBody().getWorld().getGravity().y*0.6f; //TODO What is this?
                MovementSystem.moveInY(entity, resultingVelocity * phys.getBody().getGravityScale());
                phys.setGrounded(false);
                jp.nbJujmps++;
            }
        }
    }

    /**
     * Makes the entity fall faster when not on ground
     */ // TODO Tweak to make it better ==> at higher speed it slows you down instead of making you faster
    private void moveDown(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.y - phys.getAcceleration().y;
        if(Math.abs(resultingVelocity) > phys.MAX_SPEED.y){
            resultingVelocity = -phys.MAX_SPEED.y;
        }
        // it's half a jump
        MovementSystem.moveInY(entity, resultingVelocity);
    }

    /**
     * Gradually stops the entity by applying deceleration
     * to its velocity
     * @param entity the entity to stop
     */
    private void decelerate(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        if(phys.isGrounded()){
            Vector2 vel = phys.getVelocity();
            // DECELERATION (the character needs to slow down!)
            float finalVel = (vel.x > 0) ?
                    Math.max(vel.x - phys.getAcceleration().x, 0) : Math.min(vel.x + phys.getAcceleration().x, 0);
            MovementSystem.moveInX(entity, finalVel);
        }
    }
}
