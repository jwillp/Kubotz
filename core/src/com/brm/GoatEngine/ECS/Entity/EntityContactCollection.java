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



    /**
     * Returns all the contacts that happened with a certain entity
     * @param e
     */
    public ArrayList<EntityContact> getContactsWithEntity(Entity e){


        ArrayList<EntityContact> ct = new ArrayList<EntityContact>();

        for(EntityContact contact: this){
            if(e.getID().equals(contact.getEntityB().getID())){
                ct.add(contact);
            }
        }
        return ct;
    }


    /**
     * Returns all the contacts that happened with a certain entity
     * @param e
     */
    public void removeContactsWithEntity(Entity e){
        for(int i=0; i< this.size(); i++){
            if(e.getID().equals(this.get(i).getEntityB().getID())){
                this.remove(i);
            }
        }
    }

    /**
     * Removes all the contact with a null entity
     */
    public void cleanContacts(){
        for(int i=0; i< this.size(); i++){
            if(this.get(i).getEntityB() == null){
                this.remove(i);
            }
        }
    }

    /**
     * Returns a list of contacts with describer
     * @param describer
     * @return
     */
    private ArrayList<EntityContact> getContactsWithDescriber(EntityContact.Describer describer){
        ArrayList<EntityContact> ct = new ArrayList<EntityContact>();
        for(EntityContact contact: this){
            if(contact.describer == describer){
                ct.add(contact);
            }
        }
        return ct;
    }

    /**
     * Returns all the contacts with a Begin describer
     * @return
     */
    public ArrayList<EntityContact> getBeginContacts(){
        return getContactsWithDescriber(EntityContact.Describer.BEGIN);
    }


    /**
     * Returns all the contacts with a Begin describer
     * @return
     */
    public ArrayList<EntityContact> getEndContacts(){
        return getContactsWithDescriber(EntityContact.Describer.END);
    }


}
