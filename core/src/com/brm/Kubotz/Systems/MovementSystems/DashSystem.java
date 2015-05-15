package com.brm.Kubotz.Systems.MovementSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.GameMath;
import com.brm.Kubotz.Component.Movements.DashComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * Handles Dash Movements
 */
public class DashSystem extends EntitySystem{

    public DashSystem(EntityManager em) {
        super(em);
    }


    public void handleInput(){
        for(Entity entity : em.getEntitiesWithComponent(DashComponent.ID)){
            if(entity.hasComponentEnabled(VirtualGamePad.ID)){
                this.handleInput(entity);
            }

        }
    }


    /**
     * Handles the Input for an entity
     * having Input i.e. with a VirtualGamePad
     */
    private void handleInputForEntity(Entity entity){
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

        if(dashComp.phase == DashComponent.Phase.NONE){

            boolean isDashValid = true;

            //Find dash direction
            if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT)){
                dashComp.direction.x = DashComponent.RIGHT;
            }else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT)){
                dashComp.direction.x = DashComponent.LEFT;
            }else if(gamePad.isButtonPressed(GameButton.MOVE_UP)){
                dashComp.direction.y = DashComponent.UP;
            }else if(gamePad.isButtonPressed(GameButton.MOVE_DOWN)){
                dashComp.direction.y = DashComponent.DOWN;
            }else{
                isDashValid = false;
            }

            if(isDashValid){
                PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);

                // Put the entity in preparation Phase
                dashComp.phase = DashComponent.Phase.PREPARATION;
                dashComp.getPreparationDuration().reset();
                dashComp.startPosition = phys.getPosition().cpy();
            }
        }
    }



    /**
     * Checks whether or not an entity is still allowed to dash
     * Basically tries to disable it under the right conditions
     * Checks all entities with DashComponent
     */
    public void update(){
        for(Entity entity : this.em.getEntitiesWithComponent(DashComponent.ID)) {
            DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

            if (dashComp.isEnabled()) {
                //Are We Done with the preparing phase?
                if(dashComp.phase == DashComponent.Phase.PREPARATION){
                   updatePreparationPhase(entity);
                } else if(dashComp.phase == DashComponent.Phase.TRAVEL){
                    updateTravelPhase(entity);
                }else if(dashComp.phase == DashComponent.Phase.DECELERATION){
                    updateDecelerationPhase(entity);
                }

            }
        }

    }


    /**
     * Updates an entity when it is in PREPARATION phase
     * @param entity the entity to update
     */
    private void updatePreparationPhase(Entity entity){
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

        if(dashComp.getPreparationDuration().isDone()){
            //We can now proceed to dashing in whatever direction
            dashComp.phase = DashComponent.Phase.TRAVEL;
            dashComp.getTravelDuration().reset();
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            phys.getBody().setGravityScale(0);
        }else{
            MovementSystem.stopXY(entity);
        }

    }

    /**
     * Updates an entity when it is in TRAVEL phase
     * @param entity the entity to update
     */
    private void updateTravelPhase(Entity entity){
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

        // Do we need to disable?
        if (GameMath.distance(phys.getPosition(), dashComp.startPosition) >= dashComp.distance.x || dashComp.getTravelDuration().isDone()) {
            dashComp.phase = DashComponent.Phase.DECELERATION;
        }else{
            Vector2 velocity = new Vector2();
            velocity.x = dashComp.direction.x * (phys.getVelocity().x + dashComp.speed.x) * Gdx.graphics.getDeltaTime();
            velocity.y = dashComp.direction.y * (phys.getVelocity().y + dashComp.speed.y) * Gdx.graphics.getDeltaTime();
            MovementSystem.moveInX(entity, velocity.x);
            MovementSystem.moveInY(entity, velocity.y);

        }
    }


    /**
     * Updates an entity when it is in DECELERATION phase
     * @param entity the entity to update
     */
    private void updateDecelerationPhase(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

        Vector2 decelVel = new Vector2();


        //DECELERATION IN X //TODO Tweak for a smoother transition
        if(dashComp.direction.x != 0){
            decelVel.x = (phys.getVelocity().x > 0) ?
                    Math.max(phys.getVelocity().x - dashComp.speed.x, 0):
                    Math.min(phys.getVelocity().x + dashComp.speed.x, 0);
            MovementSystem.moveInX(entity, decelVel.x * Gdx.graphics.getDeltaTime());
        }


        if (dashComp.direction.y != 0) {
            decelVel.y = (phys.getVelocity().y > 0) ?
                    Math.max(phys.getVelocity().y - dashComp.speed.y, 0):
                    Math.min(phys.getVelocity().y + dashComp.speed.y, 0);
            MovementSystem.moveInY(entity, decelVel.y * Gdx.graphics.getDeltaTime());
        }

        // Is the entity done decelerating
        if(phys.getVelocity().x == 0){
            phys.getBody().setGravityScale(1);
            dashComp.phase = DashComponent.Phase.NONE;
        }

    }







}
