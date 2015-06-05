package com.brm.GoatEngine.ECS.Scripts;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Input.VirtualButton;

import java.util.ArrayList;

/**
 * A Scrip to control entities and have unique behaviours.
 * This is the base class every Script derives from
 */
public abstract class EntityScript{

    private boolean isInitialized = false;

    /**
     * Called when a script is added to an entity
     */
    public void onInit(Entity entity){}



    /**
     * Called every frame
     * @param entity the entity to update with the script
     */
    public abstract void onUpdate(Entity entity);

    /**
     * Called when the entity this script is attached to presses one or more buttons
     * @param entity the entity this script is attached to
     * @param pressedButtons the buttons that were pressed
     */
    public void onInput(Entity entity, ArrayList<VirtualButton> pressedButtons){}


    /**
     * Called when a collision occurs between two entities. This will be called as long as
     * two entities touch
     * @param contact
     */
    public void onCollision(EntityContact contact){}

    /**
     * Called when the script is detached from the entity
     */
    public void onDetach(Entity entity){}


    public boolean isInitialized() {
        return isInitialized;
    }

    public void setInitialized(boolean isInitialized) {
        this.isInitialized = isInitialized;
    }
}
