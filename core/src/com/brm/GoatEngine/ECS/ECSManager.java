package com.brm.GoatEngine.ECS;

import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystemManager;

/**
 * Big container used to setup an ECS
 */
public class ECSManager {

    private EntityManager entityManager;
    private EntitySystemManager systemManager;
    private EventManager eventManager;

    public ECSManager(){

        entityManager = new EntityManager();
        systemManager = new EntitySystemManager(this);
        eventManager = new EventManager(this);

    }


    public EntityManager getEntityManager() {
        return entityManager;
    }


    public EntitySystemManager getSystemManager() {
        return systemManager;
    }


}

