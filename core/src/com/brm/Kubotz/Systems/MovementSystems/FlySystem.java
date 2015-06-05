package com.brm.Kubotz.Systems.MovementSystems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.Movements.FlyComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * In Air Movement System (FlyComponent)
 */
public class FlySystem extends EntitySystem {


    public FlySystem(){}

    @Override
    public void init(){}


    public void handleInput(){
        for(Entity entity: getEntityManager().getEntitiesWithComponent(FlyComponent.ID)){
           if(entity.hasComponent(VirtualGamePad.ID)){
               handleInputForEntity(entity);
           }
        }
    }


    /**
     * Handles the Input for an entity
     * having Input i.e. with a VirtualGamePad
     */
    private void handleInputForEntity(Entity entity){
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
            }else{
                //No movement made? we decelerate
                decelerate(entity);
            }
        }
    }

    @Override
    public void update(float dt) {
        for(Entity entity: getEntityManager().getEntitiesWithComponent(FlyComponent.ID)) {

            // Make sure gravity does not affect entities with FlyComp
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            phys.getBody().setGravityScale(0);

        }
    }



    /**
     * Makes an entity fly upwards
     * (Flying component must be already enabled)
     * @param entity
     */
    private void flyUp(Entity entity){
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = ((PhysicsComponent)entity.getComponent(PhysicsComponent.ID));
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.y + flyComp.getAcceleration().y;
        if(resultingVelocity > flyComp.getMaxSpeed().y){
            resultingVelocity = flyComp.getMaxSpeed().y;
        }
        flyInY(entity, resultingVelocity);

    }

    /**
     * Makes an entity fly downwards
     * (Flying component must be already enabled)
     * @param entity
     */
    private void flyDown(Entity entity){
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.y - flyComp.getAcceleration().y;
        if(Math.abs(resultingVelocity) > flyComp.getMaxSpeed().y){
            resultingVelocity = -flyComp.getMaxSpeed().y;
        }

        this.flyInY(entity, resultingVelocity);
    }

    /**
     * Flies an entity to the left
     * @param entity
     */
    private void flyLeft(Entity entity) {
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.x - flyComp.getAcceleration().x;
        if(Math.abs(resultingVelocity) > flyComp.getMaxSpeed().x){
            resultingVelocity = -flyComp.getMaxSpeed().x;
        }
        flyInX(entity, resultingVelocity);
    }

    /**
     * Flies an entity to the right
     * @param entity
     */
    private void flyRight(Entity entity) {
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float resultingVelocity = vel.x + flyComp.getAcceleration().x;
        if(resultingVelocity > flyComp.getMaxSpeed().x){
            resultingVelocity = flyComp.getMaxSpeed().x;
        }
        flyInX(entity, resultingVelocity);
    }

    /**
     * Decelerates an entity
     * @param entity
     */
    private void decelerate(Entity entity){
        FlyComponent flyComp = (FlyComponent)entity.getComponent(FlyComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float finalVelX = (vel.x > 0) ?
                Math.max(vel.x - flyComp.getDeceleration().x, 0.0f) : Math.min(vel.x + flyComp.getDeceleration().x, 0.0f);
        flyInX(entity, finalVelX);

        float finalVelY = (vel.y > 0) ?
                Math.max(vel.y - flyComp.getDeceleration().y, 0.0f) : Math.min(vel.y + flyComp.getDeceleration().y, 0.0f);
        flyInY(entity, finalVelY);
    }

    /**
     * Makes an entity fly horizontally i.e. on the X axis
     * according to a specified velocity
     * (Flying component must be already enabled)
     */
    private void flyInX(Entity entity, float velocity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        phys.getBody().setLinearVelocity(velocity, phys.getVelocity().y);
    }

    /**
     * Makes an entity fly horizontally i.e. on the Y axis
     * according to a specified velocity
     * (Flying component must be already enabled)
     */
    private void flyInY(Entity entity, float velocity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        phys.getBody().setLinearVelocity(phys.getVelocity().x, velocity);
    }

    /**
     * Abruptly stops an entity in X from flying
     */
    private void stopX(Entity entity){
        flyInX(entity, 0);
    }

    /**
     * Abruptly stops the controllable an in Y from flying
     */
    private void stopY(Entity entity){
        flyInY(entity, 0);
    }

}