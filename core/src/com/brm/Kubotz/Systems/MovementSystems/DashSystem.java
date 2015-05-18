package com.brm.Kubotz.Systems.MovementSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.GameMath.Vectors;
import com.brm.Kubotz.Components.Movements.DashComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * Handles Dash Movements
 */
public class DashSystem extends EntitySystem{

    public DashSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init(){

    }



    public void handleInput(){
        for(Entity entity : em.getEntitiesWithComponent(DashComponent.ID)){
            if(entity.hasComponentEnabled(VirtualGamePad.ID)){
                this.handleInputForEntity(entity);
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

        if(dashComp.getPhase() == DashComponent.Phase.NONE){

            boolean isDashValid = true;

            //Find dash direction
            if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT)){
                dashComp.getDirection().x = DashComponent.RIGHT;
            }else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT)){
                dashComp.getDirection().x = DashComponent.LEFT;
            }else if(gamePad.isButtonPressed(GameButton.MOVE_UP)){
                dashComp.getDirection().y = DashComponent.UP;
            }else if(gamePad.isButtonPressed(GameButton.MOVE_DOWN)){
                dashComp.getDirection().y = DashComponent.DOWN;
            }else{
                isDashValid = false;
            }

            if(isDashValid){
                PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
                // Put the entity in preparation Phase
                dashComp.setPhase(DashComponent.Phase.PREPARATION);
                dashComp.getPreparationDuration().reset();
                dashComp.setStartPosition(phys.getPosition().cpy());
            }
        }
    }



    /**
     * Checks whether or not an entity is still allowed to dash
     * Basically tries to disable it under the right conditions
     * Checks all entities with DashComponent
     */
    @Override
    public void update(float dt){
        for(Entity entity : this.em.getEntitiesWithComponent(DashComponent.ID)) {
            DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

            if (dashComp.isEnabled()) {
                //Are We Done with the preparing phase?
                if(dashComp.getPhase() == DashComponent.Phase.PREPARATION){
                    updatePreparationPhase(entity);
                } else if(dashComp.getPhase() == DashComponent.Phase.TRAVEL){
                    updateTravelPhase(entity);
                }else if(dashComp.getPhase() == DashComponent.Phase.DECELERATION){
                    updateDecelerationPhase(entity);
                }else if(dashComp.getPhase() == DashComponent.Phase.DONE){
                    dashComp.setPhase(DashComponent.Phase.NONE); //Reset
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
            dashComp.setPhase(DashComponent.Phase.TRAVEL);
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
        if (Vectors.euclidianDistance(phys.getPosition(), dashComp.getStartPosition()) >= dashComp.getDistance().x
                || dashComp.getTravelDuration().isDone()) {
            dashComp.setPhase(DashComponent.Phase.DECELERATION);
        }else{
            Vector2 velocity = new Vector2();
            velocity.x = dashComp.getDirection().x * (phys.getVelocity().x + dashComp.getSpeed().x) * Gdx.graphics.getDeltaTime();
            velocity.y = dashComp.getDirection().y * (phys.getVelocity().y + dashComp.getSpeed().y) * Gdx.graphics.getDeltaTime();
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
        if(dashComp.getDirection().x != 0){
            decelVel.x = (phys.getVelocity().x > 0) ?
                    Math.max(phys.getVelocity().x - dashComp.getSpeed().x, 0):
                    Math.min(phys.getVelocity().x + dashComp.getSpeed().x, 0);
            MovementSystem.moveInX(entity, decelVel.x * Gdx.graphics.getDeltaTime());
        }


        if (dashComp.getDirection().y != 0) {
            decelVel.y = (phys.getVelocity().y > 0) ?
                    Math.max(phys.getVelocity().y - dashComp.getSpeed().y, 0):
                    Math.min(phys.getVelocity().y + dashComp.getSpeed().y, 0);
            MovementSystem.moveInY(entity, decelVel.y * Gdx.graphics.getDeltaTime());
        }

        // Is the entity done decelerating
        if(phys.getVelocity().x == 0){
            dashComp.getDirection().set(0, 0);
            phys.getBody().setGravityScale(1);
            dashComp.setPhase(DashComponent.Phase.DONE);
        }

    }







}