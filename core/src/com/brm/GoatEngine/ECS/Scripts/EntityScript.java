package com.brm.GoatEngine.ECS.Scripts;


import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.Input.VirtualButton;

import java.util.ArrayList;

/**
 * A Scrip to control entities and have unique behaviours.
 * This is the base class every Script derives from
 */
public abstract class EntityScript{

    public boolean isEnabled = true;

    /**
     * Called when a script is added to an entity
     */
    public void onInit(Entity entity, EntityManager manager){}

    /**
     * Called every frame
     * @param entity
     * @param manager
     */
    public abstract void onUpdate(Entity entity, EntityManager manager);

    /**
     * Called when the entity this script is attached to presses one or more buttons
     * @param entity the entity this script is attached to
     * @param manager   the entity manager
     * @param pressedButtons the buttons that were pressed
     */
    public void onInput(Entity entity, EntityManager manager, ArrayList<VirtualButton> pressedButtons){}


    /**
     * Called when a collision occurs between two entities. This will be called as long as
     * two entities touch
     * @param contact
     */
    public void onCollision(Event contact){}

    /**
     * Called when the script is detached from the entity
     */
    public void onDetach(Entity entity, EntityManager manager){}




}
