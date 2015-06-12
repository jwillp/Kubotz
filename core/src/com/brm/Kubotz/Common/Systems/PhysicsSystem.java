package com.brm.Kubotz.Common.Systems;


import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.Kubotz.Common.Events.CollisionEvent;

import java.util.ArrayList;

/**dd
 * Responsible for checking collisions, making the entities move
 * and apply gravity to the necessary entities
 */
public class PhysicsSystem extends EntitySystem implements ContactListener {

    private World world;

    private ArrayList<CollisionEvent> collisions = new ArrayList<CollisionEvent>();

    public PhysicsSystem() {
        Box2D.init();
        world = new World(new Vector2(0, -40f), true);
        world.setContactListener(this);
    }

    @Override
    public void init(){}

    @Override
    public void update(float dt) {
        //Update the box2D world
        world.step(1 / 60f, 6, 2);

        // UPDATE CALLBACKS
        for (int i = 0; i < collisions.size(); i++) {
            CollisionEvent event = collisions.get(i);
            this.fireEvent(event);
        }
        collisions.clear();
    }


    // CONTACT LISTENING
    /**
     * Dispatches the contact between two entities in their respective PhysicsComponent
     * to be used by other systems, to accomplish certain tasks accordingly
     * @param contact
     */
    @Override
    public void beginContact(Contact contact) {
        //Get Fixtures

        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();
        if(fixtureA.getUserData() != null && fixtureA.getBody().getUserData() != null) {
            this.collisions.add(new CollisionEvent(fixtureA, fixtureB, CollisionEvent.Describer.BEGIN));
        }
        if(fixtureB.getUserData() != null && fixtureB.getBody().getUserData() != null) {
            this.collisions.add(new CollisionEvent(fixtureB, fixtureA, CollisionEvent.Describer.BEGIN));
        }




    }

    /**
     * Removes the contact between two entities in their respective PhysicsComponent
     * @param contact
     */
    @Override
    public void endContact(Contact contact) {

        Fixture fixtureA = contact.getFixtureA();
        Fixture fixtureB = contact.getFixtureB();
        if(fixtureA.getUserData() != null && fixtureA.getBody().getUserData() != null) {
            this.collisions.add(new CollisionEvent(fixtureA, fixtureB, CollisionEvent.Describer.END));
        }
        if(fixtureB.getUserData() != null && fixtureB.getBody().getUserData() != null) {
            this.collisions.add(new CollisionEvent(fixtureB, fixtureA, CollisionEvent.Describer.END));
        }
    }

    @Override
    public void preSolve(Contact contact, Manifold oldManifold) {}

    @Override
    public void postSolve(Contact contact, ContactImpulse impulse) {}


    // GETTERS AND SETTERS //

    public World getWorld() {
        return world;
    }



}

