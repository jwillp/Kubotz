package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.LifespanComponent;

/**
 * Deletes entity with lifespan over
 */
public class LifespanSystem extends EntitySystem{

    public LifespanSystem(EntityManager em) {
        super(em);
    }



    public void update(){


        for(Entity entity: em.getEntitiesWithComponent(LifespanComponent.ID)){
            LifespanComponent lifespan = (LifespanComponent) entity.getComponent(LifespanComponent.ID);
            if(lifespan.isFinished()){
                em.deleteEntity(entity.getID());
            }
        }

    }



}
