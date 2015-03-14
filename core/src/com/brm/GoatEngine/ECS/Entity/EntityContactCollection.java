package com.brm.GoatEngine.ECS.Entity;

import java.util.ArrayList;

/**
 * Used to store a collection of EntityContact
 * And do retrieval methods
 */
public class EntityContactCollection extends ArrayList<EntityContact> {




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
