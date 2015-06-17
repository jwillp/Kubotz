package com.brm.GoatEngine.ECS.core;

import com.brm.GoatEngine.ECS.core.Entity.EntityManager;
import com.brm.GoatEngine.EventManager.EventManager;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystemManager;

/**
 * Big container used to setup an ECS
 */
public class ECSManager {

    private EntityManager entityManager;
    private EntitySystemManager systemManager;

    public ECSManager(){

        entityManager = new EntityManager();
        systemManager = new EntitySystemManager(this);
    }


    public EntityManager getEntityManager() {
        return entityManager;
    }


    public EntitySystemManager getSystemManager() {
        return systemManager;
    }

}

