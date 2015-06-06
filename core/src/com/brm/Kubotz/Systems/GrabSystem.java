package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Event;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.GrabComponent;
import com.brm.Kubotz.Components.GrabbableComponent;
import com.brm.Kubotz.Components.LifespanComponent;
import com.brm.Kubotz.Components.Powerups.PowerUpComponent;
import com.brm.Kubotz.Components.Powerups.PowerUpsContainerComponent;
import com.brm.Kubotz.Events.CollisionEvent;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle all the entities with Grab/GrabbableComponents
 */
public class GrabSystem extends EntitySystem{


    public GrabSystem(){}

    @Override
    public void init(){}

    @Override
    public void update(float dt) {}


    public void handleInput(){

    }


    /**
     * Makes an entity pickup an object
     * @param agent the entity that will pick the object up
     * @param grabbable the object to be picked up
     */
    private void pickupObject(Entity agent, Entity grabbable){
        Logger.log("PICK IT UP");

        //Perform correct acction according to the grabbed object

        //Grab PowerUp
        if(grabbable.hasComponent(PowerUpComponent.ID)){
            PowerUpComponent powerUpComp = (PowerUpComponent) grabbable.getComponent(PowerUpComponent.ID);
            PowerUpsContainerComponent container;
            container = (PowerUpsContainerComponent) agent.getComponent(PowerUpsContainerComponent.ID);
            container.addPowerUp(powerUpComp.getPowerUp());
            powerUpComp.getPowerUp().getEffect().onStart(agent);
            LifespanComponent life = (LifespanComponent) grabbable.getComponent(LifespanComponent.ID);
            life.getCounter().terminate();
        }

        //Grab Ennemy
        // TODO Grab ennemy
    }

    @Override
    public <T extends Event> void onEvent(T event) {

        if(event.getClass() == CollisionEvent.class){
            CollisionEvent contact = (CollisionEvent) event;
            if(contact.getEntityA().hasComponentEnabled(GrabComponent.ID)){
                Entity entity = contact.getEntityA();
                VirtualGamePad virtualGamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
                if(virtualGamePad.isButtonPressed(GameButton.PRIMARY_ACTION_BUTTON)){
                    if(contact.getEntityB().hasComponentEnabled(GrabbableComponent.ID)){
                        this.pickupObject(entity, contact.getEntityB());
                    }
                }
            }
        }
    }













}
