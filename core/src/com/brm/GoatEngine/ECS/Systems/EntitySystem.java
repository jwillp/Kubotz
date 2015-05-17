package com.brm.GoatEngine.ECS.Systems;


import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;

public abstract class EntitySystem {

    protected EntityManager em;

    private EntitySystemManager systemManager;

    public EntitySystem(EntityManager em){
        this.em = em;
    }

    /**
     * Used to initialise the system
     */
    public abstract void init();

    /**
     * Called once per game frame
     * @param dt
     */
    public abstract void update(float dt);


    /**
     * Handles the input
     */
    public void handleInput(){}


    /**
     * Handles the input for a given entity
     */
    private void handleInputForEntity(Entity entity){}


    /**
     * DeInitialise the system
     */
    public void deInit(){}

    /**
     * Renders only if needed
     * @param deltaTime
     */
    public void render(float deltaTime){}

    public EntitySystemManager getSystemManager() {
        return systemManager;
    }

    public void setSystemManager(EntitySystemManager systemManager) {
        this.systemManager = systemManager;
    }
}
