package com.brm.Kubotz.Common.Events;

import com.badlogic.gdx.physics.box2d.Fixture;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when two entities collide.
 * Usually used by Systems to do a certain task when a certain collision happens.
 * To prevent any problems, Systems should only process Entity A colliding with Entity B
 * As the PhysicsSystem will emit two ContactEvents every time a contact occurs.
 * This will make all other systems easier to handle instead of doing checks twice
 */
public class CollisionEvent extends Event {

    private final Fixture fixtureA;
    private final Fixture fixtureB;
    private final Describer describer;

    private final String entityA;
    private final String entityB;



    public enum Describer{
        BEGIN, //When a contact has occured
        END,   //When a contact no longer occurs
    }

    public CollisionEvent(String entityA, Fixture fixtureA, String entityB, Fixture fixtureB, Describer describer){
        super((String)((Entity)fixtureA.getBody().getUserData()).getID());
        this.entityA = entityA;
        this.fixtureA = fixtureA;

        this.entityB = entityB;
        this.fixtureB = fixtureB;

        this.describer = describer;
    }

    public Fixture getFixtureA() {
        return fixtureA;
    }

    public Fixture getFixtureB() {
        return fixtureB;
    }

    /**
     * Returns the entity A
     * @return
     */
    public String getEntityA(){
        return entityA;
    }

    /**
     * Returns the entity B
     * @return
     */
    public String getEntityB(){
        return entityB;
    }

    /**
     * Returns the describer of the contact
     * @return
     */
    public Describer getDescriber() {
        return describer;
    }


}
