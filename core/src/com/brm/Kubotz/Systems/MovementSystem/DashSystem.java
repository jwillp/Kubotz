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
            //Request a Dash
            onDashRequest(entity);
            DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
            if(dashComp.isEnabled()){
                //Find dash direction
                if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT)){
                    dashComp.direction.x = DashComponent.RIGHT;

                }else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT)){
                    dashComp.direction.x = DashComponent.LEFT;

                }else if(gamePad.isButtonPressed(GameButton.MOVE_UP)){
                    dashComp.direction.y = DashComponent.UP;

                }else if(gamePad.isButtonPressed(GameButton.MOVE_DOWN)){
                    dashComp.direction.y = DashComponent.DOWN;
                }
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
            MovementSystem.stopXY(entity);
            phys.getBody().setGravityScale(0);

            dashComp.setEnabled(true);
            dashComp.getPreparationTimer().reset();
            dashComp.getEffectDurationTimer().reset();
            dashComp.startPosition = phys.getPosition().cpy();


            Logger.log("Entity" + entity.getID() + " ==> DASH MODE ENABLED");
        }
    }

    /**
     * Checks whether or not an entity is still allowed to dash
     * Basically tries to disable it under the right conditions
     * Checks all entities with DashComponent
     */
    public void update(){
        for(Entity entity : this.em.getEntitiesWithComponent(DashComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);
            if (dashComp.isEnabled()) {
                //Are We Done with the preparing phase?
                if(dashComp.getPreparationTimer().isDone()){
                    //We can now proceed to dashing in whatever direction

                    MovementSystem.moveInX(entity, phys.getVelocity().x + dashComp.speed.x);
                    MovementSystem.moveInY(entity, dashComp.speed.y);
                    Logger.log(GameMath.distance(phys.getPosition(), dashComp.startPosition));

                }


                // Do we need to disable?
                if (GameMath.distance(phys.getPosition(), dashComp.startPosition) >= dashComp.distance.x || dashComp.getEffectDurationTimer().isDone()) {
                    dashComp.setEnabled(false);
                    MovementSystem.stopY(entity);
                    phys.getVelocity().x *= 0.1;
                    phys.getBody().setGravityScale(1);
                    dashComp.getCoolDownTimer().reset();
                    Logger.log("Entity" + entity.getID() + " ==> DASH MODE DISABLED");
                }
            }
        }

    }







}
