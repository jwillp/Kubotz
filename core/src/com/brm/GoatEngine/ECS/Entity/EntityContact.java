package com.brm.GoatEngine.ECS.Entity;

import com.badlogic.gdx.physics.box2d.Fixture;
import com.brm.GoatEngine.ECS.Entity.Entity;

import java.util.ArrayList;

/**
 * A Contact between two entities. Usually used by Systems to do a certain task when a certain collision happens.
 */
public class EntityContact {


    public Fixture fixtureA;
    public Fixture fixtureB;

    public EntityContact(Fixture fixtureA, Fixture fixtureB){
        this.fixtureA = fixtureA;
        this.fixtureB = fixtureB;
    }


    /**
     * Returns the entity A
     * @return
     */
    public Entity getEntityA(){
        return (Entity) this.fixtureA.getBody().getUserData();
    }

    /**
     * Returns the entity B
     * @return
     */
    public Entity getEntityB(){
        return (Entity) this.fixtureB.getBody().getUserData();
    }






}
