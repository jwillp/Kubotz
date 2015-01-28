package com.brm.Kubotz.Systems.MovementSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.GameMath;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Skills.DashComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle dashes
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

    public void handleInput(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad)entity.getComponent(VirtualGamePad.ID);
        if(gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)){
            DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
            boolean isDashValid = true;

            //Find dash direction
            if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT)){
                dashComp.direction.x = DashComponent.RIGHT;
                Logger.log("DASH RIGHT");
            }else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT)){
                dashComp.direction.x = DashComponent.LEFT;
                Logger.log("DASH LEFT");
            }else if(gamePad.isButtonPressed(GameButton.MOVE_UP)){
                dashComp.direction.y = DashComponent.UP;
                Logger.log("DASH UP");
            }else if(gamePad.isButtonPressed(GameButton.MOVE_DOWN)){
                dashComp.direction.y = DashComponent.DOWN;
                Logger.log("DASH DOWN");
            }else{
                isDashValid = false;
            }

            //Request a Dash
            if(isDashValid){
                onDashRequest(entity);
            }

        }

    }

    /**
     * Method called when the entity requested to dash
     * @param entity the entity to process
     */
    private void onDashRequest(Entity entity){
        DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);


        //We want to dash! Can we?
        if(dashComp.isDisabled() && dashComp.getCoolDownTimer().isDone()){

            //Put component in preparing phase
            dashComp.phase = DashComponent.Phase.PREPARATION;

            dashComp.setEnabled(true);
            dashComp.getPreparationTimer().reset();
            dashComp.getEffectDurationTimer().reset();
            dashComp.startPosition = phys.getPosition().cpy();
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

                } else if(dashComp.phase == DashComponent.Phase.MOVEMENT){
                    updateMovementPhase(entity);

                }else if(dashComp.phase == DashComponent.Phase.DECELERATION){
                    updateDecelerationPhase(entity);

                }else if(dashComp.phase == DashComponent.Phase.RECOVERY){
                    updateRecoveryPhase(entity);
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

        if(dashComp.getPreparationTimer().isDone()){
            //We can now proceed to dashing in whatever direction
            dashComp.phase = DashComponent.Phase.MOVEMENT;
            Logger.log("Entity" + entity.getID() + " ==> DASH PHASE PREPARATION");
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            phys.getBody().setGravityScale(0);

        }else{
            MovementSystem.stopXY(entity);
        }

    }

    /**
     * Updates an entity when it is in MOVEMENT phase
     * @param entity the entity to update
     */
    private void updateMovementPhase(Entity entity){
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

        // Do we need to disable?
        if (GameMath.distance(phys.getPosition(), dashComp.startPosition) >= dashComp.distance.x || dashComp.getEffectDurationTimer().isDone()) {
            dashComp.phase = DashComponent.Phase.DECELERATION;
        }else{
            Vector2 velocity = new Vector2();
            velocity.x = dashComp.direction.x * (phys.getVelocity().x + dashComp.speed.x) * Gdx.graphics.getDeltaTime();
            velocity.y = dashComp.direction.y * (phys.getVelocity().y + dashComp.speed.y) * Gdx.graphics.getDeltaTime();
            MovementSystem.moveInX(entity, velocity.x);
            MovementSystem.moveInY(entity, velocity.y);
            Logger.log(velocity.x);
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
        decelVel.x = (phys.getVelocity().x > 0) ?
                Math.max(phys.getVelocity().x - dashComp.speed.x, 0) :
                Math.min(phys.getVelocity().x + dashComp.speed.x, 0);


        MovementSystem.moveInX(entity, decelVel.x * Gdx.graphics.getDeltaTime());

        Logger.log("Entity" + entity.getID() + " ==> DASH PHASE DECELERATION");

        // Is the entity done decelerating
        if(phys.getVelocity().x == 0){
            phys.getBody().setGravityScale(1);
            dashComp.phase = DashComponent.Phase.RECOVERY;

        }

    }

    /**
     * Updates an entity when it is in RECOVERY phase
     * @param entity
     */
    private void updateRecoveryPhase(Entity entity){
        Logger.log("Entity" + entity.getID() + " ==> DASH PHASE RECOVERY");
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        VirtualGamePad virtualGamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);

        //If the entity is not grounded ==> FREEZE Gamepad
        boolean isFrozen = !phys.isGrounded() || !dashComp.getRecoveryTimer().isDone();

        virtualGamePad.setEnabled(!isFrozen);

        if(!isFrozen){
            dashComp.phase = DashComponent.Phase.NONE;
            dashComp.setEnabled(false);
            dashComp.direction.set(0,0);
        }
    }





}
