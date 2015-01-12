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
        // For each entity with a gamePad --> process buttons
        for(Entity e : this.em.getEntitiesWithComponent(VirtualGamePad.ID)){
                processMovementButtons(e);
        }
    }

    /**
     * Process a Movement Button for an entity
     * @param entity
     */
    private void processMovementButtons(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

        if(gamePad.isButtonPressed(GameButton.MOVE_UP)){
            moveUp(entity);
        }else if(gamePad.isButtonPressed(GameButton.MOVE_DOWN)){
            moveDown(entity);

        }else if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT)){
            moveRight(entity);
        }else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT)){
            moveLeft(entity);
        }else{
            //No movement made we decelerate
            decelerate(entity);
        }
        if(!gamePad.isAnyButtonPressed()){
            decelerate(entity);
        }// TODO Revise My Logic here

    }


    /**
     * Checks wether or not an entity is flying and disable enable gravity accordingly
     * @param entity
     */
    public void flyCheck(Entity entity){
        if(entity.hasComponent(FlyComponent.ID)){
            FlyComponent flyComponent = (FlyComponent) entity.getComponent(FlyComponent.ID);


            if(flyComponent.getDuration().isDone()){
                PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
                phys.getBody().setGravityScale(1);
                
            }



            if(flyComponent.isEnabled()){

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
        moveInX(entity, resultingVelocity);
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
        moveInY(entity, resultingVelocity);
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
                moveInY(entity, resultingVelocity*phys.getBody().getGravityScale());
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
        this.moveInY(entity, resultingVelocity * phys.getBody().getGravityScale());
    }


















    /**
     * Gradually stops the entity by applying deceleration
     * to its velocity
     */
    private void decelerate(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        if(phys.isGrounded()){
            Vector2 vel = phys.getVelocity();
            // DECELERATION (the character needs to slow down!)
            if (vel.x != 0) {
                if (vel.x > 0) {
                    moveInX(entity, vel.x - phys.getAcceleration().x);
                } else {
                    moveInX(entity, vel.x + phys.getAcceleration().x);
                }
                if(Math.abs(vel.x) < 0.1){ // so it can go to 0 (otherwise we could move for ever)
                    stopX(entity);
                }
            }
        }
    }



    /**
     * Makes an entity move horizontally i.e. on the X axis
     * according to a specified velocity
     */
    private void moveInX(Entity entity, float velocity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        phys.getBody().setLinearVelocity(velocity, phys.getVelocity().y);
    }

    /**
     * Makes an entity move horizontally i.e. on the Y axis
     * according to a specified velocity
     */
    private void moveInY(Entity entity, float velocity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        phys.getBody().setLinearVelocity(phys.getVelocity().x, velocity);
    }


    /**
     * Abruptly stops an entity in X
     */
    private void stopX(Entity entity){
        moveInX(entity, 0);
    }

    /**
     * Abruptly stops the controllable an in Y
     */
    private void stopY(Entity entity){
        moveInX(entity, 0);
    }
















}
