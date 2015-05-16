package com.brm.Kubotz.Systems.SkillsSystem;

import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Movements.FlyComponent;
import com.brm.Kubotz.Component.Movements.RunningComponent;
import com.brm.Kubotz.Component.Parts.FlyingBootsComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * System handling FlyingBoots Logic (responsible of toggling on/off the ability of the boots
 */
public class FlyingBootsSystem extends EntitySystem{
    public FlyingBootsSystem(EntityManager em) {
        super(em);
    }

    public void handleInput(){
        for(Entity entity: em.getEntitiesWithComponent(FlyingBootsComponent.ID)){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            FlyingBootsComponent boots = (FlyingBootsComponent) entity.getComponent(FlyingBootsComponent.ID);

            if(gamePad.isButtonPressed(GameButton.ACTIVE_SKILL_BUTTON)){
                //Need to turn ON?
                if(!entity.hasComponent(FlyComponent.ID)) {
                    if (boots.getCooldown().isDone())
                        turnFlyingOn(entity);
                }else{
                    //Need to turn OFF?
                    if (entity.hasComponent(FlyComponent.ID)){
                        turnFlyingOff(entity);
                    }
                }
            }
        }
    }

    @Override
    public void update(float dt){
        //Check if any flying entity needs to stop flying because of flight duration time exceeded
        for(Entity entity: em.getEntitiesWithComponent(FlyingBootsComponent.ID)){
            FlyingBootsComponent boots = (FlyingBootsComponent) entity.getComponent(FlyingBootsComponent.ID);
            if(entity.hasComponent(FlyComponent.ID)){
                if(boots.getEffectDuration().isDone()){
                    turnFlyingOff(entity);
                }
            }
        }
    }

    /**
     * Turns the flying ability OFF for an entity
     * @param entity
     */
    public void turnFlyingOff(Entity entity){
        //Remove Fly Component so it does not fly anymore
        entity.removeComponent(FlyComponent.ID);
        // Restore Running Component
        entity.addComponent(new RunningComponent(), RunningComponent.ID);

        //Reset cooldown timer
        ((FlyingBootsComponent)entity.getComponent(FlyingBootsComponent.ID)).getCooldown().reset();

        //Gravity reaffects entity
        ((PhysicsComponent)entity.getComponent(PhysicsComponent.ID)).getBody().setGravityScale(1);

        Logger.log("FLY MODE OFF");
    }

    /**
     * Turns the flying ability ON for an entity
     * @param entity
     */
    public void turnFlyingOn(Entity entity){
        //Give the entity a FlyComponent so it can fly
        entity.addComponent(new FlyComponent(), FlyComponent.ID);
        //Remove the Running Component
        entity.removeComponent(RunningComponent.ID);

        //Reset the effect duration
        ((FlyingBootsComponent)entity.getComponent(FlyingBootsComponent.ID)).getEffectDuration().reset();

        Logger.log("FLY MODE ON");
    }
}
