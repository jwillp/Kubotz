package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.PickableComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle the objects on map
 */
public class ObjectSystem extends EntitySystem{


    public ObjectSystem(EntityManager em) {
        super(em);
    }



    public void handleInput(){
        //FIND IF A KUBOTZ WANTS TO PICKUP AN OBJECT
        for(Entity kubotz: em.getEntitiesWithTag(Constants.ENTITY_TAG_KUBOTZ)){
            VirtualGamePad virtualGamePad = (VirtualGamePad) kubotz.getComponent(VirtualGamePad.ID);

            //Find if a Kubotz might be trying to pick an object up
            if(virtualGamePad.isButtonPressed(GameButton.PRIMARY_ACTION_BUTTON)){
                Logger.log("CHECK");
                //is the Kubotz colliding with a pickable object
                PhysicsComponent phys = (PhysicsComponent) kubotz.getComponent(PhysicsComponent.ID);
                for(int i =0; i < phys.contacts.size(); i++){
                    EntityContact contact = phys.contacts.get(i);
                    if(contact.getEntityB().hasComponent(PickableComponent.ID) && contact.describer == EntityContact.Describer.BEGIN){
                        //PICK IT UP
                        this.pickupObject(kubotz, contact.getEntityB());
                        virtualGamePad.releaseButton(GameButton.PRIMARY_ACTION_BUTTON); //On relache le bouton

                        phys.contacts.removeContactsWithEntity(contact.getEntityB());


                    }

                }
            }
        }
    }

    public void update(){



    }

    /**
     * Makes an entity pickup an object
     * @param entity the entity that will pick the object up
     * @param object the object to be picked up
     */
    private void pickupObject(Entity entity, Entity object){
        Logger.log("PICK IT UP");


    }






}
