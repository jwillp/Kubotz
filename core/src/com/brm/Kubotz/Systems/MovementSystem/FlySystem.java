package com.brm.Kubotz.Systems.MovementSystem;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Skills.Active.FlyComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * In Air Movement System (FlyComponent)
 */
public class FlySystem extends EntitySystem {


    public FlySystem(EntityManager em) {
        super(em);
    }

    /**
     * Handles the Input for en entity
     * having Input i.e. with a VirtualGamePad
     */
    public void handleInput(Entity entity){
        FlyComponent flyComponent = (FlyComponent) entity.getComponent(FlyComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

        if(flyComponent.isEnabled()){
            if (gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                flyUp(entity);
            }else if (gamePad.isButtonPressed(GameButton.MOVE_DOWN)) {
                flyDown(entity);

            }else if (gamePad.isButtonPressed(GameButton.MOVE_RIGHT)) {
                flyRight(entity);
            }else if (gamePad.isButtonPressed(GameButton.MOVE_LEFT)) {
                flyLeft(entity);
            }else if (gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)) {
                //STOP REQUESTED
                onStopFlyRequest(entity);
            }else{ //No movement made? we decelerate
                decelerate(entity);
            }

        }else{ // Disabled
            //Fly Request
            if (gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)){
                onFlyRequest(entity);
            }
        }
    }

    /**
     * Method called when the entity requested to fly
     * @param entity the entity to process
     */
    private void onFlyRequest(Entity entity) {
        //Double Check
        if(entity.hasComponent(FlyComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            FlyComponent flyComponent = (FlyComponent) entity.getComponent(FlyComponent.ID);
            // We want to fly
            if (flyComponent.isDisabled() && flyComponent.getCoolDownTimer().isDone()) {
                flyComponent.setEnabled(true);
                phys.getBody().setGravityScale(0);
                flyComponent.getEffectDurationTimer().reset();
                Logger.log("Entity" + entity.getID() + " ==> FLYING MODE ENABLED");
            }
        }
    }


    /**
     * Method called when an entity requests to stop flying
     * @param entity the entity to process
     */
    private void onStopFlyRequest(Entity entity){
        FlyComponent flyComponent = (FlyComponent) entity.getComponent(FlyComponent.ID);
        if (flyComponent.isEnabled() && !flyComponent.getEffectDurationTimer().isDone()) {
            flyComponent.getEffectDurationTimer().terminate();
        } //The real dissabling will be done during the update
    }

    /**
     * Checks whether or not an entity is still allowed to fly
     * Basically tries to disable it under the right conditions
     * Checks all entities with FlyingComponent
     */
    public void update(){
        for(Entity entity : this.em.getEntitiesWithComponent(FlyComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            FlyComponent flyComponent = (FlyComponent) entity.getComponent(FlyComponent.ID);

            //Do we need to disable?
            if (flyComponent.isEnabled() && flyComponent.getEffectDurationTimer().isDone()) {
                flyComponent.setEnabled(false);
                MovementSystem.stopY(entity);
                phys.getBody().setGravityScale(1);
                flyComponent.getCoolDownTimer().reset();
                Logger.log("Entity" + entity.getID() + " ==> FLYING MODE DISABLED");
            }
        }
    }





    /**
     * Makes an entity fly upwards
     * (Flying component must be already enabled)
     * @param entity the entity to fly
     */
    private void flyUp(Entity entity){
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = ((PhysicsComponent)entity.getComponent(PhysicsComponent.ID));
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.y + flyComp.acceleration.y;
        if(resultingVelocity > flyComp.MAX_SPEED.y){
            resultingVelocity = flyComp.MAX_SPEED.y;
        }
        MovementSystem.moveInY(entity, resultingVelocity);

    }

    /**
     * Makes an entity fly downwards
     * (Flying component must be already enabled)
     * @param entity the entity to fly
     */
    private void flyDown(Entity entity){
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.y - flyComp.acceleration.y;
        if(Math.abs(resultingVelocity) > flyComp.MAX_SPEED.y){
            resultingVelocity = -flyComp.MAX_SPEED.y;
        }

        MovementSystem.moveInY(entity, resultingVelocity);
    }

    /**
     * Flies an entity to the left
     * @param entity the entity to fly
     */
    private void flyLeft(Entity entity) {
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.x - flyComp.acceleration.x;
        if(Math.abs(resultingVelocity) > flyComp.MAX_SPEED.x){
            resultingVelocity = -flyComp.MAX_SPEED.x;
        }
        MovementSystem.moveInX(entity, resultingVelocity);
    }

    /**
     * Flies an entity to the right
     * @param entity the entity to fly
     */
    private void flyRight(Entity entity) {
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.x + flyComp.acceleration.x;
        if(resultingVelocity > flyComp.MAX_SPEED.x){
            resultingVelocity = flyComp.MAX_SPEED.x;
        }
        MovementSystem.moveInX(entity, resultingVelocity);
    }





    /**
     * Decelerates an entity in air (during flight)
     * @param entity the entity decelerate
     */
    private void decelerate(Entity entity){
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();



        float finalVelX = (vel.x > 0) ?
                Math.max(vel.x - flyComp.deceleration.x, 0.0f) : Math.min(vel.x + flyComp.deceleration.x, 0.0f);
        MovementSystem.moveInX(entity, finalVelX);

        float finalVelY = (vel.y > 0) ?
                Math.max(vel.y - flyComp.deceleration.y, 0.0f) : Math.min(vel.y + flyComp.deceleration.y, 0.0f);
        MovementSystem.moveInY(entity, finalVelY);
    }






}
