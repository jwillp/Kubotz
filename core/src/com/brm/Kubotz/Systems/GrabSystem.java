package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.GrabComponent;
import com.brm.Kubotz.Component.GrabbableComponent;
import com.brm.Kubotz.Component.LifespanComponent;
import com.brm.Kubotz.Component.Powerups.PowerUp;
import com.brm.Kubotz.Component.Powerups.PowerUpComponent;
import com.brm.Kubotz.Component.Powerups.PowerUpsContainerComponent;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle all the entities with Grab/GrabbableComponents
 */
public class GrabSystem extends EntitySystem{


    public GrabSystem(EntityManager em) {
        super(em);
    }



    public void handleInput(){
        //FIND IF AN ENTITY WANTS TO PICKUP AN OBJECT
        for(Entity entity: em.getEntitiesWithComponent(GrabComponent.ID)){
            VirtualGamePad virtualGamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

            //Find if the entity might be trying to grab something
            if(virtualGamePad.isButtonPressed(GameButton.PRIMARY_ACTION_BUTTON)){
                Logger.log("CHECK");
                //is the entity colliding with a pick-able object
                PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
                for(int i =0; i < phys.contacts.size(); i++){
                    EntityContact contact = phys.contacts.get(i);
                    if(contact.getEntityB().hasComponent(GrabbableComponent.ID)){
                        //PICK IT UP
                        this.pickupObject(entity, contact.getEntityB());
                        phys.contacts.removeContactsWithEntity(contact.getEntityB());
                        virtualGamePad.releaseButton(GameButton.PRIMARY_ACTION_BUTTON); //Realease Button
                    }

                }
            }
        }
    }

    public void update(){


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
            powerUpComp.getPowerUp().effect.onStart(agent);
        }


        //Grab Ennemy


    }






}
