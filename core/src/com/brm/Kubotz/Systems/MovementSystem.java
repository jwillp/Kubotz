package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Component.Skills.FlyComponent;
import com.brm.Kubotz.Input.GameButton;

import java.util.ArrayList;

/**
 * System handling the controllable Entities such as most characters
 */
public class MovementSystem extends com.brm.GoatEngine.ECS.System.System {


    public MovementSystem(EntityManager em) {
        super(em);
    }

    public void update(){

        // For each controllable entity --> process every possible action
        for(Entity e : this.em.getEntitiesWithComponent(VirtualGamePad.ID)){

            VirtualGamePad gamepad = (VirtualGamePad) e.getComponent(VirtualGamePad.ID);

            ArrayList<VirtualButton> btnToRelease = new ArrayList<VirtualButton>();

            for(VirtualButton btn : gamepad.getPressedButtons()){
                processMovementButtons(e, btn);

            }


            if(!gamepad.isAnyButtonPressed()){
                decelerate((PhysicsComponent)e.getComponent(PhysicsComponent.ID));
            }

        }
    }

    /**
     * Process a Movement Button for an entity
     * @param entity
     * @param btn
     */
    private void processMovementButtons(Entity entity, VirtualButton btn){

        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

        if(btn == GameButton.MOVE_UP){
            jump(entity);
        }else if(btn == GameButton.MOVE_DOWN){
            moveDown(phys);

        }else if(btn == GameButton.MOVE_RIGHT){
            moveRight(phys);
        }else if(btn == GameButton.MOVE_LEFT){
            moveLeft(phys);
        }else{
            //No movement made we decelerate
            decelerate(phys);
        }
    }

    /***
     * Makes the entity move left
     */
    private void moveLeft(PhysicsComponent mp){
        Vector2 vel = mp.getVelocity();

        float resultingVelocity = vel.x - mp.getAcceleration().x;

        if(Math.abs(resultingVelocity) > mp.MAX_SPEED.x){
            resultingVelocity = -mp.MAX_SPEED.x;
        }

        mp.getBody().setLinearVelocity(resultingVelocity, vel.y);
    }

    /**
     * Makes the entity move right
     */
    private void moveRight(PhysicsComponent mp){
        Vector2 vel = mp.getVelocity();

        float resultingVelocity = vel.x + mp.getAcceleration().x;
        if(resultingVelocity > mp.MAX_SPEED.x){
            resultingVelocity = mp.MAX_SPEED.x;
        }

        mp.getBody().setLinearVelocity(resultingVelocity, vel.y);
    }


    /**
     * Decides wether we fly upwards or jump
     */ // TODO do the same for crouch and fall down
    private void moveUp(Entity entity){
        if(entity.hasComponent(FlyComponent.ID)){
            flyUp(entity);
        }else{
            jump(entity);
        }
    }




    /**
     * Makes the entity fly upwards
     */
    private void flyUp(Entity entity){
        PhysicsComponent phys = ((PhysicsComponent)entity.getComponent(PhysicsComponent.ID));
        Vector2 vel = phys.getVelocity();
        Vector2 accel = phys.getAcceleration();

        float resultingVelocity = vel.y + accel.y;
        if(resultingVelocity > phys.MAX_SPEED.y){
            resultingVelocity = phys.MAX_SPEED.y;
        }
        phys.getBody().setLinearVelocity(resultingVelocity, vel.y);
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
                Vector2 vel = phys.getVelocity();
                float resultingVelocity = -phys.getBody().getWorld().getGravity().y*0.6f;
                phys.getBody().setLinearVelocity(vel.x, resultingVelocity*phys.getBody().getGravityScale());
                phys.setGrounded(false);
                jp.nbJujmps++;
            }
        }
    }

    /**
     * Makes the entity fall faster when not on ground
     */ // TODO Tweak to make it better ==> at higher speed it slows you down instead of making you faster
    private void moveDown(PhysicsComponent phys){
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.y - phys.getAcceleration().y;
        if(Math.abs(resultingVelocity) > phys.MAX_SPEED.y){
            resultingVelocity = -phys.MAX_SPEED.y;
        }
        // it's half a jump
        phys.getBody().setLinearVelocity(vel.x, resultingVelocity * phys.getBody().getGravityScale());
    }

    /**
     * Gradually stops the entity by applying deceleration
     * to its velocity
     */
    private void decelerate(PhysicsComponent phys){
        if(phys.isGrounded()){
            Vector2 vel = phys.getVelocity();
            // DECELERATION (the character needs to slow down!)
            if (vel.x != 0) {
                if (vel.x > 0) {
                    phys.getBody().setLinearVelocity(vel.x - phys.getAcceleration().x, vel.y);
                } else {
                    phys.getBody().setLinearVelocity(vel.x + phys.getAcceleration().x, vel.y);
                }
                if(Math.abs(vel.x) < 0.1){ // so it can go to 0 (otherwise we could move for ever)
                    phys.getBody().setLinearVelocity(0, vel.y);
                }
            }
        }
    }

    /**
     * Abruptly stops the controllable entity in X
     */
    private void stopX(PhysicsComponent phys){
        Vector2 vel = phys.getVelocity();
        phys.getBody().setLinearVelocity(0, vel.y);
    }

    /**
     * Abruptly stops the controllable entity in Y
     */
    private void stopY(PhysicsComponent phys){
        Vector2 vel = phys.getVelocity();
        phys.getBody().setLinearVelocity(vel.x, 0);
    }




}
