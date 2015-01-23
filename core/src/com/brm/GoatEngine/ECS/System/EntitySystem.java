package com.brm.GoatEngine.ECS.System;


import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;

public abstract class EntitySystem {

    protected EntityManager em;


    public EntitySystem(EntityManager em){
        this.em = em;
    }

    /**
     * Used to initialise the system
     */
    public void init(){}

    /**
     * Called once per game frame
     * @param dt
     */
    public void update(float dt){}


    /**
     * Handles the input
     */
    public void handleInput(){}


    /**
     * Handles the input for a given entity
     */
    public void handleInput(Entity entity){}


    /**
     * DeInitialise the system
     */
    public void deInit(){}

}
