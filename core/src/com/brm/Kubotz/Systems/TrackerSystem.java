package com.brm.Kubotz.Systems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TrackerComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;

/**
 * Manages entities having a TrackingComponent enabling them to follow another entity
 */
public class TrackerSystem extends EntitySystem {


    public TrackerSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init(){}

    @Override
    public void update(float dt){
        // Track
        for(Entity tracker: em.getEntitiesWithComponent(TrackerComponent.ID)){
            TrackerComponent trackComp = (TrackerComponent) tracker.getComponent(TrackerComponent.ID);
            trackTarget(tracker, em.getEntity(trackComp.getTargetId()));
        }
    }


    public void trackTarget(Entity tracker, Entity target){

        TrackerComponent trackerComp = (TrackerComponent)tracker.getComponent(TrackerComponent.ID);
        if(!trackerComp.isEnabled()){


            PhysicsComponent trackerPhys = (PhysicsComponent) tracker.getComponent(PhysicsComponent.ID);
            PhysicsComponent targetPhys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);

            Vector2 speed = trackerPhys.getAcceleration();

            // Move
            // TODO If Robot, move like a robot (Jump etc..)
            float posX = (targetPhys.getPosition().x - trackerPhys.getPosition().x + trackerComp.getDistance().x)
                    * speed.x * Gdx.graphics.getDeltaTime();
            float posY = (targetPhys.getPosition().y - trackerPhys.getPosition().y + trackerComp.getDistance().y)
                    * speed.y * Gdx.graphics.getDeltaTime();

            trackerPhys.getBody().setLinearVelocity(new Vector2(posX, posY));

        }


    }


}
