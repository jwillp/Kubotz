package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.Kubotz.Components.SensorComponent;
import com.brm.Kubotz.Constants;

/**
 * Used to handle Sensor Logic
 */
public class SensorSystem extends EntitySystem {

    public SensorSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init() {

    }

    @Override
    public void update(float dt) {
        for(Entity entity: em.getEntitiesWithComponent(SensorComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
            SensorComponent sensor = (SensorComponent)entity.getComponent(SensorComponent.ID);

            for(EntityContact contact: phys.getContacts()){
                if(contact.fixtureA.getUserData().equals(Constants.FIXTURE_SENSOR_COMP)){
                    sensor.addDetectedEntity(contact.getEntityB());
                }
            }

        }

    }






}
