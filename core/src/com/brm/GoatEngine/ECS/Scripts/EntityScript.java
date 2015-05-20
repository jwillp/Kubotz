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

    public boolean isEnabled = true;

    /**
     * Called when a script is added to an entity
     */
    public abstract void onInit(Entity entity, EntityManager manager);



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
    public abstract void onInput(Entity entity, EntityManager manager, ArrayList<VirtualButton> pressedButtons);


    /**
     * Called when a collision occurs between two entities. This will be called as long as
     * two entities touch
     * @param contact
     */
    public abstract void onCollision(EntityContact contact);

    /**
     * Called when the script is detached from the entity
     */
    public abstract void onDetach(Entity entity, EntityManager manager);




}
