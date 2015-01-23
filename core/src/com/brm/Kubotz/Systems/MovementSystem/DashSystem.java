package com.brm.Kubotz.Systems.MovementSystem;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
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

            //Find dash direction
            if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT)){
                dashRight(entity);

            }else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT)){
                dashLeft(entity);

            }else if(gamePad.isButtonPressed(GameButton.MOVE_UP)){
                dashUp(entity);

            }else if(gamePad.isButtonPressed(GameButton.MOVE_DOWN)){
                dashDown(entity);
            }
        }

    }

    /**
     * Method called when the entity requested to dash
     * @param entity the entity to process
     */
    private void onDashRequest(Entity entity){
        DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);

        //We want to dash! Can we?
        if(dashComp.isDisabled() && dashComp.getCoolDownTimer().isDone()){
            dashComp.setEnabled(true);
            dashComp.getPreparationTimer();
            dashComp.getPreparationTimer().reset();
            Logger.log("Entity" + entity.getID() + " ==> DASH MODE ENABLED");

        }




    }


    /**
     * Method called when an entity requests to stop dashing
     * @param entity the entity to process
     */
    private void onStopDashRequest(Entity entity){


    }





    /**
     * Dashes the entity downwards
     * @param entity the entity to dash
     */
    private void dashDown(Entity entity) {

    }

    /**
     * Dashes the entity Upwards
     * @param entity the entity to dash
     */
    private void dashUp(Entity entity) {


    }

    /**
     * Dashes the entity to the left
     * @param entity the entity to dash
     */
    private void dashLeft(Entity entity) {

    }

    /**
     * Dashes the entity to the right
     * @param entity the entity to dash
     */
    private void dashRight(Entity entity) {
        DashComponent dashComp = (DashComponent)entity.getComponent(DashComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();

        float targetPos = phys.getPosition().x + dashComp.distance.x;

        phys.getPosition().x = (targetPos - phys.getPosition().x) * dashComp.speed.x * Gdx.graphics.getDeltaTime();
    }





}
