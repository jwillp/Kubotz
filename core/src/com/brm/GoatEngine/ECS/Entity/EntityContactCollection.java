package com.brm.GoatEngine.ECS.Entity;

import com.badlogic.gdx.physics.box2d.Body;

import java.util.ArrayList;

/**
 * A collection of EntityContacts
 */
public class EntityContactCollection extends ArrayList<EntityContact> {

    /**
     * Returns whether or not that body has a contact with a
     * provided body
     */
    public boolean hasContactWithEntity(Entity entity){
        for(int i=0; i<this.size(); i++){
            EntityContact contact =  this.get(i);
            if(contact.getEntityB().getID() == entity.getID()){
                return true;
            }
        }
        return false;
    }


}
