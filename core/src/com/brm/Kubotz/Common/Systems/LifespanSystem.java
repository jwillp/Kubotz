package com.brm.Kubotz.Common.Systems;

import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.Kubotz.Common.Components.LifespanComponent;

/**
 * Deletes entity with lifespan over
 */
public class LifespanSystem extends EntitySystem{

    public LifespanSystem() {

    }

    @Override
    public void init(){}


    @Override
    public void update(float dt){


        for(Entity entity: getEntityManager().getEntitiesWithComponent(LifespanComponent.ID)){
            LifespanComponent lifespan = (LifespanComponent) entity.getComponent(LifespanComponent.ID);
            if(lifespan.isFinished()){
                getEntityManager().deleteEntity(entity.getID());
            }
        }

    }



}
